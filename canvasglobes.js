// Globes on Canvas
// by Max Friedrich Hartmann
// github/twitter: @mxfh
// comments are welcome my javascript skills are in dire need of some serious improvement
//
// live at: http://mxfh.github.com/d3canvasglobes/
//
// uses d3.js and topojson
// http://bl.ocks.org/4188334
// basic framework based on simple globe canvas by ejfox
// http://tributary.io/inlet/4670598
//
// an early version of this is available here
// http://tributary.io/inlet/4679442
//
// All Natural Earth geometry is in public domain
// http://www.naturalearthdata.com/
//
// General
// TODO: Improve rendering speed
// TODO: Support more projections
// High priority
// TODO: add cities+labels
// TODO: Compare countries
// Medium
// TODO: skip for-loop when active globe known, use only for moving multiples at once,
// Low priority
// TODO: dynamic canvas size and position by content extent
// TODO: add mirror option
// TODO: lock axis switches
// TODO: show scale / distance circles / orientation
// TODO: Remove Graticule from Geojson
// TODO: Raster
// TODO: canvas resize on window resize
// TODO: Great circles / Loxodrome from Point A to B
// TODO: Animations > Plate tectonics
// TODO: Sun Terminator
// TODO: Tissot's-Indicatrix (Pseudo/real)

"use strict";

var debugLevel = 0; // 0 = off 1 = basic 2 = mouse 3 = all

var	element, globe, land, coastlines, borders, bordersStates, lakes, countries, states,
	graticule, graticuleIntervals, graticuleInterval,
	fillColor, fillColorA, fillColorB, textColor, gradientSphere, gradientSphereColor, globeOutlineColor,
	darkTone, brightTone,
	width, height, origin, minSize, maxDim, minDim, diagonal, zoomMin, zoomMax,
	canvasPadding, globePadding, lineNumber, colWidth, rowHeight, padding, gutter, baselineOffset, formatPrecisionOne,
	geometryAtLOD, geometryLOD, topojsonPath, topojsonData, clipAngleMax, clipAngle,
	presets, rArrays, gammaTmp, gammaStart, currentRotation, globalProjection, projections, path,
	canvas, z, canvasID, canvasDefaultStyle,
	canvasBackground, canvasGradient, canvasInfo, canvasHelp, canvasGlobe,
	context, contextBackground, contextGradient, contextInfo, contextHelp, contextGlobe,
	posX, posY, rInit, r, x, y, xTmp, yTmp, xRel, yRel, delta,
	geoCoordinatesAtMouseCursor,
	lastClick, doubleClickLengthInMs = 666, maxFPS = 60, renderInterval = 1000 / maxFPS,
	colorCycleInterval = 50,
	momentumFlag, mouseDown, shiftKeyDown, altKeyDown, sKeyDown,
	showGradient, showGradientZoombased, showGraticule,
	showBorders, showLakes, showHelp, showInfo, showCoastlines,
	updateGlobes, showGlobes, selectedGlobes, lastSelectedGlobes, currentGlobeNumber,
	pi = Math.PI, radToDegFactor = 180 / pi, hueWheel, hueShift, kaleidoscope,
	numberOfGlobes;

// math
Number.prototype.toDeg = function () {return this * radToDegFactor; };

function setFlags() {
	kaleidoscope = 0;
	mouseDown = 0;
	shiftKeyDown = 0;
	altKeyDown = 0;
	sKeyDown = 0;
	showGradient = 1;
	showGradientZoombased = 1;
	showGraticule = 0;
	showBorders = 0;
	showCoastlines = 0;
	showLakes = 0;
	showHelp = 1;
	showInfo = 1;
	momentumFlag = 1;
}

function logAll() {
	console.log("LOD:", geometryLOD,
		"LODs[]:",
		geometryAtLOD,
		"globe:", globe,
		"land:", land,
		"coastlines:", coastlines,
		borders, lakes, graticule,
		"tmp:", gammaTmp, gammaStart,
		"currentRotation:", currentRotation,
		"projections:", projections,
		"path: ", path,
		"canvas: ", canvas,
		"context: ", context);
}

