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
// TODO: show scale / orientation
// TODO: Dynamic Graticule
// TODO: Switch projections
// TODO: Raster
// TODO: canvas resize on window resize
// TODO: Animations > Plate tectonics
// TODO: Sun Terminator
// TODO: Tissot's-Indicatrix (Pseudo/real)
"use strict";
var element, globe, land, coastlines, borders, lakes, graticule,
	fillColorA, fillColorB, textColor, gradientSphere,
	width, height, origin, minSize, maxDim, minDim, diagonal, zoomMin, zoomMax,
	canvasPadding, globePadding, lineNumber, colWidth, rowHeight, padding, gutter, baselineOffset,
	geometryAtLOD, geometryLOD, topojsonPath, clipAngle,
	presets, rArrays, gammaAtmp, gammaBtmp, gammaStart, currentRotation, projection, path,
	canvas, canvasBackground, canvasGradient, canvasInfo, canvasHelp, canvasGlobeA, canvasGlobeB,
	context, contextBackground, contextGradient, contextInfo, contextHelp, contextGlobeA, contextGlobeB,
	posX, posY, rInit, r, x, y, xTmp, yTmp, xRel, yRel,
	pi = Math.PI, radToDegFactor = 180 / pi, delta,
	momentumFlag, mouseDown, shiftKeyDown, shiftToggle, altKeyDown,
	showGradient, showGradientZoombased, showGraticule, switchColors,
	showBorders, showLakes, showHelp, showInfo, showCoastlines, updateGlobes, showGlobes, selectedGlobes,
	debugFlag;

debugFlag = 0;
function logAll() {console.log(geometryAtLOD[0], globe, land, coastlines, borders, lakes, graticule, "tmp:", gammaAtmp, gammaBtmp, gammaStart, currentRotation, projection, path, canvas, context); }


topojsonPath = "topojson/";
geometryAtLOD = [];
// 0 is globe view zoom level
geometryAtLOD[0] = topojsonPath + "ne_110m_world.json";
geometryAtLOD[1] = topojsonPath + "ne_50m_world.json";
geometryAtLOD[2] = topojsonPath + "ne_10m_world.json";
geometryLOD = 0;

