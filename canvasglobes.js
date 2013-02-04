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
// TODO: add cities+labels
// TODO: add mirror option
// TODO: Jump to Country
// TODO: Compare countries
// TODO: lock axis switches
// TODO: show scale / orientation
// TODO: Graticule
// TODO: Switch projections
// TODO: Raster
// TODO: canvas resize on window resize
// TODO: Animations > Plate tectonics
// TODO: Sun Terminator
// TODO: Tissot's-Indicatrix (Pseudo/real)
"use strict";
function globeOverlay() {
	var element, globe, land, coastlines, borders, lakes, graticule,
		fillColorA, fillColorB, textColor, gradient,
		width, height, origin, minSize, maxDim, minDim, diagonal, zoomMin, zoomMax,
		canvasPadding, globePadding, lineNumber, colWidth, rowHeight, padding, gutter, baselineOffset,
		geometryAtLOD, scale, topojsonPath, geometryAtStart, clipAngle, presets,
		λA, φA, γA, λB, φB, γB, γAtmp, γBtmp, γStart, rotation, projection, canvas, context, path,
		posX, posY, rInit, r, x, y, xTmp, yTmp, xRel, yRel, π, radToDegFactor,
		momentumFlag, mouseDown, shiftKeyDown, shiftToggle, altKeyDown,
		showGradient, showGraticule, switchColors, showGlobeB, showBorders, showLakes, showHelp, showPosition, showCoastlines,
		debug;
    // debug flag
	//noinspection JSUnusedAssignment
	debug = 1;
	π = Math.PI;
	radToDegFactor = 180 / π;
	//initialize Layout
	function prepareDocument(){
		// Add elements to document
		d3.select("body").append("div").attr("id", "map");
		d3.selectAll("div").append("canvas").attr("id", "canvas1");
		element = document.getElementById("map");
		element.addEventListener("mousemove", track, false);
		element.addEventListener("mousedown", startTrack, false);
		element.addEventListener("mouseup", stopTrack, false);
		element.addEventListener("mousewheel", wheel, false);
		document.addEventListener("keydown", keyDown, false);
		document.addEventListener("keyup", keyUp, false);
		window.onblur = function() { // reset key states on lost focus
			shiftKeyDown = 0;
			altKeyDown = 0;
		};
	}
	function initializeAll() {
	width = window.innerWidth;
	height = window.innerHeight - 5; // needs fix -5 should not be necessary for no scroll bars
	canvas = document.getElementById('canvas1');
	minSize = 640;
	if (width <= minSize) {width = minSize;}
	if (height < minSize) {height = minSize;}
	if (canvas.getContext) {
		canvas.width = width;
		canvas.height = height;
		context = canvas.getContext('2d');
	}
	if (width <= height) {
		minDim = width;
		maxDim = height;
	}
	else {
		minDim = height;
		maxDim = width;
	}
	canvasPadding = minDim / 25;
	globePadding = canvasPadding * 0.61;
	posX = width / 2;
	posY = height / 2;
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
	initGradient();
		λA = 0;
		φA = 0;
		γA = 0;
		λB = 0;
		φB = 0;
		γB = 0;
		mouseDown = 0;
		shiftKeyDown = 0;
		shiftToggle = 0;
		altKeyDown = 0;
		showGradient = 0;
		showBorders = 0;
		showCoastlines = 0;
		showLakes = 0;
		showGlobeB = 1;
		showHelp = 1;
		showPosition = 1;
		switchColors = 0;
		momentumFlag = 1;
		clipAngle = 88;
		zoomMin = 10;
		zoomMax = 10000;
		topojsonPath = "topojson/";
		geometryAtLOD = [];
		// 0 is globe view zoom level
		geometryAtLOD[0] = topojsonPath + "ne_110m_world.json";
		geometryAtLOD[1] = topojsonPath + "ne_50m_world.json";
		geometryAtLOD[2] = topojsonPath + "ne_10m_world.json";
		geometryAtStart = geometryAtLOD[0];
		scale = 0;
		// λ (longitude) and φ (latitude) of projection center, rotation angle (γ) counter-clockwise in degrees
		presets = []; // λA, φA, γA, λB, φB, γB
		presets[0] = [0, 0, 0, 0, 0, 0];
		presets[1] = [0, -10 , 0, -50, -13, 44];// African and South American Coastlines
		presets[2] = [15, 10, 0, -100, 10, 0];  // Europe - America
		presets[3] = [0, 90, 0, 120, -90, 0];   // Overlaid poles
		diagonal = Math.sqrt(maxDim * maxDim + minDim * minDim);
		yRel = 0;
		xRel = 0;
	}
	function initGradient() {
		if (!!document.createElement('canvas').getContext) {
			gradient = context.createRadialGradient(posX - 0.3 * r, posY - 0.5 * r, 0, posX, posY, r * 1.03);
			gradient.addColorStop(0, "rgba(127, 127, 127, 0)");
			gradient.addColorStop(0.1, "rgba(127, 127, 127, 0.01)");
			gradient.addColorStop(0.3, "rgba(127, 127, 127, 0.02)");
			gradient.addColorStop(0.5, "rgba(127, 127, 127, 0.05)");
			gradient.addColorStop(0.65, "rgba(127, 127, 127, 0.09)");
			gradient.addColorStop(0.75, "rgba(127, 127, 127, 0.14)");
			gradient.addColorStop(0.825, "rgba(127, 127, 127, 0.2)");
			gradient.addColorStop(0.9, "rgba(127, 127, 127, 0.29)");
			gradient.addColorStop(0.95, "rgba(127, 127, 127, 0.42)");
			gradient.addColorStop(0.98, "rgba(127, 127, 127, 0.55)");
			gradient.addColorStop(1, "rgba(127, 127, 127, 0.62)");
		}
		else gradient = "rgba(0, 0, 0, 0)";
	}
	function loadPreset(p) {
		λA = presets[p][0];
		φA = presets[p][1];
		γA = presets[p][2];
		λB = presets[p][3];
		φB = presets[p][4];
		γB = presets[p][5];
	}
	// math functions
	function sign(number) {return number?number<0?-1:1:0}  // sign function (+/-/0) of number http://stackoverflow.com/questions/7624920/number-sign-in-javascript
	function radToDeg(rad) {return rad * radToDegFactor;}
	// Layout helper Functions
	function clearCanvas() {context.clearRect(0, 0, canvas.width, canvas.height);}
	function newLine(newLines) {
		if (lineNumber === undefined) {lineNumber = 0;}
		if (newLines > 1) {
			lineNumber = lineNumber + newLines;
			return lineNumber - newLines;
		}
		else {
			lineNumber++;
			return lineNumber - 1;
		}
	}
	function getX(column) {return origin[0] + (colWidth + gutter) * column;}
	function getXalignRight(column) { return getX(column) + colWidth;}
	function getY(row) {return origin[1] + rowHeight * row;}
	function getYtext(row) {return getY(row) + baselineOffset;}
	function backgroundRect(col, row, cols, rows, fillColor) {
		context.beginPath();
		context.rect(getX(col) - padding, getY(row) - padding, cols * colWidth + (cols - 1) * gutter + padding * 2, rows * rowHeight + padding * 2);
		context.fillStyle = fillColor;
		context.fill();
	}
	function clearBackgroundRect(col, row, cols, rows) {
		var paddingPlus = padding + 1;
		context.clearRect(getX(col) - paddingPlus, getY(row) - paddingPlus, cols * colWidth + (cols - 1) * gutter + paddingPlus * 2, rows * rowHeight + paddingPlus * 2);
	}
	// interaction function
	function handle(Δ) {
		function setScale(s) {
			showGradient = 1;
			scale = s;
			momentumFlag = 0;
			loadGeometry(geometryAtLOD[scale]);
		}
		if (r >= zoomMin && r <= zoomMax) {
			r = r + Δ * (r / 10);
			if (r >= diagonal / 2) {
				clipAngle = 90 - radToDeg(Math.acos((diagonal / 2) / r));
			}
			else {
				clipAngle = 89
			}
			if (r > diagonal && r <= diagonal * 4 && scale != 1) {setScale(1)}
			if (r > diagonal * 4 && scale != 2) {
				showGradient = 1;
				scale = 2;
				momentumFlag = 0;
				loadGeometry(geometryAtLOD[scale]);
			}
			if (r <= diagonal) {
				showGradient = 0;
				initGradient();
				scale = 0;
				momentumFlag = 1;
				loadGeometry(geometryAtLOD[scale]);
			}

			if (r < zoomMin) {
				r = zoomMin
			}
			if (r > zoomMax) {
				r = zoomMax
			}
			drawAll();
		}
	}
	function wheel(event) {
		var delta = 0;
		if (!event) /* For IE. */
			event = window.event;
		if (event.wheelDelta) {
			delta = event.wheelDelta / 120;
		} else if (event.detail) {
			delta = -event.detail / 3;
		}
		if (delta)
			handle(delta);
		if (event.preventDefault)
			event.preventDefault();
		event.returnValue = false;
	}
	function calcTan() { // Calculate Angle from projection center
		var γ, Δx, Δy;
		Δx = x - posX;
		Δy = y - posY;
		γ = radToDeg(-Math.atan2(Δy, Δx));
		return γ;
	}
	function rotate() {
		// TODO: refactor
		// function calcRotation(λ, φ) {λA = λA - xRel / r;}
		if (shiftKeyDown === 0) {
			if (shiftToggle === 0) {
				if (altKeyDown === 0) {
					λA = λA - xRel / r;
					φA = φA + yRel / r;
				}
				if (altKeyDown === 1) {γA = γAtmp + calcTan() - γStart;}
			}
			if (shiftToggle === 1) {
				if (altKeyDown === 0) {
					λB = λB - xRel / r;
					φB = φB + yRel / r;
				}
				if (altKeyDown === 1) {γB = γBtmp + calcTan() - γStart;}
			}
		}
		if (shiftKeyDown === 1) {
			if (altKeyDown === 0) {
				λA = λA - xRel / r;
				φA = φA + yRel / r;
				λB = λB - xRel / r;
				φB = φB + yRel / r;
			}
			if (altKeyDown === 1) {
				var diff = calcTan() - γStart;
				γA = γAtmp + diff;
				γB = γBtmp + diff;
			}
		}
	}
	function track(evt) {
		x = evt.offsetX || evt.layerX;
		y = evt.offsetY || evt.layerY;
		if (mouseDown === 1) {
			xRel = x - xTmp;
			yRel = y - yTmp;
			rotate();
			drawAll();
		}
		drawPositionInfo();
	}
	function startTrack(evt) {
		xTmp = evt.offsetX || evt.layerX;
		yTmp = evt.offsetY || evt.layerY;
		mouseDown = 1;
	}
	function stopTrack() {
		mouseDown = 0;
		if (momentumFlag === 1) {
			var refreshIntervalId = setInterval(function () {
				var linearSlowdown = r/500;
				var factorSlowdown = 0.98;
				yRel = (yRel) * factorSlowdown - sign(yRel) * linearSlowdown;
				xRel = (xRel) * factorSlowdown - sign(xRel) * linearSlowdown;
				rotate();
				drawAll();
				if (Math.abs(xRel) < 1 && Math.abs(yRel) < 1 || momentumFlag === 0) {
					clearInterval(refreshIntervalId);
				}
			}, 1000 / 48);
		}
	}
	function toggle(p) {
		if (p === 1) {p = 0;}
		else {p = 1;}
		return p;
	}
	function keyDown(evt) {
		var validKey = 1;
		evt = evt || window.event;
		switch (evt.keyCode) {
			case 16:
				shiftKeyDown = 1;
				shiftToggle = toggle(shiftToggle);
				break;
			case 18: altKeyDown = 1;
				if (γAtmp === undefined || γBtmp === undefined || γStart === undefined) {
					γAtmp = γA;
					γBtmp = γB;
					γStart = calcTan();
				} break;
			case 32: showGlobeB = toggle(showGlobeB); break;// Space
			case 48: loadPreset(0); break;                           // 0
			case 49: loadPreset(1); break;                           // 1
			case 50: loadPreset(2); break;                           // 2
			case 51: loadPreset(3); break;                           // 3
			case 66: showBorders = toggle(showBorders); break;       // B
			case 67: showCoastlines = toggle(showCoastlines); break; // C
			case 68: showGradient = toggle(showGradient); break;     // D
			case 71: showGraticule = toggle(showGraticule); break;   // G
			case 72: showHelp = toggle(showHelp); break;             // H
			case 76: showLakes = toggle(showLakes); break;           // L
			case 77: momentumFlag = toggle(momentumFlag); break;     // M
			case 82: initializeAll(); loadGeometry(); break;         // R
			case 83: switchColors = toggle(switchColors); break;     // S
			default: validKey = 0; break;
		}
		if (validKey === 1) drawAll();
	}
	function keyUp(evt) {
		evt = evt || window.event;
		if (evt.keyCode == 16) {shiftKeyDown = 0;}                             // Shift
		if (evt.keyCode === 18) {                                           // Alt
			altKeyDown = 0;
			xRel = 0;
			yRel = 0;
			γAtmp = undefined;
			γBtmp = undefined;
			γStart = undefined;
		}
	}
	function drawGlobe(λ, φ, γ, fillColor) {
		rotation = [-λ, -φ, γ];
		// tweak projections here
		projection = d3.geo.orthographic().rotate(rotation).scale(r).translate([posX, posY]).clipAngle(clipAngle);
		path = d3.geo.path().projection(projection).context(context);
		context.beginPath();
		context.fillStyle = fillColor;
		path(land);
		context.fill();
		if (showLakes === 1) {
			context.beginPath();
			context.fillStyle = "rgba(255, 255, 255, 0.75)";
			path(lakes);
			context.fill();
		}
		if (showCoastlines === 1) {
			context.beginPath();
			path(coastlines);
			context.strokeStyle = "rgba(0, 0, 0, 0.3)";
			context.stroke();
		}
		if (showBorders === 1) {
			context.beginPath();
			path(borders);
			context.strokeStyle = "rgba(255, 255, 255, 0.5)";
			context.stroke();
		}
		if (showGraticule === 1) {
			context.beginPath();
			path(graticule);
			context.strokeStyle = fillColor;
			context.stroke();
		}
	}
	function drawGlobeAppearance() {
		if (showGradient === 0) {
			context.beginPath();
			context.fillStyle = gradient;
			path(globe);
			context.fill();
		}
		if (showGradient === 1) {
			context.beginPath();
			path(globe);
			context.strokeStyle = "rgba(0, 0, 0, 0.2)";
			context.stroke();
		}
	}
	function drawPositionInfo() {
		clearBackgroundRect(0, 0, 3, 3);
		backgroundRect(1, 0, 1, 3, fillColorA);
		backgroundRect(2, 0, 1, 3, fillColorB);
		context.fillStyle = "rgba(0, 0, 0, 0.7)";
		if (x !== undefined) {
			context.fillText("x :", getX(0), getYtext(0));
		}
		if (y !== undefined) {
			context.fillText("y :", getX(0), getYtext(1));
		}
		context.fillText("λ :", getX(1), getYtext(0));
		context.fillText("λ :", getX(2), getYtext(0));
		context.fillText("φ :", getX(1), getYtext(1));
		context.fillText("φ :", getX(2), getYtext(1));
		if (γA !== 0) {
			context.fillText("γ :", getX(1), getYtext(2));
		}
		if (γB !== 0) {
			context.fillText("γ :", getX(2), getYtext(2));
		}
		context.textAlign = "right";
		if (x !== undefined) {
			context.fillText(x, getXalignRight(0), getYtext(0));
		}
		if (y !== undefined) {
			context.fillText(y, getXalignRight(0), getYtext(1));
		}
		context.fillText(Math.round(λA), getXalignRight(1), getYtext(0));
		context.fillText(Math.round(λB), getXalignRight(2), getYtext(0));
		context.fillText(Math.round(φA), getXalignRight(1), getYtext(1));
		context.fillText(Math.round(φB), getXalignRight(2), getYtext(1));
		if (γA !== 0) {
			context.fillText(Math.round(γA), getXalignRight(1), getYtext(2));
		}
		if (γB !== 0) {
			context.fillText(Math.round(γB), getXalignRight(2), getYtext(2));
		}
		context.textAlign = "left";
	}
	function drawHelp() {
		lineNumber = 0;
		var xRight = width - canvasPadding;
		context.textAlign = "right";
		context.fillStyle = textColor;
		context.fillText("Drag Mouse to move λ (longitude) and φ (latitude) of projection center", xRight, getYtext(newLine()));
		context.fillText("Zoom with mouse wheel", xRight, getYtext(newLine(2)));
		context.fillText("to switch globe or move both at once: Press/Hold [Shift]", xRight, getYtext(newLine()));
		context.fillText("for rotation γ around center: Hold [Alt]", xRight, getYtext(newLine()));
		context.fillText("disable momentum: [M]", xRight, getYtext(newLine(2)));
		context.fillText("For presets press: [1] - [3]", xRight, getYtext(newLine()));
		context.fillText("reset both globes to origin: [0]", xRight, getYtext(newLine(2)));
		context.fillText("show secondary globe: [Space Bar]", xRight, getYtext(newLine(2)));
		context.fillText("show graticule: [G]", xRight, getYtext(newLine()));
		context.fillText("show land borders: [B]", xRight, getYtext(newLine()));
		context.fillText("show land coastlines: [C]", xRight, getYtext(newLine()));
		context.fillText("show lakes: [L]", xRight, getYtext(newLine()));
		context.fillText("switch globe colors: [S]", xRight, getYtext(newLine()));
		context.fillText("draw style: [D]", xRight, getYtext(newLine(2)));
		context.fillText("reset all [R]", xRight, getYtext(newLine(2)));
		context.fillText("shows/hide this help [H]", xRight, getYtext(newLine()));
		context.textAlign = "left";
	}
	function drawAll() {
		clearCanvas();
		if (switchColors === 1) {
			var tmp;
			tmp = fillColorA;
			fillColorA = fillColorB;
			fillColorB = tmp;
			switchColors = 0;
		}
		drawGlobe(λA, φA, γA, fillColorA);
		if (showGlobeB === 1) {drawGlobe(λB, φB, γB, fillColorB);}
		drawGlobeAppearance();
		if (showPosition === 1) {drawPositionInfo();}
		if (showHelp === 1) {drawHelp();}
	}
	function createGraticule() { // create graticules as GeoJSON on the fly
		var graticuleGeoJson = {type: "FeatureCollection", "features": []}; //declare array
		for (var i = 0; i < 5; i++) {
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
			for (var j = 0; j <= 72; j++) {

				var lonLat = [j * 5 - 180, i * 30 - 60];
				graticuleGeoJson.features[i].geometry.coordinates.push(lonLat);
			}
		}
		return graticuleGeoJson;
	}
	function loadGeometry(topojsonData) {
		if (topojsonData === undefined) {topojsonData = geometryAtStart;}
		d3.json(topojsonData, function (world) {
			globe = {type: "Sphere"};
			land = topojson.object(world, world.objects.land);
			coastlines = topojson.object(world, world.objects.coastline);
			borders = topojson.object(world, world.objects.landborders);
			lakes = topojson.object(world, world.objects.lakes);
			graticule = createGraticule();
			drawAll();
		});
	}

	prepareDocument();
	initializeAll();
	loadGeometry();
    loadPreset(1);
	drawAll();
}