function configGeoData() {
	topojsonPath = "topojson/";
	geometryAtLOD = [];
	// 0 is globe view zoom level
	geometryAtLOD[0] = topojsonPath + "ne_110m_world.json";
	geometryAtLOD[1] = topojsonPath + "ne_50m_world.json";
	geometryAtLOD[2] = topojsonPath + "ne_10m_world.json";
	geometryLOD = 0;
	graticuleIntervals = [30, 10, 5, 2, 1];
	graticuleInterval = graticuleIntervals[0];
}
function createGraticule(interval) { // create graticules as GeoJSON on the fly
	var lonLat, i, iMax, j, jMax, k, kMax, l, lMax, pointsPerCircle = 360 / interval * 3, pointInterval,
		graticuleGeoJson = {              // create object
			type: "FeatureCollection",
			"features": []                // declare array
		};
	if (interval === undefined) {interval = graticuleInterval; }
	// ij - circles of latitude
	pointInterval = 360 / pointsPerCircle;
	iMax = 180 / interval;
	jMax = pointsPerCircle;
	// kl - meridians
	kMax = 360 / interval;
	lMax = pointsPerCircle / 2;

	// Create circles of latitude
	for (i = 0; i < iMax - 1; i += 1) {
		graticuleGeoJson.features.push({
			"type": "Feature",
			"properties": {
				"name": ("Circle of Latitude at " + ((i + 1) * interval - 90)),
				"latitude" : ((i + 1) * interval - 90),
				"class" : "Graticule",
				"type" : "CircleOfLatitude"
			},
			"geometry": {
				"type": "LineString",
				"coordinates": [ ]
			}
		});
		for (j = 0; j <= jMax; j += 1) {
			lonLat = [j * pointInterval - 180, (i + 1) * interval - 90];
			graticuleGeoJson.features[i].geometry.coordinates.push(lonLat);
		}
	}
	// Create Meridians
	for (k = 0; k < kMax; k += 1) {
		graticuleGeoJson.features.push({
			"type": "Feature",
			"properties": {
				"name": ("Meridian at " + (k * interval - 180)),
				"longitude" : (k * interval - 180),
				"class" : "Graticule",
				"type" : "Meridian"
			},
			"geometry": {
				"type": "LineString",
				"coordinates": [ ]
			}
		});
		for (l = 0; l <= lMax; l += 1) {
			// less lines at poles
			if (    // no 1°meridians up to 10°/20° based on interval
				(l * pointInterval >= interval * 10 && l * pointInterval <= 180 - interval * 10)  ||
					// keep 5° up to 30° based on interval
					(l * pointInterval >= interval * 6 && l * pointInterval <= 180 - interval * 6 && (k * interval) % 5 === 0) ||
					// keep 10° up to 30° based on interval
					(l * pointInterval >= interval * 3 && l * pointInterval <= 180 - interval * 3 && (k * interval) % 10 === 0) ||
					// keep 30° up to 30° based on interval
					(l * pointInterval >= interval && l * pointInterval <= 180 - interval && (k * interval) % 30 === 0) ||
					// always keep 90°
					(k * interval) % 90 === 0
			) {
				lonLat = [k * interval - 180, l * pointInterval - 90];
				graticuleGeoJson.features[i + k].geometry.coordinates.push(lonLat);
			}
		}
	}

	return graticuleGeoJson;
}
function initializeLayout() {
	canvasPadding = minDim / 25;
	globePadding = canvasPadding * 0.61;
	posX = width / 2;
	posY = height / 2;
	x = posX;
	y = posY;
	rInit = minDim / 2 - globePadding;
	r = rInit;
	formatPrecisionOne = d3.format(".1f");
	colWidth = 43;
	rowHeight = 12;
	padding = 3;
	gutter = 15;
	lineNumber = 0;
	origin = [canvasPadding, canvasPadding];
	baselineOffset = 9;
}

function createColorWheel() {
	var i,
		hueAngle = 360 / numberOfGlobes,
		saturation = 60,
		lightness = 45,
		alpha = 1 / Math.sqrt(numberOfGlobes + 0.5);
	if (hueShift === undefined) {hueShift = 0; }
	for (i = 0; i < numberOfGlobes; i += 1) {
		if (fillColor[i] !== undefined || hueWheel) {
			fillColor[i] =
				"hsla(" +
					((hueShift + hueAngle * i) % 360) + ", " +
					saturation + "%, " +
					lightness + "%, " +
					alpha + ")";
		}
	}
	if (debugLevel > 0) {console.log("hueAngle:", hueAngle, "hueStart:", hueShift, "fillColor[]:", fillColor); }
}

function initializeColors() {
	//  ColorBrewer: RdYlBu
	darkTone = "rgba(26, 17, 16, 1)";
	brightTone = "rgba(240, 234, 214, 1)";
	fillColorA = "rgba(215, 25, 28, 0.5)";
	fillColorB = "rgba(44, 123, 182, 0.5)";
	fillColor = [fillColorA, fillColorB];
	globeOutlineColor = "rgba(0, 0, 0, 0.2)"
	// hueShift overrides predefined colors with computed hue at max angle
	hueWheel = 1;
	hueShift = 190;
	createColorWheel();
	textColor = darkTone;
	gradientSphereColor = "rgba(80, 80, 100, 0.5)";

}

function addGlobe() {
	var i, angle = 360 / numberOfGlobes;
	if (kaleidoscope) {
		for (i = 1; i < numberOfGlobes; i += 1) {
			rArrays[i] = [rArrays[0][0], rArrays[0][1], (rArrays[0][2] + angle * i) % 360 ];
		}
	} else {
		for (i = 1; i < numberOfGlobes; i += 1) {
			if (rArrays[i] === undefined) {
				rArrays[i] = [rArrays[0][0], rArrays[0][1], rArrays[0][2]];
			}
		}
	}
	if (debugLevel > 0) {console.log("addGlobe():", rArrays); }
}

