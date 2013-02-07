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
// TODO: Improve speed
// TODO: dynamic canvas size and position by content extent
// TODO: add cities+labels
// TODO: add mirror option
// TODO: Jump to Country
// TODO: Compare countries
// TODO: lock axis switches
// TODO: show scale / distance circles / orientation
// TODO: Dynamic Graticule
// TODO: Switch projections
// TODO: Raster
// TODO: canvas resize on window resize
// TODO: Animations > Plate tectonics
// TODO: Sun Terminator
// TODO: Tissot's-Indicatrix (Pseudo/real)
"use strict";

var element, globe, land, coastlines, borders, lakes, graticule, graticuleIntervals, graticuleInterval,
	fillColorA, fillColorB, textColor, gradientSphere, gradientSphereColor, darkTone, brightTone,
	width, height, origin, minSize, maxDim, minDim, diagonal, zoomMin, zoomMax,
	canvasPadding, globePadding, lineNumber, colWidth, rowHeight, padding, gutter, baselineOffset, formatPrecisionOne,
	geometryAtLOD, geometryLOD, topojsonPath, topojsonData, clipAngleMax, clipAngle,
	presets, rArrays, gammaAtmp, gammaBtmp, gammaStart, currentRotation, projection, path,
	canvas, canvasBackground, canvasGradient, canvasInfo, canvasHelp, canvasGlobeA, canvasGlobeB,
	context, contextBackground, contextGradient, contextInfo, contextHelp, contextGlobeA, contextGlobeB,
	posX, posY, rInit, r, x, y, xTmp, yTmp, xRel, yRel, delta,
	momentumFlag, mouseDown, shiftKeyDown, altKeyDown,
	showGradient, showGradientZoombased, showGraticule,
	showBorders, showLakes, showHelp, showInfo, showCoastlines, updateGlobes, showGlobes, selectedGlobes,
	lastSelectedGlobes = [],
	pi = Math.PI, radToDegFactor = 180 / pi,
	debugFlag = 0;

// math
Number.prototype.toDeg = function () {return this * radToDegFactor; };