function createGraticule() { // create graticules as GeoJSON on the fly
	var lonLat, i, j, graticuleGeoJson = {type: "FeatureCollection", "features": []}; //declare array
	for (i = 0; i < 5; i = i + 1) {
		graticuleGeoJson.features.push({
			"type": "Feature",
			"properties": {
				"name": "Line of Latitude" + i
			},
			"geometry": {
				"type": "LineString",
				"coordinates": [ ]
			}
		});
		for (j = 0; j <= 72; j = j + 1) {
			lonLat = [j * 5 - 180, i * 30 - 60];
			graticuleGeoJson.features[i].geometry.coordinates.push(lonLat);
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
function createGradientSphere() {
	gradientSphere = contextGradient.createRadialGradient(posX - 0.3 * r, posY - 0.5 * r, 0, posX, posY, r * 1.03);
	gradientSphere.addColorStop(0, "rgba(127, 127, 127, 0)");
	gradientSphere.addColorStop(0.1, "rgba(127, 127, 127, 0.01)");
	gradientSphere.addColorStop(0.3, "rgba(127, 127, 127, 0.02)");
	gradientSphere.addColorStop(0.5, "rgba(127, 127, 127, 0.05)");
	gradientSphere.addColorStop(0.65, "rgba(127, 127, 127, 0.09)");
	gradientSphere.addColorStop(0.75, "rgba(127, 127, 127, 0.14)");
	gradientSphere.addColorStop(0.825, "rgba(127, 127, 127, 0.2)");
	gradientSphere.addColorStop(0.9, "rgba(127, 127, 127, 0.29)");
	gradientSphere.addColorStop(0.95, "rgba(127, 127, 127, 0.42)");
	gradientSphere.addColorStop(0.98, "rgba(127, 127, 127, 0.55)");
	gradientSphere.addColorStop(1, "rgba(127, 127, 127, 0.62)");
}
function initializeAll() {
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
	colWidth = 34;
	rowHeight = 12;
	padding = 3;
	gutter = 15;
	lineNumber = 0;
	origin = [canvasPadding, canvasPadding];
	baselineOffset = 9;
	//  ColorBrewer: RdYlBu
	fillColorA = "rgba(215, 25, 28, 0.5)";
	fillColorB = "rgba(44, 123, 182, 0.5)";
	textColor = "rgba(0, 0, 0, 0.7)";
	rArrays = [[0, 0, 0], [0, 0, 0]];
	gammaAtmp = 0;
	gammaBtmp = 0;
	gammaStart = 0;
	mouseDown = 0;
	shiftKeyDown = 0;
	shiftToggle = 0;
	altKeyDown = 0;
	showGradient = 1;
	showGradientZoombased = 1;
	showGraticule = 0;
	showBorders = 0;
	showCoastlines = 0;
	showLakes = 0;
	showGlobes = [1, 1];
	selectedGlobes = [1, 0];
	updateGlobes = [1, 1];
	showHelp = 1;
	showInfo = 1;
	switchColors = 0;
	momentumFlag = 1;
	clipAngle = 88;
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
	createGradientSphere();
}

// math functions
function sign(number) {return number ? number < 0 ? -1 : 1 : 0; }  // sign function (+/-/0) of number http://stackoverflow.com/questions/7624920/number-sign-in-javascript
function radToDeg(rad) {return rad * radToDegFactor; }
//initialize Gradient
function loadPreset(p) {rArrays = presets[p].slice(); }
function calcTan() { // Calculate Angle from projection center
	var gamma, deltaX, deltaY;
	deltaX = x - posX;
	deltaY = y - posY;
	gamma = radToDeg(-Math.atan2(deltaY, deltaX));
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

Number.prototype.mod = function (n) {return ((this % n) + n) % n; };
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
		contextInfo.fillStyle = "rgba(0, 0, 0, 0.7)";
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
		contextInfo.fillText(Math.round(phiA), getXalignRight(1), getYtext(0));
		contextInfo.fillText(Math.round(phiB), getXalignRight(2), getYtext(0));
		contextInfo.fillText(Math.round(lambdaA), getXalignRight(1), getYtext(1));
		contextInfo.fillText(Math.round(lambdaB), getXalignRight(2), getYtext(1));
		if (gammaA !== 0) {contextInfo.fillText(Math.round(gammaA), getXalignRight(1), getYtext(2)); }
		if (gammaB !== 0) {contextInfo.fillText(Math.round(gammaB), getXalignRight(2), getYtext(2)); }
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
		contextHelp.fillText("Show/hide Coastlines only (more performant):  [C]", xRight, getYtext(newLine()));
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
	var localRotation = [-(rArray[0]), -(rArray[1]), rArray[2]];
	// tweak projections here
	projection = d3.geo.orthographic().rotate(localRotation).scale(r).translate([posX, posY]).clipAngle(clipAngle);
	path = d3.geo.path().projection(projection).context(localContext);
	localContext.beginPath();
	if (!showCoastlines) {
		localContext.fillStyle = fillColor;
		path(land);
		localContext.fill();
	} else {
		localContext.beginPath();
		path(coastlines);
		//localContext.strokeStyle = "rgba(0, 0, 0, 0.3)";
		localContext.strokeStyle = fillColor;
		localContext.stroke();
	}
	if (showLakes) {
		localContext.beginPath();
		localContext.fillStyle = "rgba(255, 255, 255, 0.75)";
		path(lakes);
		localContext.fill();
	}
	if (showBorders) {
		localContext.beginPath();
		path(borders);
		if (showCoastlines) {localContext.strokeStyle = fillColor; }
		if (!showCoastlines) {localContext.strokeStyle = "rgba(255, 255, 255, 0.5)"; }
		localContext.stroke();
	}
	if (showGraticule) {
		localContext.beginPath();
		path(graticule);
		localContext.strokeStyle = fillColor;
		localContext.stroke();
	}
}
function drawGlobes() {
	if (switchColors) {
		var tmp = fillColorA;
		fillColorA = fillColorB;
		fillColorB = tmp;
		switchColors = 0;
	}
	if (showGlobes[0] && (selectedGlobes[0] || updateGlobes[1])) {
		clearCanvas(canvasGlobeA);
		drawGlobe(rArrays[0], fillColorA, contextGlobeA);
	}
	if (showGlobes[1] && (selectedGlobes[1] || updateGlobes[1])) {
		clearCanvas(canvasGlobeB);
		drawGlobe(rArrays[1], fillColorB, contextGlobeB);
	}
	updateGlobes = [0, 0];
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
// interaction function
function rotate() {
	if (!shiftKeyDown) {
		if (!shiftToggle) {
			updateGlobes[0] = 1;
			selectedGlobes = [1, 0];
			if (!altKeyDown) {rArrays[0] = [rArrays[0][0] - xRel / r, rArrays[0][1] + yRel / r, rArrays[0][2]]; }
			if (altKeyDown) {rArrays[0] = [rArrays[0][0], rArrays[0][1], gammaAtmp + calcTan() - gammaStart]; }
		}
		if (shiftToggle) {
			updateGlobes[1] = 1;
			selectedGlobes = [0, 1];
			if (!altKeyDown) {rArrays[1] = [rArrays[1][0] - xRel / r, rArrays[1][1] + yRel / r, rArrays[1][2]]; }
			if (altKeyDown) {rArrays[1] = [rArrays[1][0], rArrays[1][1], gammaBtmp + calcTan() - gammaStart]; }
		}
	}
	if (shiftKeyDown) {
		updateGlobes = [1, 1];
		selectedGlobes = [1, 1];
		if (!altKeyDown) {
			rArrays = [
				[rArrays[0][0] - xRel / r, rArrays[0][1] + yRel / r, rArrays[0][2]],
				[rArrays[1][0] - xRel / r, rArrays[1][1] + yRel / r, rArrays[1][2]]
			];
		}
		if (altKeyDown) {
			var diff = calcTan() - gammaStart;
			rArrays = [
				[rArrays[0][0], rArrays[0][1], gammaAtmp + diff],
				[rArrays[1][0], rArrays[1][1], gammaBtmp + diff]
			];
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
	mouseDown = 0;
	if (momentumFlag) {
		var refreshIntervalId = setInterval(function () {
			var linearSlowdown = r / 500, factorSlowdown = 0.98;
			yRel = (yRel) * factorSlowdown - sign(yRel) * linearSlowdown;
			xRel = (xRel) * factorSlowdown - sign(xRel) * linearSlowdown;
			rotate();
			drawGlobes();
			if ((Math.abs(xRel) < 1 && Math.abs(yRel) < 1) || !momentumFlag) {
				clearInterval(refreshIntervalId);
			}
		}, 1000 / 48);
	}
}
function toggle(p) {
	if (p) {p = 0; }
	else {p = 1; }
	return p;
}

function loadGeometry(topojsonData) {
	if (topojsonData === undefined) {topojsonData = geometryAtLOD[0]; }
	d3.json(topojsonData, function (error, json) {
		if (error) {console.log(error); }
		globe = {type: "Sphere"};
		land = topojson.object(json, json.objects.land);
		coastlines = topojson.object(json, json.objects.coastline);
		borders = topojson.object(json, json.objects.landborders);
		lakes = topojson.object(json, json.objects.lakes);
		graticule = createGraticule();
		drawAll();
	});
}

function resetAll() {
	initializeAll();
	loadGeometry(geometryAtLOD[0]);
	clearAllCanvas();
	if (debugFlag) {logAll(); }
}
function keyDown(evt) {
	var validKey = 1;
	evt = evt || window.event;
	switch (evt.keyCode) {
	case 16: shiftKeyDown = 1; break;                                   // Shift
	case 18:                                                            // Alt
		altKeyDown = 1;
		if (gammaAtmp === undefined || gammaBtmp === undefined || gammaStart === undefined) {
			gammaAtmp = rArrays[0][2];
			gammaBtmp = rArrays[1][2];
			gammaStart = calcTan();
		}
		break;
	case 32: showGlobes[1] = toggle(showGlobes[1]); drawAll(); break;   // Space
	case 48: loadPreset(0); drawAll(); break;                           // 0
	case 49: loadPreset(1); drawAll(); break;                           // 1
	case 50: loadPreset(2); drawAll(); break;                           // 2
	case 51: loadPreset(3); drawAll(); break;                           // 3
	case 52: loadPreset(4); drawAll(); break;                           // 4
	case 53: loadPreset(5); drawAll(); break;                           // 5
	case 54: loadPreset(6); drawAll(); break;                           // 6
	case 55: loadPreset(7); drawAll(); break;                           // 7
	case 56: loadPreset(8); drawAll(); break;                           // 8
	case 57: loadPreset(9); drawAll(); break;                           // 9
	case 66: showBorders = toggle(showBorders);  drawAll(); break;      // B
	case 67: showCoastlines = toggle(showCoastlines); drawAll(); break; // C
	case 68: showGradient = toggle(showGradient); drawAll(); break;     // D
	case 71: showGraticule = toggle(showGraticule); drawAll(); break;   // G
	case 72: showHelp = toggle(showHelp); drawAll(); break;             // H
	case 73: showInfo = toggle(showInfo); drawAll(); break;             // L
	case 76: showLakes = toggle(showLakes); drawAll(); break;           // L
	case 77: momentumFlag = toggle(momentumFlag); break;                // M
	case 82: resetAll(); drawAll(); break;                              // R
	case 83: switchColors = toggle(switchColors); drawAll(); break;     // S
	case 192:                                                           // `
	case 220: debugFlag = toggle(debugFlag); break;                     // ^
	default: validKey = 0; break;
	}
	if (validKey && debugFlag) {
		console.log("valid key:", evt.keyCode);
	}
}
function keyUp(evt) {
	var validKey = 1;
	evt = evt || window.event;
	switch (evt.keyCode) {
	case 16:                                        // Shift
		shiftKeyDown = 0;
		shiftToggle = toggle(shiftToggle);
		break;
	case 18:                                        // Alt
		altKeyDown = 0;
		xRel = 0;
		yRel = 0;
		gammaAtmp = undefined;
		gammaBtmp = undefined;
		gammaStart = undefined;
		break;
	default: validKey = 0; break;
	}
}
function zoom(delta) {
	function setGeometryLOD(geometryLOD, forceNoGradientAtLOD, enableMomentumAtLOD) {
		if (forceNoGradientAtLOD) {showGradientZoombased = 0; }
		else {showGradientZoombased = 1; }
		momentumFlag = enableMomentumAtLOD;
		loadGeometry(geometryAtLOD[geometryLOD]);
	}
	if (r >= zoomMin && r <= zoomMax) {
		r = r + delta * (r / 10);
		if (r >= diagonal / 2) {clipAngle = 90 - radToDeg(Math.acos((diagonal / 2) / r)); }
		else {clipAngle = 89; }
		if (r <= diagonal) {setGeometryLOD(0, 0, 1); }
		if (r > diagonal && r <= diagonal * 4 && geometryLOD !== 1) {setGeometryLOD(1, 1, 1); }
		if (r > diagonal * 4 && geometryLOD !== 2) {setGeometryLOD(2, 1, 1); }
		if (r < zoomMin) {r = zoomMin; }
		if (r > zoomMax) {r = zoomMax; }
		// clear gradient overlay on zoom resize
		createGradientSphere();
		drawGlobes();
		drawGradient();
	}
}
function wheel(event) {
	if (!event)	{event = window.event; } // IE
	if (event.wheelDelta) { delta = event.wheelDelta / 120; }
	else if (event.detail) {delta = -event.detail / 3; }
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
}
loadGeometry();
prepareDocument();
addListeners();
initializeAll();
loadPreset(1);
drawAll();
if (debugFlag) {logAll(); }