function initializeProjection() {
	if (debugLevel > 0) {console.log("initializeProjection() rArrays:", rArrays); }
	rArrays = [[0, 0, 0]];
	clipAngleMax = 89;
	clipAngle = clipAngleMax;
	zoomMin = 10;
	zoomMax = 10000;
	delta = 0;
	// λ (longitude) and φ (latitude) of projection center, (γ) rotation angle counter-clockwise in degrees
	presets = []; // [[λ, φ, γ], [ λ, φ, γ]]
	presets[0] = [[0, 0, 0], [0, 0, 0]];
	presets[1] = [[0, -10, 0], [-50, -13, 44]];  // African and South American Coastlines
	presets[2] = [[15, 40, 0], [-100, 40, 0]];   // Europe - America
	presets[3] = [[0, 90, 0], [120, -90, 0]];    // Overlaid poles
	presets[4] = [[15, 40, 0], [-45, -140, 0]];  // Europe - Australia
	presets[5] = [[-100, 40, 0], [-45, -140, 0]];// America - Australia
	presets[6] = [[-100, 40, 0], [100, 40, 0]];  // USA - China
	presets[7] = [[-100, 40, 0], [60, 40, 0]];   // USA - Russia
	presets[8] = [[15, 40, 0], [100, 40, 0]];    // Europe - China
	presets[9] = [[130, -35, 0], [135, -67, 0]]; // Australia - Antarctica tectonics
	diagonal = Math.sqrt(maxDim * maxDim + minDim * minDim);
	yRel = 0;
	xRel = 0;
	xTmp = 0;
	yTmp = 0;
	// set global projection mode here:
	globalProjection = d3.geo.orthographic();
	// init projections array
	projections = [];
}
function initializeGlobes() {
	if (debugLevel > 0) {console.log("initializeGlobes()"); }
	showGlobes = initializeArray(numberOfGlobes, 1);
	updateGlobes = initializeArray(numberOfGlobes, 1);
	selectedGlobes = initializeArray(numberOfGlobes, 0);
	// select first globe
	selectedGlobes[0] = 1;
	if (debugLevel > 1) {console.log("Globes -- selected:", selectedGlobes, "show:", showGlobes, "update:", updateGlobes); }

}
function initializeAll() {
	setFlags();
	initializeLayout();
	initializeColors();
	initializeProjection();
	addGlobe();
	initializeGlobes();
}
function createGradientSphere() {
	gradientSphere = contextGradient.createRadialGradient(posX - 0.3 * r, posY - 0.5 * r, 0, posX, posY, r * 1.03);
	gradientSphere.addColorStop(0,     gradientSphereColor.setAlpha(0));
	gradientSphere.addColorStop(0.1,   gradientSphereColor.setAlpha(0.01));
	gradientSphere.addColorStop(0.3,   gradientSphereColor.setAlpha(0.02));
	gradientSphere.addColorStop(0.5,   gradientSphereColor.setAlpha(0.05));
	gradientSphere.addColorStop(0.65,  gradientSphereColor.setAlpha(0.09));
	gradientSphere.addColorStop(0.75,  gradientSphereColor.setAlpha(0.14));
	gradientSphere.addColorStop(0.825, gradientSphereColor.setAlpha(0.2));
	gradientSphere.addColorStop(0.9,   gradientSphereColor.setAlpha(0.29));
	gradientSphere.addColorStop(0.95,  gradientSphereColor.setAlpha(0.42));
	gradientSphere.addColorStop(0.98,  gradientSphereColor.setAlpha(0.55));
	gradientSphere.addColorStop(1,     gradientSphereColor.setAlpha(0.62));
}

//initialize Gradient
function loadPreset(p) {
	if (debugLevel > 0) {console.log("loadPreset(" + p + ")"); }
	var i;
	numberOfGlobes = presets[p].length;
	setNumberOfGlobes();
	for (i = 0; i < numberOfGlobes; i += 1) {
		if (presets[p][i] !== undefined) {
			rArrays[i] = presets[p][i];
		} else { rArrays[i] = [0, 0, 0]; }
	}
}
function calcTan() { // Calculate Angle from projection center
	var gamma, deltaX, deltaY;
	deltaX = x - posX;
	deltaY = y - posY;
	gamma = (-Math.atan2(deltaY, deltaX)).toDeg();
	return gamma;
}

function d3MousePosition() {
	var last = geoCoordinatesAtMouseCursor;
	// TODO: figure out a way to read out all active projections independently
	if (projections[0] !== undefined) {geoCoordinatesAtMouseCursor = projections[0].invert(d3.mouse(this)); }
	if (last !== geoCoordinatesAtMouseCursor) {
		drawInfo();
	}
	if (debugLevel > 1) {
		console.log(currentGlobeNumber, projections[currentGlobeNumber].invert(d3.mouse(this)));
	}
}