function logAll() {
	console.log(
		"LOD:", geometryLOD,
		"LODs[]:", geometryAtLOD,
		"globe:", globe,
		"land:", land,
		"coastlines:", coastlines,
		borders, lakes, graticule,
		"tmp:", gammaAtmp, gammaBtmp, gammaStart,
		"currentRotation:", currentRotation,
		"projection:", projection,
		"path: ", path,
		"canvas: ", canvas,
		"context: ", context);
}
function configGeoData() {
	topojsonPath = "topojson/";
	geometryAtLOD = [];
	// 0 is globe view zoom level
	geometryAtLOD[0] = topojsonPath + "ne_110m_world.json";
	//geometryAtLOD[1] = topojsonPath + "ne_110m_world.json";
	//geometryAtLOD[2] = topojsonPath + "ne_110m_world.json";
	//geometryAtLOD[1] = topojsonPath + "ne_50m_world.json";
	//geometryAtLOD[2] = topojsonPath + "ne_10m_world.json";
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
function getContextByCanvasInArray(canvasInArray) {
	var localContext;
	if (canvasInArray.getContext) {
		canvasInArray.width = width;
		canvasInArray.height = height;
		localContext = canvasInArray.getContext('2d');
	}
	return localContext;
}
function initializeLayout() {
	width = window.innerWidth;
	height = window.innerHeight - 5; // needs fix -5 should not be necessary for no scroll bars
	minSize = 640;
	if (width <= minSize) {width = minSize; }
	if (height < minSize) {height = minSize; }
	if (width <= height) {
		minDim = width;
		maxDim = height;
	} else {
		minDim = height;
		maxDim = width;
	}
	canvas = [];
	// assign canvases
	canvas[0] = document.getElementById('canvas_background');
	canvas[1] = document.getElementById('canvas_globe_a');
	canvas[2] = document.getElementById('canvas_globe_b');
	canvas[3] = document.getElementById('canvas_gradient');
	canvas[4] = document.getElementById('canvas_help');
	canvas[5] = document.getElementById('canvas_info');
	// define canvas aliases and layer order
	canvasBackground = canvas[0];
	canvasGlobeA = canvas[1];
	canvasGlobeB = canvas[2];
	canvasGradient = canvas[3];
	canvasHelp = canvas[4];
	canvasInfo = canvas[5];
	context = [];
	// assign context to layers, order is defined by canvas not here
	context[0] = getContextByCanvasInArray(canvas[0]);
	context[1] = getContextByCanvasInArray(canvas[1]);
	context[2] = getContextByCanvasInArray(canvas[2]);
	context[3] = getContextByCanvasInArray(canvas[3]);
	context[4] = getContextByCanvasInArray(canvas[4]);
	context[5] = getContextByCanvasInArray(canvas[5]);
	// assign context aliases
	contextBackground = context[0];
	contextGlobeA = context[1];
	contextGlobeB = context[2];
	contextGradient = context[3];
	contextHelp = context[4];
	contextInfo = context[5];
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
function initializeColors() {
	//  ColorBrewer: RdYlBu
	darkTone = "rgba(26, 17, 16, 1)";
	brightTone = "rgba(240, 234, 214, 1)";
	fillColorA = "rgba(215, 25, 28, 0.5)";
	fillColorB = "rgba(44, 123, 182, 0.5)";
	textColor = darkTone;
	gradientSphereColor = "rgba(80, 80, 100, 0.5)";

}
function initializeProjection() {
	rArrays = [[0, 0, 0], [0, 0, 0]];
	clipAngleMax = 89;
	clipAngle = clipAngleMax;
	zoomMin = 10;
	zoomMax = 10000;
	delta = 0;
	// λ (longitude) and φ (latitude) of projection center, (γ) rotation angle counter-clockwise in degrees
	presets = []; // [[λ, φ, γ], [ λ, φ, γ]]
	presets[0] = [[0, 0, 0], [0, 0, 0]];
	presets[1] = [[0, -10, 0], [-50, -13, 44]]; // African and South American Coastlines
	presets[2] = [[15, 40, 0], [-100, 40, 0]];  // Europe - America
	presets[3] = [[0, 90, 0], [120, -90, 0]];   // Overlaid poles
	presets[4] = [[15, 40, 0], [-45, -140, 0]];   // Europe - Australia
	presets[5] = [[-100, 40, 0], [-45, -140, 0]];   // America - Australia
	presets[6] = [[-100, 40, 0], [100, 40, 0]];   // USA - China
	presets[7] = [[-100, 40, 0], [60, 40, 0]];   // USA - Russia
	presets[8] = [[15, 40, 0], [100, 40, 0]];   // Europe - China
	presets[9] = [[130, -35, 0], [135, -67, 0]];// Australia - Antarctica tectonics
	diagonal = Math.sqrt(maxDim * maxDim + minDim * minDim);
	yRel = 0;
	xRel = 0;
	xTmp = 0;
	yTmp = 0;
}
function initializeFlags() {
	gammaAtmp = 0;
	gammaBtmp = 0;
	gammaStart = 0;
	mouseDown = 0;
	shiftKeyDown = 0;
	altKeyDown = 0;
	showGradient = 1;
	showGradientZoombased = 1;
	showGraticule = 1;
	showBorders = 0;
	showCoastlines = 0;
	showLakes = 0;
	showGlobes = [1, 1];
	selectedGlobes = [1, 0];
	updateGlobes = [1, 1];
	showHelp = 1;
	showInfo = 1;
	momentumFlag = 1;
}
function initializeAll() {
	initializeLayout();
	initializeColors();
	initializeProjection();
	initializeFlags();
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
function loadPreset(p) {rArrays = presets[p].slice(); }
function calcTan() { // Calculate Angle from projection center
	var gamma, deltaX, deltaY;
	deltaX = x - posX;
	deltaY = y - posY;
	gamma = (-Math.atan2(deltaY, deltaX)).toDeg();
	return gamma;
}
function prepareDocument() {
	d3.select("body").append("div").attr("id", "map");
	d3.selectAll("div").append("canvas")
		.attr("id", "canvas_background")
		.attr("style", "position: absolute; left: 0; top: 0; z-index: 1;");
	d3.selectAll("div").append("canvas")
		.attr("id", "canvas_globe_a")
		.attr("style", "position: absolute; left: 0; top: 0; z-index: 2;");
	d3.selectAll("div").append("canvas")
		.attr("id", "canvas_globe_b")
		.attr("style", "position: absolute; left: 0; top: 0; z-index: 3;");
	d3.selectAll("div").append("canvas")
		.attr("id", "canvas_gradient")
		.attr("style", "position: absolute; left: 0; top: 0; z-index: 4;");
	d3.selectAll("div").append("canvas")
		.attr("id", "canvas_help")
		.attr("style", "position: absolute; left: 0; top: 0; z-index: 5;");
	d3.selectAll("div").append("canvas")
		.attr("id", "canvas_info")
		.attr("style", "position: absolute; left: 0; top: 0; z-index: 6;");
}
// Layout helper Functions
function clearCanvasByContextIndex(layer) {context[layer].clearRect(0, 0, canvas[layer].width, canvas[layer].height); }
function clearCanvas(canvasInArray) {(canvasInArray.getContext('2d')).clearRect(0, 0, canvasInArray.width, canvasInArray.height); }
function clearAllCanvas() {
	var i, n = canvas.length;
	for (i = 0; i < n; i += 1) {clearCanvasByContextIndex(i); }
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

function drawInfo() {
	if (showInfo) {
		var lambdaA = (rArrays[0][0] + 180).mod(360) - 180,
			phiA = (rArrays[0][1] + 180).mod(360) - 180,
			gammaA = rArrays[0][2].mod(360),
			lambdaB =  (rArrays[1][0] + 180).mod(360) - 180,
			phiB = (rArrays[1][1] + 180).mod(360) - 180,
			gammaB = rArrays[1][2].mod(360);
		clearBackgroundRect(0, 0, 3, 3, contextInfo);
		backgroundRect(1, 0, 1, 3, fillColorA, contextInfo);
		backgroundRect(2, 0, 1, 3, fillColorB, contextInfo);
		contextInfo.fillStyle = textColor;
		if (x !== undefined) {contextInfo.fillText("x :", getX(0), getYtext(0)); }
		if (y !== undefined) {contextInfo.fillText("y :", getX(0), getYtext(1)); }
		contextInfo.fillText("φ :", getX(1), getYtext(0));
		contextInfo.fillText("φ :", getX(2), getYtext(0));
		contextInfo.fillText("λ :", getX(1), getYtext(1));
		contextInfo.fillText("λ :", getX(2), getYtext(1));
		if (gammaA !== 0) {contextInfo.fillText("γ :", getX(1), getYtext(2)); }
		if (gammaB !== 0) {contextInfo.fillText("γ :", getX(2), getYtext(2)); }
		contextInfo.textAlign = "right";
		if (x !== undefined) {contextInfo.fillText(x, getXalignRight(0), getYtext(0)); }
		if (y !== undefined) {contextInfo.fillText(y, getXalignRight(0), getYtext(1)); }
		contextInfo.fillText(formatPrecisionOne(phiA), getXalignRight(1), getYtext(0));
		contextInfo.fillText(formatPrecisionOne(phiB), getXalignRight(2), getYtext(0));
		contextInfo.fillText(formatPrecisionOne(lambdaA), getXalignRight(1), getYtext(1));
		contextInfo.fillText(formatPrecisionOne(lambdaB), getXalignRight(2), getYtext(1));
		if (gammaA !== 0) {contextInfo.fillText(formatPrecisionOne(gammaA), getXalignRight(1), getYtext(2)); }
		if (gammaB !== 0) {contextInfo.fillText(formatPrecisionOne(gammaB), getXalignRight(2), getYtext(2)); }
		contextInfo.textAlign = "left";
	}
}
function drawHelp() {
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
function drawGlobe(rArray, fillColor, localContext) {
	// -λ, -φ, γ
	var borderAlphaKnockOut = 0.8,
		borderAlphaLine = 0.5,
		coastlineAlpha = 0.9,
		mode = "destination-out",
		modeDefault = "source-over",
		localRotation = [-(rArray[0]), -(rArray[1]), rArray[2]];

	// tweak projections here
	projection = d3.geo.orthographic().rotate(localRotation).scale(r).translate([posX, posY]).clipAngle(clipAngle);
	path = d3.geo.path().projection(projection).context(localContext);

	// Filled Style
	if (!showCoastlines) {
		localContext.fillStyle = fillColor;
		localContext.beginPath();
		path(land);
		localContext.fill();
		localContext.globalCompositeOperation = mode;
		// subtract lakes and borders from continents
		if (showLakes) {
			localContext.fillStyle = fillColor.setAlpha(1);
			localContext.beginPath();
			path(lakes);
			localContext.fill();
		}
		if (showBorders) {
			localContext.strokeStyle = fillColor.setAlpha(borderAlphaKnockOut);
			localContext.beginPath();
			path(borders);
			localContext.stroke();
		}
	} else {
		localContext.strokeStyle = fillColor.setAlpha(coastlineAlpha);
		localContext.beginPath();
		path(coastlines);
		localContext.stroke();
		if (showLakes) {
			localContext.beginPath();
			path(lakes);
			localContext.stroke();
		}
		if (showBorders) {
			localContext.strokeStyle = fillColor.setAlpha(borderAlphaLine);
			localContext.beginPath();
			path(borders);
			localContext.stroke();
		}
	}
	// Graticule
	if (showGraticule) {
		localContext.globalCompositeOperation = modeDefault;
		localContext.beginPath();
		path(graticule);
		localContext.strokeStyle = fillColor.setAlpha(0.25);
		localContext.stroke();
	}
	localContext.globalCompositeOperation = modeDefault;
}
function drawGlobes() {
	if (showGlobes[0] && (selectedGlobes[0] || updateGlobes[1])) {
		clearCanvas(canvasGlobeA);
		drawGlobe(rArrays[0], fillColorA, contextGlobeA);
		updateGlobes[0] = 0;
	}
	if (showGlobes[1] && (selectedGlobes[1] || updateGlobes[1])) {
		clearCanvas(canvasGlobeB);
		drawGlobe(rArrays[1], fillColorB, contextGlobeB);
		updateGlobes[1] = 0;
	}
}
function drawGradient() {
	clearCanvas(canvasGradient);
	projection = d3.geo.orthographic().scale(r).translate([posX, posY]).clipAngle(clipAngle);
	path = d3.geo.path().projection(projection).context(contextGradient);
	if (showGradient && showGradientZoombased) {
		contextGradient.beginPath();
		contextGradient.fillStyle = gradientSphere;
		path(globe);
		contextGradient.fill();
	}
	if (!showGradient || !showGradientZoombased) {
		contextGradient.beginPath();
		path(globe);
		contextGradient.strokeStyle = "rgba(0, 0, 0, 0.2)";
		contextGradient.stroke();
	}
}
function drawAll() {
	updateGlobes = [1, 1];
	clearAllCanvas();
	drawGlobes();
	drawGradient();
	drawInfo();
	drawHelp();
}

function loadGeometry() {
	d3.json(topojsonData, function (error, json) {
		if (error) {console.log(error); }
		globe = {type: "Sphere"};
		/** @namespace json.objects.land */
		/** @namespace json.objects.coastline */
		/** @namespace json.objects.landborders*/
		/** @namespace json.objects.lakes */
		land = topojson.object(json, json.objects.land);
		coastlines = topojson.object(json, json.objects.coastline);
		borders = topojson.object(json, json.objects.landborders);
		lakes = topojson.object(json, json.objects.lakes);
		graticule = createGraticule(graticuleInterval);
		drawAll();
	});
}

function setGeometryLOD(lod, forceNoGradientAtLOD, noMomentumAtLOD) {
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

function resetAll() {
	if (debugFlag) {logAll(); }
	configGeoData();
	initializeAll();
	setGeometryLOD();
	clearAllCanvas();
	if (debugFlag) {logAll(); }
}

// interaction functions
function rotate() {
	var i;
	for (i = 0; i < selectedGlobes.length; i += 1) {
		if (selectedGlobes[i]) {
			if (!altKeyDown) {rArrays[i] = [rArrays[i][0] - xRel / r, rArrays[i][1] + yRel / r, rArrays[i][2]]; }
			if (altKeyDown) {rArrays[i] = [rArrays[i][0], rArrays[i][1], gammaAtmp + calcTan() - gammaStart]; }
			updateGlobes[i] = 1;
		}
	}
}

function track(evt) {
	x = evt.offsetX || evt.layerX;
	y = evt.offsetY || evt.layerY;
	if (mouseDown) {
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

function switchColors() {
	var tmp = fillColorA;
	fillColorA = fillColorB;
	fillColorB = tmp;
}

function selectAllGlobes() {
	if (!shiftKeyDown) {
		if (debugFlag) {console.log("select: selectedGlobes, lastSelectedGlobes", selectedGlobes, lastSelectedGlobes); }
		lastSelectedGlobes = selectedGlobes.slice(0);
		selectedGlobes = setAllArrayValues(selectedGlobes, 1);
		if (debugFlag) {console.log("select: selectedGlobes, lastSelectedGlobes", selectedGlobes, lastSelectedGlobes); }
	}
}

function deSelectAllGlobes() {
	if (debugFlag) {console.log("deselect: selectedGlobes, lastSelectedGlobes", selectedGlobes, lastSelectedGlobes); }
	selectedGlobes = lastSelectedGlobes.slice(0);
	if (debugFlag) {console.log("deselect: selectedGlobes, lastSelectedGlobes", selectedGlobes, lastSelectedGlobes); }
}


function keyDown(evt) {
	var validKey = 1;
	evt = evt || window.event;
	switch (evt.keyCode) {
	case 16: selectAllGlobes(); shiftKeyDown = 1; break;                 // Shift
	case 18:                                                             // Alt
		altKeyDown = 1;
		if (gammaAtmp === undefined || gammaBtmp === undefined || gammaStart === undefined) {
			gammaAtmp = rArrays[0][2];
			gammaBtmp = rArrays[1][2];
			gammaStart = calcTan();
		}
		break;
	case 32: showGlobes[1] = showGlobes[1].toggle(); drawAll(); break;   // Space
	case 48: loadPreset(0); drawAll(); break;                            // 0
	case 49: loadPreset(1); drawAll(); break;                            // 1
	case 50: loadPreset(2); drawAll(); break;                            // 2
	case 51: loadPreset(3); drawAll(); break;                            // 3
	case 52: loadPreset(4); drawAll(); break;                            // 4
	case 53: loadPreset(5); drawAll(); break;                            // 5
	case 54: loadPreset(6); drawAll(); break;                            // 6
	case 55: loadPreset(7); drawAll(); break;                            // 7
	case 56: loadPreset(8); drawAll(); break;                            // 8
	case 57: loadPreset(9); drawAll(); break;                            // 9
	case 66: showBorders = showBorders.toggle();  drawAll(); break;      // B
	case 67: showCoastlines = showCoastlines.toggle(); drawAll(); break; // C
	case 68: showGradient = showGradient.toggle(); drawAll(); break;     // D
	case 71: showGraticule = showGraticule.toggle(); drawAll(); break;   // G
	case 72: showHelp = showHelp.toggle(); drawAll(); break;             // H
	case 73: showInfo = showInfo.toggle(); drawAll(); break;             // L
	case 76: showLakes = showLakes.toggle(); drawAll(); break;           // L
	case 77: momentumFlag = momentumFlag.toggle(); break;                // M
	case 82: resetAll(); drawAll(); break;                               // R
	case 83: switchColors(); drawAll(); break;                           // S
	case 192:                                                            // `
	case 220:                                                            // ^
		debugFlag = debugFlag.toggle();
		if (debugFlag) {logAll(); }
		break;
	default: validKey = 0; break;
	}
	if (validKey && debugFlag) {
		console.log("valid key down:", evt.keyCode);
	}
}

function keyUp(evt) {
	var validKey = 1;
	evt = evt || window.event;
	switch (evt.keyCode) {
	case 16:                                                             // Shift
		shiftKeyDown = 0;
		deSelectAllGlobes();
		shiftActiveArrayMember(selectedGlobes);
		break;
	case 18:                                                             // Alt
		altKeyDown = 0;
		xRel = 0;
		yRel = 0;
		gammaAtmp = undefined;
		gammaBtmp = undefined;
		gammaStart = undefined;
		break;
	default: validKey = 0; break;
	}
	if (validKey && debugFlag) {
		console.log("valid key up:", evt.keyCode);
	}
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
		if (debugFlag) {console.log(delta, visDeg, clipAngle); }

		if (r <= diagonal) {setGeometryLOD(0, 0, 0); }
		if (r > diagonal && r <= diagonal * 4) {setGeometryLOD(1, 1, 0); }
		if (r > diagonal * 4) {setGeometryLOD(2, 1, 1); }

		// clamp zoom
		if (r < zoomMin) {r = zoomMin; }
		if (r > zoomMax) {r = zoomMax; }
		// clear gradient overlay on zoom resize
		for (i = 0; i < updateGlobes.length; i += 1) {
			updateGlobes[i] = 1;
		}
		createGradientSphere();
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
function addListeners() {
	function lostFocus() {shiftKeyDown = 0; altKeyDown = 0; }
	element = document.getElementById("map");
	element.addEventListener("mousemove", track, false);
	element.addEventListener("mousedown", startTrack, false);
	element.addEventListener("mouseup", stopTrack, false);
	document.addEventListener("mousewheel", wheel, false);
	document.addEventListener("keydown", keyDown, false);
	document.addEventListener("keyup", keyUp, false);
	window.onblur = lostFocus(); // reset key states on lost focus
	window.onfocus = lostFocus(); // and regained focus
}

configGeoData();
setGeometryLOD();
prepareDocument();
addListeners();
initializeAll();
createGradientSphere();
loadPreset(1);
drawAll();
if (debugFlag) {logAll(); }