function prepareDocument() {
	function addListeners() {
		function resetModifiers() {
			if (debugLevel > 0) {console.log("focus event"); }
			shiftKeyDown = 0;
			mouseDown = 0;
			altKeyDown = 0;
		}
		function resizeDocument() {
			if (window.innerWidth !== width || window.innerHeight !== height) {
				if (debugLevel > 0) {console.log("resizeDocument()"); }
				d3.selectAll("div").remove();
				prepareDocument();
				initializeLayout();
				drawAll();
			}
		}
		function handleDoubleClick() {
			if (debugLevel > 0) {console.log(geoCoordinatesAtMouseCursor); }
			rotateToPosition();
		}
		function handleMouseClick() {
			if (lastClick === undefined) {
				lastClick = Date.now();
			} else {
				if (Date.now() - lastClick <  doubleClickLengthInMs) {
					handleDoubleClick();
				}
				lastClick = Date.now();
			}
		}

		element = document.getElementById("map");
		element.addEventListener("mousemove", track, false);
		element.addEventListener("mousedown", startTrack, false);
		element.addEventListener("click", handleMouseClick, false);
		element.addEventListener("mouseup", stopTrack, false);
		element.addEventListener("mousewheel", wheel, false);
// should add event handlers to body
		document.activeElement.addEventListener("keydown", keyDown, false);
		document.activeElement.addEventListener("keyup", keyUp, false);
		window.addEventListener("resize", resizeDocument, false);
		window.addEventListener("blur", resetModifiers, false); // reset key states on lost focus
		window.addEventListener("focus", resetModifiers, false); // and regained focus
		d3.select("#map").on("mousemove.log", d3MousePosition);

	}
	function getWindowDimensions() {
		width = window.innerWidth;
		height = window.innerHeight; // needs fix -5 should not be necessary for no scroll bars
		minSize = 256;
		if (width <= minSize) {width = minSize; }
		if (height < minSize) {height = minSize; }
		if (width <= height) {
			minDim = width;
			maxDim = height;
		} else {
			minDim = height;
			maxDim = width;
		}
	}
	function appendCanvas(isLastCanvas) {
		d3.selectAll("div").append("canvas")
			.attr("id", canvasID[zID])
			.attr("style", canvasDefaultStyle + z[zID] + ";");
		canvas[zID] = document.getElementById(canvasID[zID]);
		canvas[zID].width = width;
		canvas[zID].height = height;
		context[zID] = canvas[zID].getContext("2d");
		if (!isLastCanvas) {
			zID += 1;
			z[zID] = z[zID - 1] + 1;
		}
	}
	var i, zID = 0, zStart = 1;
	if (debugLevel > 0) {console.log ("prepareDocument()"); }
	getWindowDimensions();
	d3.select("body").append("div").attr("id", "map");
	canvas = [];
	canvasGlobe = [];
	context = [];
	contextGlobe = [];
	z = [];
	z[zID] = zStart;
	canvasDefaultStyle = "position: absolute; left: 0; top: 0; z-index: ";
	canvasID = [];

	canvasID[zID] = "canvas_background";
	appendCanvas();
	canvasBackground = canvas[zID - 1];
	contextBackground = context[zID - 1];

	for (i = 0; i < numberOfGlobes; i += 1) {
		canvasID[zID] = "canvas_globe_" + i;
		appendCanvas();
		canvasGlobe[i] = canvas[zID - 1];
		contextGlobe[i] = context[zID - 1];
	}

	canvasID[zID] = "canvas_gradient";
	appendCanvas();
	canvasGradient = canvas[zID - 1];
	contextGradient = context[zID - 1];

	canvasID[zID] = "canvas_help";
	appendCanvas();
	canvasHelp = canvas[zID - 1];
	contextHelp = context[zID - 1];

	canvasID[zID] = "canvas_info";
	appendCanvas(1);
	canvasInfo = canvas[zID];
	contextInfo = context[zID];
	if (debugLevel > 0) {
		console.log("z[]:", z, "canvasID", canvasID);
		console.log("canvas[]:", canvas);
		console.log("canvasGlobe[]:", canvasGlobe);
		console.log("canvasGradient:", canvasGradient);
		console.log("canvasHelp:", canvasHelp);
		console.log("canvasInfo:", canvasInfo);
	}
	addListeners();
}
// Layout helper Functions

function clearCanvas(ctx) {
	if (debugLevel > 1) {console.log("clearCanvas(context)", ctx.canvas.id, "w:", ctx.canvas.width, "h:", ctx.canvas.height, "context:", ctx); }
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function clearAllCanvas() {
	var i, n = canvas.length;
	for (i = 0; i < n; i += 1) {clearCanvas(context[i]); }
}
function newLine(newLines) {
	if (lineNumber === undefined) {lineNumber = 0; }
	if (newLines === undefined) {newLines = 1; }
	lineNumber = lineNumber + newLines;
	return lineNumber - newLines;
}
function getX(column) {return origin[0] + (colWidth + gutter) * column; }
function getXalignRight(column) { return getX(column) + colWidth; }
function getY(row) {return origin[1] + rowHeight * row; }
function getYtext(row) {return getY(row) + baselineOffset; }
function backgroundRect(col, row, cols, rows, fillColor, localContext) {
	localContext.beginPath();
	localContext.rect(getX(col) - padding, getY(row) - padding, cols * colWidth + (cols - 1) * gutter + padding * 2, rows * rowHeight + padding * 2);
	localContext.fillStyle = fillColor;
	localContext.fill();
}
function clearBackgroundRect(col, row, cols, rows, localContext) {
	var paddingPlus = padding + 1;
	localContext.clearRect(getX(col) - paddingPlus, getY(row) - paddingPlus, cols * colWidth + (cols - 1) * gutter + paddingPlus * 2, rows * rowHeight + paddingPlus * 2);
}

function drawFilledPath(context, pathName) {
	context.beginPath();
	path(pathName);
	context.fill();
}

function drawStrokedPath(context, pathName) {
	context.beginPath();
	path(pathName);
	context.stroke();
}

// Draw to canvas
function drawInfo() {
	// TODO may be optimized by splitting into background and number display
	// and updating only the changes of active globe,
	// or by moving this completely to html
	clearCanvas(contextInfo);
	if (showInfo) {
		var i, col, xLeft, xRight, lambda, phi, gamma,
			xZero = getX(0),
			xZeroRight = getXalignRight(0),
			yA = getYtext(0),
			yB = getYtext(1),
			yC = getYtext(2),
			yD = getYtext(3);

		//console.log(coordsAtMouseCursor);
		if (geoCoordinatesAtMouseCursor !== undefined && !isNaN(geoCoordinatesAtMouseCursor[0]) && !isNaN(geoCoordinatesAtMouseCursor[1])) {
			backgroundRect(0, 0, 1, 3, fillColor[currentGlobeNumber], contextInfo);
			contextInfo.fillStyle = textColor;
			contextInfo.fillText("φ :", xZero, yA);
			contextInfo.textAlign = "right";
			contextInfo.fillText(formatPrecisionOne(geoCoordinatesAtMouseCursor[1]), xZeroRight, yA);
			contextInfo.textAlign = "left";
			contextInfo.fillText("λ :", xZero, yB);
			contextInfo.textAlign = "right";
			contextInfo.fillText(formatPrecisionOne(geoCoordinatesAtMouseCursor[0]), xZeroRight, yB);
			contextInfo.textAlign = "left";
		}
		contextInfo.fillStyle = textColor;
		if (debugLevel > 0) {
			if (x !== undefined) {
				contextInfo.fillText("x :", xZero, yC);
				contextInfo.textAlign = "right";
				contextInfo.fillText(x, xZeroRight, yC);
				contextInfo.textAlign = "left";
			}
			if (y !== undefined) {
				contextInfo.fillText("y :", xZero, yD);
				contextInfo.textAlign = "right";
				contextInfo.fillText(y, xZeroRight, yD);
				contextInfo.textAlign = "left";
			}
		}

		for (i = 0; i < numberOfGlobes; i += 1) {
			lambda = (rArrays[i][0] + 180).mod(360) - 180;
			phi = (rArrays[i][1] + 180).mod(360) - 180;
			gamma = rArrays[i][2].mod(360);
			col = i + 1;
			xLeft = getX(col);
			xRight = getXalignRight(col);
			backgroundRect(col, 0, 1, 3, fillColor[i], contextInfo);
			contextInfo.fillStyle = textColor;
			contextInfo.fillText("φ :", xLeft, yA);
			contextInfo.fillText("λ :", xLeft, yB);
			if (gamma !== 0) {contextInfo.fillText("γ :", xLeft, yC); }
			contextInfo.textAlign = "right";
			contextInfo.fillText(formatPrecisionOne(phi), xRight, yA);
			contextInfo.fillText(formatPrecisionOne(lambda), xRight, yB);
			if (gamma !== 0) {contextInfo.fillText(formatPrecisionOne(gamma), xRight, yC); }
			contextInfo.textAlign = "left";
		}
	}
}
function drawHelp() {
	// TODO may be moved to html
	clearCanvas(contextHelp);
	if (showHelp) {
		var xRight = width - canvasPadding;
		lineNumber = 0;
		contextHelp.textAlign = "right";
		contextHelp.fillStyle = textColor;
		contextHelp.fillText("Drag Mouse to move λ (longitude/lambda) and φ (latitude/phi) of projection center", xRight, getYtext(newLine()));
		contextHelp.fillText("Zoom with mouse wheel", xRight, getYtext(newLine(2)));
		contextHelp.fillText("To switch globe or move both at once:  Press/Hold [Shift]", xRight, getYtext(newLine()));
		contextHelp.fillText("For rotation γ (gamma) around center: Drag Mouse and  Hold [Alt]", xRight, getYtext(newLine()));
		contextHelp.fillText("Disable Momentum:  [M]", xRight, getYtext(newLine(2)));
		contextHelp.fillText("For presets press:  [1] - [9]", xRight, getYtext(newLine()));
		contextHelp.fillText("Reset both globes to origin:  [0]", xRight, getYtext(newLine(2)));
		contextHelp.fillText("Show/hide secondary globe:  [Space Bar]", xRight, getYtext(newLine(2)));
		contextHelp.fillText("Show/hide Graticule:  [G]", xRight, getYtext(newLine()));
		contextHelp.fillText("Show/hide land Borders:  [B]", xRight, getYtext(newLine()));
		contextHelp.fillText("Coastlines only (faster):  [C]", xRight, getYtext(newLine()));
		contextHelp.fillText("Show/hide Lakes:  [L]", xRight, getYtext(newLine()));
		contextHelp.fillText("Switch globe colors:  [S]", xRight, getYtext(newLine()));
		contextHelp.fillText("Draw shadow decoration:  [D]", xRight, getYtext(newLine(2)));
		contextHelp.fillText("Show/hide position Info:  [I]", xRight, getYtext(newLine()));
		contextHelp.fillText("Reset all:  [R]", xRight, getYtext(newLine(2)));
		contextHelp.fillText("Show/hide Help:  [H]", xRight, getYtext(newLine()));
		contextHelp.textAlign = "left";
	}
}

function drawGlobe(i) {
	if (debugLevel > 1) {console.log("Globe# " + currentGlobeNumber + " drawGlobe(rArray, fillColor, localContext):", rArray, fillColor, contextGlobe[i]); }
	// -λ, -φ, γ
	var borderAlphaKnockOut = 0.8,
		borderAlphaLine = 0.5,
		coastlineAlpha = 0.9,
		graticuleAlpha = 0.3,
		mode = "destination-out",
		modeDefault = "source-over";

	// tweak projections here
	clearCanvas(contextGlobe[i]);
	projections[currentGlobeNumber] =
		globalProjection
			.translate([posX, posY])
			.rotate([-(rArrays[i][0]), -(rArrays[i][1]), rArrays[i][2]])
			.clipAngle(clipAngle).scale(r);
	path = d3.geo.path().projection(projections[currentGlobeNumber]).context(contextGlobe[i]);
	// Filled Style
	if (!showCoastlines) {
		contextGlobe[i].fillStyle = fillColor[i];
		drawFilledPath(contextGlobe[i], land);
		contextGlobe[i].globalCompositeOperation = mode;

		// subtract lakes and borders from continents
		if (showLakes) {
			contextGlobe[i].fillStyle = fillColor[i].setAlpha(1);
			drawFilledPath(contextGlobe[i], lakes);
		}
		if (showBorders) {
			contextGlobe[i].strokeStyle = fillColor[i].setAlpha(borderAlphaKnockOut);
			drawStrokedPath(contextGlobe[i], borders);
		}
	} else {
		contextGlobe[i].strokeStyle = fillColor[i].setAlpha(coastlineAlpha);
		drawStrokedPath(contextGlobe[i], coastlines);
		if (showLakes) {
			drawStrokedPath(contextGlobe[i], lakes);
		}
		if (showBorders) {
			contextGlobe[i].strokeStyle = fillColor[i].setAlpha(borderAlphaLine);
			drawStrokedPath(contextGlobe[i], borders);
		}
	}
	// Graticule
	if (showGraticule) {
		contextGlobe[i].globalCompositeOperation = modeDefault;
		// set graticule width with alpha:
		contextGlobe[i].strokeStyle = fillColor[i].setAlpha(graticuleAlpha);
		drawStrokedPath(contextGlobe[i], graticule);
	}
	contextGlobe[i].globalCompositeOperation = modeDefault;
}
function drawGlobes() {
	if (debugLevel > 0) {console.log("drawGlobes()", "updateGlobes[]", updateGlobes); }
	var i;
	for (i = 0; i < numberOfGlobes; i += 1) {
		if (showGlobes[i] && (selectedGlobes[i] || updateGlobes[i])) {
			currentGlobeNumber = i;
			drawGlobe(i);
			updateGlobes[i] = 0;
		}
	}
}
function drawGradient() {
	if (debugLevel > 0) {console.log("drawGradient()", "canvasGradient:", canvasGradient); }
	if (debugLevel > 1) {console.log("contextGradient:", contextGradient); }
	clearCanvas(contextGradient);
	// get projection from globe 0;
	path = d3.geo.path().projection(projections[0]).context(contextGradient);
	// draw gradient
	if (showGradient && showGradientZoombased) {
		createGradientSphere();
		contextGradient.fillStyle = gradientSphere;
		drawFilledPath(contextGradient, globe);
		if (debugLevel > 0) {console.log("Gradient", "fillStyle:", contextGradient.fillStyle); }

	}
	// draw outline only
	if (!showGradient || !showGradientZoombased) {
		contextGradient.strokeStyle = globeOutlineColor;
		drawStrokedPath(contextGradient, globe);
		if (debugLevel > 0) {console.log("Outline", "strokeStyle:", contextGradient.strokeStyle); }
	}
}
function setAllGlobesToUpdate() {
	setAllArrayValues(updateGlobes, 1);
	if (debugLevel > 0) {console.log("setAllGlobesToUpdate()", "updateGlobes[]", updateGlobes); }
}

function drawAllGlobes() {
	if (debugLevel > 0) {console.log("drawAllGlobes()"); }
	setAllGlobesToUpdate();
	drawGlobes();
}

function drawAll() {
	if (debugLevel > 0) {console.log("drawAll()"); }
	drawAllGlobes();
	drawGradient();
	drawInfo();
	drawHelp();
}

// Handle geometry
function loadGeometry() {
	d3.json(topojsonData, function (error, json) {
		if (error) {console.log(error); }
		globe = {type: "Sphere"};
		/** @namespace json.objects.land */
		/** @namespace json.objects.coastline */
		/** @namespace json.objects.a0borders*/
		/** @namespace json.objects.a1borders*/
		/** @namespace json.objects.lakes */
		land = topojson.object(json, json.objects.land);
		coastlines = topojson.object(json, json.objects.coastline);
		borders = topojson.object(json, json.objects.a0borders);
		bordersStates = topojson.object(json, json.objects.a1borders);
		countries = topojson.object(json, json.objects.a0countrieslakes);
		states = topojson.object(json, json.objects.a1countrieslakes);
		lakes = topojson.object(json, json.objects.lakes);
		graticule = createGraticule(graticuleInterval);
		drawAll();
	});
}
function setGeometryLOD(lod, forceNoGradientAtLOD, noMomentumAtLOD) {
	// TODO decouple gradient switch from LOD
	if (geometryLOD !== lod) {
		if (lod === undefined) {lod = geometryLOD; }
		geometryLOD = lod;
		if (forceNoGradientAtLOD) {showGradientZoombased = 0;
			} else {showGradientZoombased = 1; }
		if (noMomentumAtLOD) {momentumFlag = 0;
			} else {momentumFlag = 1; }
		// fallback to lowest level
		if (geometryAtLOD[geometryLOD] === undefined) {geometryLOD = 0; }
		topojsonData = geometryAtLOD[geometryLOD];
		loadGeometry();
	}
}

// interaction functions

function setNumberOfGlobes() {
	if (numberOfGlobes < 2 || undefined) {
		numberOfGlobes = 1;
		console.log("Rendering " + numberOfGlobes + " Globe");
	} else {console.info("Rendering " + numberOfGlobes + " Globes"); }
	if (debugLevel > 0) {console.info("start globe change"); }
	d3.selectAll("div").remove();
	prepareDocument();
	initializeGlobes();
	createColorWheel();
	addGlobe();
	setGeometryLOD();
}

function rotate() {
	var i;
	for (i = 0; i < numberOfGlobes; i += 1) {
		if (selectedGlobes[i]) {
			if (!altKeyDown) {rArrays[i] = [rArrays[i][0] - xRel / r, rArrays[i][1] + yRel / r, rArrays[i][2]]; }
			if (altKeyDown) {rArrays[i] = [rArrays[i][0], rArrays[i][1], gammaTmp[i] + calcTan() - gammaStart]; }
			updateGlobes[i] = 1;
		}
	}
}
function track(evt) {
	if (debugLevel > 2) {console.log("track(evt)", "evt:", evt); }
	x = evt.offsetX || evt.layerX;
	y = evt.offsetY || evt.layerY;
	if (mouseDown || altKeyDown) {
		xRel = x - xTmp;
		yRel = y - yTmp;
		rotate();
		drawGlobes();
	}
	drawInfo();
}
function startTrack(evt) {
	xTmp = evt.offsetX || evt.layerX;
	yTmp = evt.offsetY || evt.layerY;
	mouseDown = 1;
}
function stopTrack() {
	var refreshIntervalId, linearSlowdown = r / 250, factorSlowdown = 0.99;
	altKeyDown = 0;
	mouseDown = 0;
	if (momentumFlag) {
		refreshIntervalId = setInterval(function () {
			yRel = (yRel) * factorSlowdown - yRel.sign() * linearSlowdown;
			xRel = (xRel) * factorSlowdown - xRel.sign() * linearSlowdown;
			rotate();
			drawGlobes();
			drawInfo();
			if ((Math.abs(xRel) < 1 && Math.abs(yRel) < 1) || !momentumFlag) {clearInterval(refreshIntervalId); }
		}, 1000 / 48);
	}
}


function rotateToPosition() {
	if (debugLevel > 0) {console.log("rotateToPosition"); }
	if (!isNaN(geoCoordinatesAtMouseCursor[0]) || !isNaN(geoCoordinatesAtMouseCursor[1])) {
		var refreshIntervalId, steps, cosFactor, stepLon, stepLat,
			i = 0,
			endPos = geoCoordinatesAtMouseCursor,
			rStart = rArrays[currentGlobeNumber],
			fullRotLon = Math.floor((rStart[0] + 180) / 360),
			dLon = ((fullRotLon * 360 + endPos[0]) - rStart[0]),
			dLat = (endPos[1] - rStart[1]);

		// TODO Add Smoothing
		if (dLon >= 180) {dLon = (dLon - 360); }
		if (dLon <= -180) {dLon = (dLon + 360); }
		steps = Math.floor(Math.sqrt(dLon * dLon + dLat * dLat)) * 2 + 6;
		//console.log(steps);
		stepLon = dLon / steps;
		stepLat = dLat / steps;
		cosFactor = ((pi * 2) / steps);
		refreshIntervalId = setInterval(function () {
			i += 1;
			// cosine curve tweening
			rArrays[currentGlobeNumber] = [
				rArrays[currentGlobeNumber][0] + stepLon * (Math.cos(cosFactor * i) * -1 + 1),
				rArrays[currentGlobeNumber][1] + stepLat * (Math.cos(cosFactor * i) * -1 + 1),
				rArrays[currentGlobeNumber][2]
			];
			drawGlobe(currentGlobeNumber);
			drawInfo();
			if (i >= steps) {clearInterval(refreshIntervalId);}
		}, renderInterval);
	}
}


function switchColors() {
	var tmp = fillColorA;
	fillColorA = fillColorB;
	fillColorB = tmp;
}
var refreshColorsInterval;

function shiftColors() {
	hueShift = (hueShift - 360 / numberOfGlobes) % 360;
	createColorWheel();
	drawAllGlobes();
	drawInfo();
}

function cycleColors() {
	refreshColorsInterval = setInterval(function () {
		shiftColors();
	}, colorCycleInterval);
}

function selectAllGlobes() {
	if (!shiftKeyDown) {
		if (debugLevel > 0) {console.log("selectAllGlobes()"); }
		if (debugLevel > 1) {console.log("select: selectedGlobes, lastSelectedGlobes", selectedGlobes, lastSelectedGlobes); }
		lastSelectedGlobes = selectedGlobes.slice(0);
		selectedGlobes = setAllArrayValues(selectedGlobes, 1);
		if (debugLevel > 1) {console.log("select: selectedGlobes, lastSelectedGlobes", selectedGlobes, lastSelectedGlobes); }
	}
}
function deSelectAllGlobes() {
	if (debugLevel > 0) {console.log("deSelectAllGlobes()"); }
	if (debugLevel > 1) {console.log("deselect: selectedGlobes, lastSelectedGlobes", selectedGlobes, lastSelectedGlobes); }
	selectedGlobes = lastSelectedGlobes.slice(0);
	if (debugLevel > 1) {console.log("deselect: selectedGlobes, lastSelectedGlobes", selectedGlobes, lastSelectedGlobes); }
}
function keyDown(evt) {
	function hideAllButFirstGlobe() {
		for (i = 1; i < numberOfGlobes; i += 1) {
			clearCanvas(contextGlobe[i]);
			showGlobes[i] = showGlobes[i].toggle();
		}
		if (!showGlobes[1]) {
			lastSelectedGlobes = selectedGlobes.slice(0);
			setAllArrayValues(selectedGlobes, 0);
			setAllArrayValues(updateGlobes, 0);
			selectedGlobes[0] = 1;
			updateGlobes[0] = 1;
		} else {
			selectedGlobes = lastSelectedGlobes.slice(0);
			drawAllGlobes();
		}
	}
	function startRotation() {
		gammaTmp = [];
		xTmp = evt.offsetX || evt.layerX;
		yTmp = evt.offsetY || evt.layerY;
		for (i = 0; i < numberOfGlobes; i += 1) {
			gammaTmp[i] = rArrays[i][2];
		}
		gammaStart = calcTan();
	}
	var i, validKey = 1;
	evt = evt || window.event;
	if (debugLevel > 1) {console.log("keyDown(evt) evt.keyCode:", evt.keyCode); }
	switch (evt.keyCode) {
	case 16: selectAllGlobes(); shiftKeyDown = 1; break;                      // Shift
	case 18: if (!altKeyDown) {startRotation();} altKeyDown = 1; break;       // Alt
	case 32: hideAllButFirstGlobe(); break;                                   // Space
	case 48: loadPreset(0); drawAllGlobes(); break;                           // 0
	case 49: loadPreset(1); drawAllGlobes(); break;                           // 1
	case 50: loadPreset(2); drawAllGlobes(); break;                           // 2
	case 51: loadPreset(3); drawAllGlobes(); break;                           // 3
	case 52: loadPreset(4); drawAllGlobes(); break;                           // 4
	case 53: loadPreset(5); drawAllGlobes(); break;                           // 5
	case 54: loadPreset(6); drawAllGlobes(); break;                           // 6
	case 55: loadPreset(7); drawAllGlobes(); break;                           // 7
	case 56: loadPreset(8); drawAllGlobes(); break;                           // 8
	case 57: loadPreset(9); drawAllGlobes(); break;                           // 9
	case 66: showBorders = showBorders.toggle(); drawAllGlobes(); break;      // B
	case 67: showCoastlines = showCoastlines.toggle(); drawAllGlobes(); break;// C
	case 68: showGradient = showGradient.toggle(); drawGradient(); break;     // D
	case 71: showGraticule = showGraticule.toggle(); drawAllGlobes(); break;  // G
	case 72: showHelp = showHelp.toggle(); drawHelp(); break;                 // H
	case 73: showInfo = showInfo.toggle(); drawInfo(); break;                 // I
	case 75: kaleidoscope = kaleidoscope.toggle(); break;                     // K
	case 76: showLakes = showLakes.toggle(); drawAllGlobes(); break;          // L
	case 77: momentumFlag = momentumFlag.toggle(); break;                     // M
	case 82: resetAll(); break;                                               // R
   // TODO Fix other time based repetitions like this:
	case 83: if (!sKeyDown) {sKeyDown = 1; cycleColors(); } break;            // S
	case 187: numberOfGlobes += 1; setNumberOfGlobes(); break;
	case 189: numberOfGlobes -= 1; setNumberOfGlobes(); break;
	case 192:                                                                 // `
	case 220:                                                                 // ^
		debugLevel = (debugLevel + 1) % 4;  // %4 for max debug level = 3
		console.info("Debug Level: " + debugLevel);
		break;
	default: validKey = 0; break;
	}
	if (validKey && debugLevel > 1) {console.log("valid key down:", evt.keyCode); }
}

function keyUp(evt) {
	var validKey = 1;
	evt = evt || window.event;
	switch (evt.keyCode) {
	case 16:                                                             // Shift
		shiftKeyDown = 0;
		deSelectAllGlobes();
		shiftActiveArrayMember(selectedGlobes);
		currentGlobeNumber = (currentGlobeNumber + 1) % numberOfGlobes;
		drawGlobes();
		break;
	case 18:                                                             // Alt
		altKeyDown = 0;
		xRel = 0;
		yRel = 0;
		gammaStart = undefined;
		gammaTmp = [];
		break;
	case 83: sKeyDown = 0; clearInterval(refreshColorsInterval); shiftColors(); break;
	default: validKey = 0; break;
	}
	if (validKey && debugLevel > 0) {console.log("valid key up:", evt.keyCode); }
}
function zoom(delta) {
	// visDeg visible angle in degrees
	var i, visDeg = 90 - (Math.acos((diagonal / 2) / r)).toDeg();
	function setGraticuleInterval(interval) {
		if (graticuleInterval !== interval) {
			graticuleInterval = interval;
			loadGeometry();
		}
	}
	if (isNaN(visDeg)) {visDeg = 90; }
	if (r >= zoomMin && r <= zoomMax) {
		r = r + delta * r / 20;
		// clip view
		if (visDeg / 2 >= graticuleIntervals[0]) {setGraticuleInterval(graticuleIntervals[0]); }
		if (visDeg / 2 < graticuleIntervals[0] && visDeg / 2 >= graticuleIntervals[1]) {setGraticuleInterval(graticuleIntervals[1]); }
		if (visDeg / 2 < graticuleIntervals[1] && visDeg / 2 >= graticuleIntervals[2]) {setGraticuleInterval(graticuleIntervals[2]); }
		if (visDeg / 2 < graticuleIntervals[2] && visDeg / 2 >= graticuleIntervals[3]) {setGraticuleInterval(graticuleIntervals[3]); }
		if (visDeg / 2 < graticuleIntervals[3] && visDeg / 2 >= graticuleIntervals[4]) {setGraticuleInterval(graticuleIntervals[4]); }


		if (r >= diagonal / 2 && delta > 0) { clipAngle = visDeg;
			} else if (r >= diagonal / 2 && delta < 0) {clipAngle = visDeg * 1.1;
			} else {clipAngle = clipAngleMax; }
		if (debugLevel > 0) {console.log(delta, visDeg, clipAngle); }

		if (r <= diagonal) {setGeometryLOD(0, 0, 0); }
		if (r > diagonal && r <= diagonal * 4) {setGeometryLOD(1, 1, 0); }
		if (r > diagonal * 4) {setGeometryLOD(2, 1, 1); }

		// clamp zoom
		if (r < zoomMin) {r = zoomMin; }
		if (r > zoomMax) {r = zoomMax; }
		// clear gradient overlay on zoom resize
		for (i = 0; i < numberOfGlobes; i += 1) {
			updateGlobes[i] = 1;
		}
		drawGlobes();
		drawGradient();
	}
}
function wheel(event) {
	if (!event) {event = window.event; } // IE
	if (event.wheelDelta) { delta = event.wheelDelta / 120;
		} else if (event.detail) {delta = -event.detail / 3; }
	if (delta) {zoom(delta); }
	if (event.preventDefault) {event.preventDefault(); event.returnValue = false; }
}


function main() {
	numberOfGlobes = 2;
	if (debugLevel > 0) {console.log("start main"); }
	configGeoData();
	setGeometryLOD();
	prepareDocument();
	initializeAll();
	// preset overrides number of globes
	if (numberOfGlobes === 2) {loadPreset(1); }
	if (debugLevel > 2) {logAll(); }
	if (debugLevel > 0) {console.log("end main"); }
}

function resetAll() {
	if (debugLevel > 0) {console.log("resetAll()"); }
	d3.selectAll("div").remove();
	main();
}

main();