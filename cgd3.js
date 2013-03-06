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
// TODO: Add sample data for feature layer
// Medium
// TODO: skip for-loop when active globe known, use only for moving multiples at once,
// Low priority
// TODO: dynamic canvas size and position by content extent
// TODO: lock axis switches
// TODO: show scale / distance circles / orientation
// TODO: Raster
// TODO: Great circles / Loxodrome from Point A to B
// TODO: Animations > Plate tectonics
// TODO: Sun Terminator
// TODO: Tissot's-Indicatrix (Pseudo/real)

cgd3 = function () {
	"use strict";
	var cgd3 = {version: "0.1.build3"}, debugLevel, globalCompositeOperationType, gco, resetFlag, forceRedraw, animationSpeed, backgroundColor, adminLevel, isFixedLOD, isFixedAdminLevel, mapProjection, element, divElementId, featureJson, globe, bordersA0, land, coastlines, borders, bordersA1, lakes, adminUnits, states, features, graticule, graticuleIntervals, graticuleInterval, fillColor, fillColorDarker, fillColorDarkerA100, fillColorDarkerA75, fillColorDarkerA50, fillColorDarkerA25, fillColorLighter, fillColorLighterA100, fillColorLighterA75, fillColorLighterA50, fillColorLighterA25, fillColorA25, fillColorA50, fillColorA75, fillColorA100, textColor, gradientSphere, gradientSphereColor, globeOutlineColor, darkTone, brightTone, backgroundCanvasColor, refreshColorsInterval, width, height, origin, minSize, maxDim, minDim, diagonal, zoomMin, zoomMax, canvasPadding, globePadding, lineNumber, colWidth, rowHeight, padding, gutter, baselineOffset, formatPrecisionOne, geometryAtLOD, geometryLOD, featureData, topojsonPath, topojsonData, clipAngleMax, clipAngle, presets, rArrays, rArrayDefault, gammaTmp, gammaStart, globalProjection, projections, path, canvas, z, canvasID, canvasDefaultStyle, canvasBackground, canvasGradient, canvasInfo, canvasHelp, canvasGlobe, canvasFeatureGlobe, contextFeatureGlobe, context, contextBackground, contextGradient, contextInfo, contextHelp, contextGlobe, posX, posY, rInit, r, x, y, xTmp, yTmp, xRel, yRel, delta, geoCoordinatesAtMouseCursor, lastClick, doubleClickLengthInMs, maxFPS, frameDuration, colorCycleInterval, momentumFlag, isAnimated, mouseDown, shiftKeyDown, altKeyDown, colorCycleActive, gradientStyle, showGradientZoombased, showGraticule, showBorders, showLakes, showFeatureGlobe, showHelp, showInfo, showCoastlines, updateGlobes, showGlobes, selectedGlobes, lastSelectedGlobes, currentGlobeNumber, pi, radToDegFactor, hueWheel, hueShift, kaleidoscope, numberOfGlobes, lastNumberOfGlobes, showMirror, firstRun;

	// math
	Number.prototype.toDeg = function () {return this * radToDegFactor; };

	function setDefaults() {
		firstRun = 1;
		debugLevel = 0;
		globalCompositeOperationType = ["source-over", "destination-out", "xor"];
		// shorthand for globalCompositeOperation https://developer.mozilla.org/en-US/docs/HTML/Canvas/Tutorial/Compositing
		gco = globalCompositeOperationType;
		numberOfGlobes = 1;
		showMirror = 0;
		doubleClickLengthInMs = 666;
		maxFPS = 60;
		frameDuration = 1000 / maxFPS;
		colorCycleInterval = 1000 / (maxFPS / 2);
		animationSpeed = 30;
		kaleidoscope = 0;
		mouseDown = 0;
		shiftKeyDown = 0;
		altKeyDown = 0;
		colorCycleActive = 0;
		gradientStyle = 1;
		showGradientZoombased = 1;
		showGraticule = 0;
		showBorders = 0;
		showCoastlines = 0;
		showFeatureGlobe = 0;
		showLakes = 0;
		showHelp = 1;
		showInfo = 1;
		momentumFlag = 1;
		isAnimated = 0;
		pi = Math.PI;
		radToDegFactor = 180 / pi;
		divElementId = "map";
	}

	function setGeoDataDefaults() {
		if (!topojsonPath) {topojsonPath = "topojson/"; }
		geometryAtLOD = [];
		// 0 is globe view zoom level
		geometryAtLOD[0] = topojsonPath + "ne_110m_world.json";
		geometryAtLOD[1] = topojsonPath + "ne_50m_world.json";
		geometryAtLOD[2] = topojsonPath + "ne_10m_world.json";
		if (!featureData) {featureData = "topojson/ne_110m_world.json"; }
		if (!featureJson) {featureJson = "a0countrieslakes"; }
		if (!geometryLOD) {geometryLOD = 0; }
		if (!isFixedLOD) {isFixedLOD = 0; }
		if (!isFixedAdminLevel) {isFixedAdminLevel = 0; }
		if (!adminLevel) {adminLevel = 0; }
		// default intervals for graticule resolutions
		graticuleIntervals = [30, 10, 5, 2, 1];
		graticuleInterval = graticuleIntervals[0];
	}
	function createGraticule(interval) { // create graticules as GeoJSON on the fly
		var i, lonLat, pointsPerCircle, pointInterval,
			graticuleGeoJson = {              // create object
				type: "FeatureCollection",
				"features": []                // declare array
			};
		if (interval === undefined) {interval = graticuleInterval; }
		pointsPerCircle = 360 / interval * 3;
		pointInterval = 360 / pointsPerCircle;

		function graticuleJsonTemplate(name, type, value) {
			graticuleGeoJson.features.push({
				"type": "Feature",
				"properties": {
					"name": name,
					"position": value,
					"class": "Graticule",
					"type": type
				},
				"geometry": {
					"type": "LineString",
					"coordinates": [ ]
				}
			});
		}
		function createCirclesOfLatitude() {
			function createCircleOfLatitude() {
				var j;
				for (j = 0; j <= pointsPerCircle; j += 1) {
					lonLat = [j * pointInterval - 180, (i + 1) * interval - 90];
					graticuleGeoJson.features[i].geometry.coordinates.push(lonLat);
				}
			}
			for (i = 0; i < 180 / interval - 1; i += 1) {
				graticuleJsonTemplate("Circle of Latitude at " + ((i + 1) * interval - 90), "Circle of Latitude", ((i + 1) * interval - 90));
				createCircleOfLatitude();
			}
		}
		function createMeridians() {
			var k, kMax = 360 / interval;
			function createMeridian() {
				var l;
				for (l = 0; l <= pointsPerCircle / 2; l += 1) {
					// less lines at poles
					if ((l * pointInterval >= interval * 10 && l * pointInterval <= 180 - interval * 10) ||
						// no 1°meridians up to 10°/20° based on interval
							(l * pointInterval >= interval * 6 && l * pointInterval <= 180 - interval * 6 && (k * interval) % 5 === 0) ||
							// keep 5° up to 30° based on interval
							(l * pointInterval >= interval * 3 && l * pointInterval <= 180 - interval * 3 && (k * interval) % 10 === 0) ||
							// keep 10° up to 30° based on interval
							(l * pointInterval >= interval && l * pointInterval <= 180 - interval && (k * interval) % 30 === 0) ||
							// keep 30° up to 30° based on interval
							(k * interval) % 90 === 0
							// always keep 90°
							) {
						lonLat = [k * interval - 180, l * pointInterval - 90];
						graticuleGeoJson.features[i + k].geometry.coordinates.push(lonLat);
					}
				}
			}
			for (k = 0; k < kMax; k += 1) {
				graticuleJsonTemplate("Meridian at " + (k * interval - 180), "Meridian", (k * interval - 180));
				createMeridian();
			}
		}
		createCirclesOfLatitude();
		createMeridians();
		return graticuleGeoJson;
	}
	function initializeLayout() {
		if (debugLevel > 0) {console.log("initializeLayout()"); }
		canvasPadding = minDim / 25;
		globePadding = canvasPadding * 0.61;
		posX = width / 2;
		posY = height / 2;
		x = posX;
		y = posY;
		rInit = minDim / 2 - globePadding;
		if (!r || resetFlag) {r = rInit; }
		formatPrecisionOne = d3.format(".1f");
		colWidth = 43;
		rowHeight = 12;
		padding = 3;
		gutter = 15;
		lineNumber = 0;
		origin = [canvasPadding, canvasPadding];
		baselineOffset = 9;
	}
	cgd3.setR = function (factor, absolute) {
		if (!absolute) {r = r * factor; }
		// if absolute is 1 set directly
		if (absolute) {r = factor; }
	};

	cgd3.getR = function () {
		return r;
	};

	function createColorWheel() {
		var i, hue, darker, lighter,
			hueAngle = 360 / numberOfGlobes,
			saturation = 70,
			lightness = 48,
			alpha = 1 / Math.sqrt(numberOfGlobes);
		if (debugLevel > 0) {console.log("createColorWheel()"); }
		function hslaString(hue, saturation, lightness, alpha) {
			return "hsla(" + hue + ", " + saturation + "%, " + lightness + "%, " + alpha + ")";
		}
		if (hueShift === undefined) {hueShift = 0; }
		darker = lightness / 2;
		lighter = 100 - (100 - lightness) / 2;
		for (i = 0; i < numberOfGlobes; i += 1) {
			if (fillColor[i] !== undefined || hueWheel) {
				hue = (hueShift + hueAngle * i) % 360;
				fillColor[i] = hslaString(hue, saturation, lightness, alpha);
				fillColorA100[i] = hslaString(hue, saturation, lightness, 1);
				fillColorA75[i] = hslaString(hue, saturation, lightness, 0.75);
				fillColorA50[i] = hslaString(hue, saturation, lightness, 0.5);
				fillColorA25[i] = hslaString(hue, saturation, lightness, 0.25);
				fillColorDarker[i] = hslaString(hue, saturation, darker, alpha);
				fillColorDarkerA100[i] = hslaString(hue, saturation, darker, 1);
				fillColorDarkerA75[i] =  hslaString(hue, saturation, darker, 0.75);
				fillColorDarkerA50[i] =  hslaString(hue, saturation, darker, 0.50);
				fillColorDarkerA25[i] =  hslaString(hue, saturation, darker, 0.25);
				fillColorLighter[i] = hslaString(hue, saturation, lighter, alpha);
				fillColorLighterA100[i] = hslaString(hue, saturation, lighter, 1);
				fillColorLighterA75[i] = hslaString(hue, saturation, lighter, 0.75);
				fillColorLighterA50[i] = hslaString(hue, saturation, lighter, 0.5);
				fillColorLighterA25[i] = hslaString(hue, saturation, lighter, 0.25);
			}
		}
		if (debugLevel > 1) {console.log(" └─ hueAngle:", hueAngle, "hueStart:", hueShift, "fillColor[]:", fillColor); }
	}
	function initializeColors() {
		if (debugLevel > 0) {console.log("initializeColors()"); }
		darkTone = "rgba(26, 17, 16, 1)";
		brightTone = "hsla(240, 100%, 99%, 1)";
		// ColorBrewer: RdYlBu
		// Rd "rgba(215, 25, 28, 0.5)";
		// Bu = "rgba(44, 123, 182, 0.5)";
		fillColor = [];
		fillColorA25 = [];
		fillColorA50 = [];
		fillColorA75 = [];
		fillColorA100 = [];
		fillColorLighter = [];
		fillColorLighterA100 = [];
		fillColorLighterA75 = [];
		fillColorLighterA50 = [];
		fillColorLighterA25 = [];
		fillColorDarker = [];
		fillColorDarkerA100 = [];
		fillColorDarkerA75 = [];
		fillColorDarkerA50 = [];
		fillColorDarkerA25 = [];
		globeOutlineColor = "rgba(0, 0, 0, 0.2)";
		backgroundColor = darkTone;
		backgroundCanvasColor = brightTone;
		// hueShift overrides predefined colors with computed hue at max angle
		hueShift = 10;
		hueWheel = 1;
		// create colors along hue circle
		createColorWheel();
		textColor = darkTone;
		gradientSphereColor = "rgba(80, 80, 100, 0.5)";

	}
	cgd3.setClipAngle = function (angle, angleMax) {
		clipAngle = angle;
		if (!angleMax) {clipAngleMax = angle; } else {clipAngleMax = angleMax; }
	};

	function definePresets() {
		presets = []; // [[λ, φ, γ], [ λ, φ, γ]]
		presets[0] = [
			[0, 0, 0],
			[0, 0, 0]
		];
		presets[1] = [     // African and South American Coastlines
			[0, -10, 0],
			[-50, -13, 44]
		];
		presets[2] = [     // Europe - America
			[15, 40, 0],
			[-100, 40, 0]
		];
		presets[3] = [     // Overlaid poles
			[0, 90, 0],
			[120, -90, 0]
		];
		presets[4] = [     // Europe - Australia
			[15, 40, 0],
			[-45, -140, 0]
		];
		presets[5] = [     // America - Australia
			[-100, 40, 0],
			[-45, -140, 0]
		];
		presets[6] = [     // USA - China
			[-100, 40, 0],
			[100, 40, 0]
		];
		presets[7] = [     // USA - Russia
			[-100, 40, 0],
			[60, 40, 0]
		];
		presets[8] = [     // Europe - China
			[15, 40, 0],
			[100, 40, 0]
		];
		presets[9] = [     // Australia - Antarctica tectonics
			[130, -35, 0],
			[135, -67, 0]
		];
	}

	function initializeProjection() {
		if (debugLevel > 0) {console.log("initializeProjection()"); }
		if (debugLevel > 1) {console.log(" └─ rArrays[]:", rArrays); }
		rArrays = [];
		rArrayDefault = [0, 0, 0];
		if (!clipAngleMax || resetFlag) {clipAngleMax = 88; }
		if (!clipAngle || resetFlag) {clipAngle = clipAngleMax; }
		zoomMin = 10;
		zoomMax = 10000;
		delta = 0;
		// λ (longitude) and φ (latitude) of projection center, (γ) rotation angle counter-clockwise in degrees
		diagonal = Math.sqrt(maxDim * maxDim + minDim * minDim);
		yRel = 0;
		xRel = 0;
		xTmp = 0;
		yTmp = 0;
		// set global projection mode here:
		if (!mapProjection) { mapProjection = "orthographic"; }
		globalProjection = d3.geo[mapProjection]();
		// init projections array
		projections = [];
	}

	cgd3.setMapProjection = function (projectionNameString) {
		mapProjection = projectionNameString;
		globalProjection = d3.geo[mapProjection]();
	};

	cgd3.setFixedLOD = function (booleanValue, lod) {
		isFixedLOD = booleanValue;
		if (!lod) {geometryLOD = lod; }
		setGeoDataDefaults();
	};

	cgd3.setFixedAdminLevel = function (booleanValue, level) {
		isFixedAdminLevel = booleanValue;
		if (!level) {adminLevel = level; }
		setGeoDataDefaults();
	};

	cgd3.cycleMapProjection = function (increment) {
		var availableMapProjections = [
				//built in
				"mercator",
				"orthographic",
				"albers",
				//"albersUsa",
				"azimuthalEqualArea",
				"azimuthalEquidistant",
				"equirectangular",
				"gnomonic",
				"stereographic",
				//
				"aitoff",
				"armadillo",
				"august",
				"baker",
				"berghaus",
				"boggs",
				"bonne",
				"bonneHeart",
				"bromley",
				"collignon",
				"conic-conformal",
				"conic-equidistant",
				"craig",
				"craster",
				"cylindrical-equal-area",
				"eckert1",
				"eckert2",
				"eckert3",
				"eckert4",
				"eckert5",
				"eckert6",
				"eisenlohr",
				"end",
				"fahey",
				"gringorten",
				"guyou",
				"hammer",
				"hammer-retroazimuthal",
				"hatano",
				"healpix",
				"hill",
				"homolosine",
				"interrupt",
				"kavrayskiy7",
				"lagrange",
				"larrivee",
				"laskowski",
				"littrow",
				"loximuthal",
				"miller",
				"modified-stereographic",
				"mollweide",
				"mt-flat-polar-parabolic",
				"mt-flat-polar-quartic",
				"mt-flat-polar-sinusoidal",
				"natural-earth",
				"nell-hammer",
				"parallel1",
				"parallel2",
				"peirce-quincuncial",
				"polyconic",
				"projection",
				"README",
				"rectangular-polyconic",
				"robinson",
				"satellite",
				"sinu-mollweide",
				"sinusoidal",
				"start",
				"times",
				"two-point-azimuthal",
				"two-point-equidistant",
				"van-der-grinten",
				"van-der-grinten2",
				"van-der-grinten3",
				"van-der-grinten4",
				"wagner4",
				"wagner6",
				"wagner7",
				"wiechel",
				"winkel3"
			],
			i = availableMapProjections.indexOf(mapProjection),
			l = availableMapProjections.length;
		if (i >= 0) {
			if (!increment) {increment = 1; }
			mapProjection = availableMapProjections[(i + increment) % l];
			globalProjection = d3.geo[mapProjection]();
			// TODO Load size presets (clipAngle etc...) based on projection
			console.info("current Map projection: " + mapProjection);
			clearCanvas(contextBackground);
			gradientStyle = 2;
			drawAll();
		}
	};

	function initializeGlobes() {
		var i;
		if (debugLevel > 0) {console.log("initializeGlobes()"); }
		for (i = 0; i < numberOfGlobes; i += 1) {
			if (rArrays[i] === undefined) {rArrays[i] = rArrayDefault; }
		}
		showGlobes = initializeArray(numberOfGlobes, 1);
		updateGlobes = initializeArray(numberOfGlobes, 1);
		selectedGlobes = initializeArray(numberOfGlobes, 0);
		// select first globe
		selectedGlobes[0] = 1;
		if (debugLevel > 1) {console.log("Globes -- selected:", selectedGlobes, "show:", showGlobes, "update:", updateGlobes); }
	}

	function selectGlobe(i) {
		//	if (!shiftKeyDown) {
		if (debugLevel > 0) {console.log("selectGlobe()"); }
		if (debugLevel > 1) {console.log("selectedGlobes", selectedGlobes); }
		selectedGlobes = setAllArrayValues(selectedGlobes, 0);
		selectedGlobes[i] = 1;
		if (debugLevel > 1) {console.log("selectedGlobes", selectedGlobes); }
		//	}
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
	function handleGlobes() {
		var i,
			selected = selectedGlobes.indexOf(1),
			angle = 360 / numberOfGlobes;
		if (lastNumberOfGlobes === undefined) {lastNumberOfGlobes = 1; }
		if (debugLevel > 0) {console.log("handleGlobe()", lastNumberOfGlobes); }
		if (kaleidoscope) {
			for (i = 1; i < numberOfGlobes; i += 1) {
				rArrays[i] = [rArrays[0][0], rArrays[0][1], (rArrays[0][2] + angle * i) % 360 ];
			}
			initializeGlobes();
			selectAllGlobes();
			// add
		} else if (lastNumberOfGlobes < numberOfGlobes) {
			for (i = lastNumberOfGlobes; i < numberOfGlobes; i += 1) {
				if (rArrays[i] === undefined) {
					rArrays[i] = [rArrays[selected][0], rArrays[selected][1], rArrays[selected][2]];
				}
				if (debugLevel > 0) {console.log(" └─ add", lastNumberOfGlobes, numberOfGlobes, i, selectedGlobes); }
				initializeGlobes();
				selectGlobe(i);
			}
			// remove
		} else if (lastNumberOfGlobes > numberOfGlobes) {
			for (i = lastNumberOfGlobes; i >= numberOfGlobes; i -= 1) {
				rArrays[i] = undefined;
				if (debugLevel > 0) {console.log(" └─ remove", lastNumberOfGlobes, numberOfGlobes, i, selectedGlobes); }
				initializeGlobes();
				if (selected < numberOfGlobes) {
					selectGlobe(selected);
				} else {
					selectGlobe(numberOfGlobes - 1);
				}
			}
		}
		lastNumberOfGlobes = numberOfGlobes;
		if (debugLevel > 1) {console.log(" └─ rArrays[]:", rArrays); }
	}
	function initializeAll() {
		initializeLayout();
		initializeColors();
		definePresets();
		initializeProjection();
		initializeGlobes();
		handleGlobes();
	}
	function createGradientSphere() {
		gradientSphere = contextGradient.createRadialGradient(posX - 0.3 * r, posY - 0.5 * r, 0, posX, posY, r * 1.03);
		gradientSphere.addColorStop(0   , gradientSphereColor.setAlpha(0   ));
		gradientSphere.addColorStop(0.1 , gradientSphereColor.setAlpha(0.01));
		gradientSphere.addColorStop(0.3 , gradientSphereColor.setAlpha(0.02));
		gradientSphere.addColorStop(0.5 , gradientSphereColor.setAlpha(0.05));
		gradientSphere.addColorStop(0.65, gradientSphereColor.setAlpha(0.09));
		gradientSphere.addColorStop(0.75, gradientSphereColor.setAlpha(0.14));
		gradientSphere.addColorStop(0.83, gradientSphereColor.setAlpha(0.2 ));
		gradientSphere.addColorStop(0.9 , gradientSphereColor.setAlpha(0.29));
		gradientSphere.addColorStop(0.95, gradientSphereColor.setAlpha(0.42));
		gradientSphere.addColorStop(0.98, gradientSphereColor.setAlpha(0.55));
		gradientSphere.addColorStop(1   , gradientSphereColor.setAlpha(0.62));
	}

	function calcTan() { // Calculate Angle from projection center
		var gamma, deltaX, deltaY;
		deltaX = x - posX;
		deltaY = y - posY;
		gamma = (-Math.atan2(deltaY, deltaX)).toDeg();
		return gamma;
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
	function clearBackgroundRect(col, row, cols, rows, localContext, noPadding) {
		var paddingPlus = padding + 1;
		if (noPadding) {
			localContext.clearRect(getX(col), getY(row), cols * colWidth + (cols - 1) * gutter,
				rows * rowHeight);
		} else {
			localContext.clearRect(getX(col) - paddingPlus, getY(row) - paddingPlus,
				cols * colWidth + (cols - 1) * gutter + paddingPlus * 2, rows * rowHeight + paddingPlus * 2);
		}
	}
	function drawFilledPath(context, path, pathName) {
		context.beginPath();
		path(pathName);
		context.fill();
	}
	function drawStrokedPath(context, path, pathName) {
		context.beginPath();
		path(pathName);
		context.stroke();
	}

	// Draw to canvas
	function drawInfo() {
		// TODO may be optimized by splitting into background and number display
		// and updating only the changes of active globe,
		// or by moving this completely to html
		//clearCanvas(contextInfo);
		if (showInfo) {
			var i, col, xLeft, xRight, lambda, phi, gamma,
				xZero = getX(0),
				xZeroRight = getXalignRight(0),
				yA = getYtext(0),
				yB = getYtext(1),
				yC = getYtext(2),
				yD = getYtext(3),
				yE = getYtext(4);
			// projection
			if (forceRedraw) {
				clearBackgroundRect(0, 4, 4, 1, contextInfo, 1);
				contextInfo.fillText("Map Projection: " + mapProjection, xZero, yE);
			}
			// Draw lon/lat mouse position
			if (geoCoordinatesAtMouseCursor !== undefined && !isNaN(geoCoordinatesAtMouseCursor[0]) && !isNaN(geoCoordinatesAtMouseCursor[1])) {
				clearBackgroundRect(0, 0, 1, 2, contextInfo);
				backgroundRect(0, 0, 1, 2, fillColor[currentGlobeNumber], contextInfo);
				contextInfo.fillStyle = textColor;
				contextInfo.fillText("φ", xZero, yA);
				contextInfo.textAlign = "right";
				contextInfo.fillText(formatPrecisionOne(geoCoordinatesAtMouseCursor[1]), xZeroRight, yA);
				contextInfo.textAlign = "left";
				contextInfo.fillText("λ", xZero, yB);
				contextInfo.textAlign = "right";
				contextInfo.fillText(formatPrecisionOne(geoCoordinatesAtMouseCursor[0]), xZeroRight, yB);
				contextInfo.textAlign = "left";
			}
			// Draw X/Y mouse position in debug mode
			contextInfo.fillStyle = textColor;
			if (debugLevel > 0) {
				clearBackgroundRect(0, 2, 1, 2, contextInfo, 1);
				if (typeof x === "number") {
					contextInfo.fillText("x", xZero, yC);
					contextInfo.textAlign = "right";
					contextInfo.fillText(x, xZeroRight, yC);
					contextInfo.textAlign = "left";
				}
				if (typeof y === "number") {
					contextInfo.fillText("y", xZero, yD);
					contextInfo.textAlign = "right";
					contextInfo.fillText(y, xZeroRight, yD);
					contextInfo.textAlign = "left";
				}
			}

			for (i = 0; i < numberOfGlobes; i += 1) {
				if (selectedGlobes[i] || isAnimated || forceRedraw) {
					lambda = (rArrays[i][0] + 180).mod(360) - 180;
					phi = (rArrays[i][1] + 180).mod(360) - 180;
					gamma = rArrays[i][2].mod(360);
					col = i + 1;
					xLeft = getX(col);
					xRight = getXalignRight(col);
					clearBackgroundRect(col, 0, 1, 3, contextInfo);
					if (gamma !== 0) {backgroundRect(col, 0, 1, 3, fillColor[i], contextInfo);
						} else {backgroundRect(col, 0, 1, 2, fillColor[i], contextInfo); }
					contextInfo.fillStyle = textColor;
					contextInfo.fillText("φ₀", xLeft, yA);
					contextInfo.fillText("λ₀", xLeft, yB);
					if (gamma !== 0) {contextInfo.fillText("γ₀", xLeft, yC); }
					contextInfo.textAlign = "right";
					contextInfo.fillText(formatPrecisionOne(phi), xRight, yA);
					contextInfo.fillText(formatPrecisionOne(lambda), xRight, yB);
					if (gamma !== 0) {contextInfo.fillText(formatPrecisionOne(gamma), xRight, yC); }
					contextInfo.textAlign = "left";
				}
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
			contextHelp.fillText("Click to go to position", xRight, getYtext(newLine()));
			contextHelp.fillText("Zoom with mouse wheel", xRight, getYtext(newLine(2)));

			contextHelp.fillText("To switch globe or move all at once:  Press/Hold [Shift]", xRight, getYtext(newLine()));
			contextHelp.fillText("For rotation γ (gamma) around center: Drag Mouse and  Hold [Alt]", xRight, getYtext(newLine()));
			contextHelp.fillText("Start/Stop Animation:  [A]", xRight, getYtext(newLine()));
			contextHelp.fillText("Disable Momentum:  [M]", xRight, getYtext(newLine(2)));

			contextHelp.fillText("For presets press:  [1] - [9]", xRight, getYtext(newLine()));
			contextHelp.fillText("Reset globes to origin:  [0]", xRight, getYtext(newLine(2)));

			contextHelp.fillText("Show/hide secondary globes:  [Space Bar]", xRight, getYtext(newLine()));
			contextHelp.fillText("Add/Remove additional globes:  [=]/[-]", xRight, getYtext(newLine()));
			contextHelp.fillText("New globes are added with rotation:  [K]", xRight, getYtext(newLine()));
			contextHelp.fillText("Show transparent globe  [T]", xRight, getYtext(newLine(2)));
			contextHelp.fillText("Switch between projections (experimental) [O][P]", xRight, getYtext(newLine()));

			contextHelp.fillText("Show/hide Graticule:  [G]", xRight, getYtext(newLine()));
			contextHelp.fillText("Show/hide land Borders:  [B]", xRight, getYtext(newLine()));
			contextHelp.fillText("Coastlines only (faster):  [C]", xRight, getYtext(newLine()));
			contextHelp.fillText("Show/hide Lakes:  [L]", xRight, getYtext(newLine()));
			contextHelp.fillText("Cycle globe colors:  [S]", xRight, getYtext(newLine()));
			contextHelp.fillText("Draw shadow decoration:  [D]", xRight, getYtext(newLine(2)));

			contextHelp.fillText("Show/hide position Info:  [I]", xRight, getYtext(newLine()));
			contextHelp.fillText("Reset all:  [R]", xRight, getYtext(newLine(2)));

			contextHelp.fillText("Show/hide Help:  [H]", xRight, getYtext(newLine()));
			contextHelp.textAlign = "left";
		}
	}

	function drawLand(ctx, path, fLand, fLakes, fBordersA0, fBordersA1, sLand, sBordersA0, sBordersA1) {
		if (!showCoastlines) {
			ctx.fillStyle = fLand;
			drawFilledPath(ctx, path, land);
			ctx.globalCompositeOperation = gco[1];
			// subtract lakes and borders from continents
			if (showLakes) {
				ctx.fillStyle = fLakes;
				drawFilledPath(ctx, path, lakes);
			}
			if (showBorders > 0) {
				ctx.strokeStyle = fBordersA0;
				drawStrokedPath(ctx, path, bordersA0);
				if (showBorders > 1) {
					ctx.strokeStyle = fBordersA1;
					drawStrokedPath(ctx, path, bordersA1);
				}
			}
			ctx.globalCompositeOperation = gco[0];
		} else {
			ctx.strokeStyle = sLand;
			drawStrokedPath(ctx, path, coastlines);
			if (showLakes) {
				drawStrokedPath(ctx, path, lakes);
			}
			if (showBorders > 0) {
				ctx.strokeStyle = sBordersA0;
				drawStrokedPath(ctx, path, bordersA0);
				if (showBorders > 1) {
					ctx.strokeStyle = sBordersA1;
					drawStrokedPath(ctx, path, bordersA1);
				}
			}
		}
	}

	function drawGraticule(ctx, path, strokeStyle) {
		if (showGraticule) {
			ctx.strokeStyle = strokeStyle; // set graticule width with alpha:
			drawStrokedPath(ctx, path, graticule);
		}
	}

	function drawGlobeBackside(ctx, i) {
		var rotMirror, prjMirror, tmp;
		// flip canvas
		ctx.translate(width, 0);
		ctx.scale(-1, 1);
		// mirrored mode
		// set center to antipode inverse rotation
		rotMirror = [-(rArrays[i][0]) + 180, (rArrays[i][1]), -rArrays[i][2]];
		prjMirror = globalProjection
			.translate([posX, posY])
			.rotate(rotMirror)
			.clipAngle(clipAngle).scale(r);
		path = d3.geo.path().projection(prjMirror).context(ctx);
		tmp = showLakes;
		showLakes = 0;
		drawLand(ctx, path, fillColorDarkerA75[i], fillColorA100[i], fillColorA75[i], fillColorA25[i], fillColorA50[i], fillColorA50[i], fillColorA25[i]);
		drawGraticule(ctx, path, fillColorA25[i]);
		showLakes = tmp;
		// flip back to normal
		ctx.translate(width, 0);
		ctx.scale(-1, 1);

	}

	function bonneHeart(ctx, i) {
		var xOffset = r * 1.321, // TODO: factor is guesswork so far should be derived from projection
			offset = 90,
			heartColor = "rgba(255, 192, 203,1)";
		function bonneHeartHalf(sign) {
			var rot = [-(rArrays[i][0]) - sign * 90, 0, rArrays[i][2]],
				prj = d3.geo.bonneHeart()
					.translate([posX + sign * xOffset, posY])
					.rotate(rot)
					.parallel(sign * offset)
					.clipAngle(clipAngle).scale(r);

			path = d3.geo.path().projection(prj).context(ctx);
			// Filled Style
			drawLand(ctx, path, heartColor, fillColorA100[i], fillColorA75[i], fillColorA75[i], fillColorA25[i]);
			drawGraticule(ctx, path, "rgba(255, 192, 203,0.25)");
		}
		// disallow mirror mode
		if (showMirror) {showMirror = 0; }
		clipAngle = 89.99999999;
		// Since clipping drove me nuts this map is rendered in two parts each shifted by +/-90 degrees and clipped by 90 degrees
		bonneHeartHalf(1);
		bonneHeartHalf(-1);

	}

	function drawGlobe(i) {
		if (debugLevel > 0) {console.log("drawGlobe(i):", i); }
		// -λ, -φ, γ
		var ctx, rot, prj;
		ctx = contextGlobe[i];
		clearCanvas(ctx);
		if (showMirror) {drawGlobeBackside(ctx, i); }
		if (mapProjection === "bonneHeart") {bonneHeart(ctx, i);
			} else {
			rot = [-(rArrays[i][0]), -(rArrays[i][1]), rArrays[i][2]];
			// tweak projections here
			prj = globalProjection
				.translate([posX, posY])
				.rotate(rot)
				.clipAngle(clipAngle).scale(r);

			path = d3.geo.path().projection(prj).context(ctx);
			// Filled Style
			drawLand(ctx, path, fillColor[i], fillColorA100[i], fillColorA75[i], fillColorA25[i], fillColorA75[i], fillColorA50[i], fillColorA25[i]);
			drawGraticule(ctx, path, fillColorDarkerA25[i]);
		}
	}
	function drawFeatureGlobe() {
		if (showFeatureGlobe) {
			if (debugLevel > 0) {console.log("drawFeatureGlobe()"); }
			// -λ, -φ, γ
			var ctx, rot, prj;
			ctx = contextFeatureGlobe;
			rot = [-(rArrays[0][0]), (-rArrays[0][1]), rArrays[0][2]];
			// tweak projections here
			prj = globalProjection
				.translate([posX, posY])
				.rotate(rot)
				.clipAngle(clipAngle).scale(r);
			clearCanvas(ctx);
			path = d3.geo.path().projection(prj).context(ctx);
			// Filled Style
			ctx.fillStyle = fillColorDarkerA50[0];
			drawStrokedPath(ctx, path, features);
		}
	}
	function drawGlobes() {
		if (debugLevel > 0) {console.log("drawGlobes()", "updateGlobes[]", updateGlobes); }
		if (debugLevel > 1) {console.log("updateGlobes[]", updateGlobes); }
		var i;
		for (i = 0; i < numberOfGlobes; i += 1) {
			if (showGlobes[i] && (selectedGlobes[i] || updateGlobes[i])) {
				currentGlobeNumber = selectedGlobes.indexOf(1);
				drawGlobe(i);
				drawFeatureGlobe();
				updateGlobes[i] = 0;
			}
		}
	}
	function drawGradient() {
		var ctx = contextGradient, rot, prj, offset = 1.321;
		if (debugLevel > 0) {console.log("drawGradient()"); }
		if (debugLevel > 1) {console.log("contextGradient:", ctx); }
		clearCanvas(ctx);
		if (mapProjection === "bonneHeart") {
			ctx = contextBackground;
			clearCanvas(ctx);
			ctx.fillStyle = "rgba(224,17,95,1)";
			prj = d3.geo.bonneHeart().parallel(-90).translate([posX - r * offset, posY]).clipAngle(90).scale(r);
			path = d3.geo.path().projection(prj).context(ctx);
			drawFilledPath(ctx, path, globe);
			prj = d3.geo.bonneHeart().parallel(90).translate([posX + r * offset, posY]).clipAngle(90).scale(r);
			path = d3.geo.path().projection(prj).context(ctx);
			drawFilledPath(ctx, path, globe);
			if (debugLevel > 1) {console.log(" └─ Heart", "fillStyle:", ctx.fillColor); }
		} else {
			// might beneficial to store rotation globally
			rot = [-(rArrays[0][0]), (-rArrays[0][1]), rArrays[0][2]];
			// tweak projections here
			prj = globalProjection
			//.translate([posX, posY])
				.rotate(rot)
				.clipAngle(clipAngle).scale(r);
			if (gradientStyle !== 0) {
				path = d3.geo.path().projection(prj).context(ctx);
				// draw gradient
				if (gradientStyle === 1 && showGradientZoombased) {
					createGradientSphere();
					ctx.fillStyle = gradientSphere;
					drawFilledPath(ctx, path, globe);
					if (debugLevel > 1) {console.log(" └─ Gradient", "fillStyle:", ctx.fillStyle); }
				}
				// draw outline only
				if (gradientStyle === 2 || !showGradientZoombased) {
					ctx.strokeStyle = globeOutlineColor;
					drawStrokedPath(ctx, path, globe);
					if (debugLevel > 1) {console.log(" └─ Outline", "strokeStyle:", ctx.strokeStyle); }
				}
			}
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

	function drawMap() {
		if (debugLevel > 0) {console.log("drawMap()"); }
		drawAllGlobes();
		drawFeatureGlobe();
		drawGradient();
	}

	function drawAll() {
		if (debugLevel > 0) {console.log("drawAll()"); }
		forceRedraw = 1;
		contextBackground.fillStyle = backgroundCanvasColor;
		contextBackground.fillRect(0, 0, width, height);
		drawMap();
		drawInfo();
		drawHelp();
		forceRedraw = 0;
	}
	function loadGeometry() {
		if (debugLevel > 0) {console.log("loadGeometry()"); }
		d3.json(topojsonData, function (error, json) {
			if (debugLevel > 0) {console.log("d3.json"); }
			if (error) {console.log(error); }
			globe = {type: "Sphere"};
			/** @namespace json.objects.land */
			/** @namespace json.objects.coastline */
			/** @namespace json.objects.a0borders*/
			/** @namespace json.objects.a1borders*/
			/** @namespace json.objects.lakes */
			/** @namespace json.objects.a0countrieslakes */
			/** @namespace json.objects.a1countrieslakes */
			if (!error) {
				land = topojson.object(json, json.objects.land);
				if (adminLevel === 0) {
					borders = topojson.object(json, json.objects.a0borders);
					adminUnits = topojson.object(json, json.objects.a0countrieslakes);
				}
				if (adminLevel === 1) {
					borders = topojson.object(json, json.objects.a1borders);
					adminUnits = topojson.object(json, json.objects.a1countrieslakes);
				}
				// TODO add lat lon bounding boxes to geojson objects
				// preferably with terraformer.js or own function
				//var landbounds = eachGeometry(land, calculateBounds);
				//console.log(landbounds);
				coastlines = topojson.object(json, json.objects.coastline);
				bordersA0 = topojson.object(json, json.objects.a0borders);
				bordersA1 = topojson.object(json, json.objects.a1borders);
				states = topojson.object(json, json.objects.a1countrieslakes);
				lakes = topojson.object(json, json.objects.lakes);
			}
			graticule = createGraticule(graticuleInterval);
			if (firstRun) {drawAll(); firstRun = 0; }
		});
		d3.json(featureData, function (error, json) {
			// TODO 2nd json-file should be appended to first loop
			// console.log(featureData);
			if (debugLevel > 0) {console.log("d3.json - features"); }
			if (error) {console.log(error); }
			if (!error) {features = topojson.object(json, json.objects[featureJson]); }
		});
	}
	function setGeometryLOD(lod, forceNoGradientAtLOD, noMomentumAtLOD) {
		// TODO decouple gradient switch from LOD
		if (geometryLOD !== lod) {
			if (lod === undefined) {lod = geometryLOD; }
			geometryLOD = lod;
			if (forceNoGradientAtLOD) {
				showGradientZoombased = 0;
			} else {showGradientZoombased = 1; }
			if (noMomentumAtLOD) {
				momentumFlag = 0;
			} else {momentumFlag = 1; }
			// fallback to lowest level
			if (geometryAtLOD[geometryLOD] === undefined) {geometryLOD = 0; }
			topojsonData = geometryAtLOD[geometryLOD];
			loadGeometry();
		}
	}

	// interaction functions
	function d3MousePosition() {
		var last = geoCoordinatesAtMouseCursor;
		// TODO: figure out a way to read out all active projections independently
		if (globalProjection !== undefined) {
			geoCoordinatesAtMouseCursor = globalProjection.invert(d3.mouse(element));
			if (debugLevel > 1) {
				console.log("d3MousePosition()", currentGlobeNumber, projections[currentGlobeNumber].invert(d3.mouse(element)));
			}
		}
		if (last !== geoCoordinatesAtMouseCursor) {
			drawInfo();
		}
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
			if (!isAnimated) {drawGlobes(); }
		}
		if (!isAnimated) {drawInfo(); }
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
		// mouse drag
		if (momentumFlag) {
			refreshIntervalId = setInterval(function () {
				yRel = (yRel) * factorSlowdown - yRel.sign() * linearSlowdown;
				xRel = (xRel) * factorSlowdown - xRel.sign() * linearSlowdown;
				rotate();
				if (!isAnimated) {
					drawGlobes();
					drawInfo();
				}
				if ((Math.abs(xRel) < 1 && Math.abs(yRel) < 1) || !momentumFlag) {clearInterval(refreshIntervalId); }
			}, frameDuration);
		}
	}
	cgd3.rotateToPosition = function (lonLat) {
		var endPosition = [], refreshIntervalId, steps, cosFactor, stepLon, stepLat,
			i = 0,
			rStart = rArrays[currentGlobeNumber],
			fullRotLon = Math.floor((rStart[0] + 180) / 360), dLon, dLat;

		if (!lonLat) {
			endPosition = geoCoordinatesAtMouseCursor;
		} else {
			endPosition = lonLat;
		}
		dLon = ((fullRotLon * 360 + endPosition[0]) - rStart[0]);
		dLat = (endPosition[1] - rStart[1]);
		if (debugLevel > 0) {console.log("rotateToPosition"); }
		if (!isNaN(endPosition[0]) && !isNaN(endPosition[1])) {
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
				if (!isAnimated) {
					drawGlobe(currentGlobeNumber);
					drawInfo();
				}
				if (i >= steps) {clearInterval(refreshIntervalId); }
			}, frameDuration);
		}
	};
	function shiftColors() {
		hueShift = (hueShift - 360 / numberOfGlobes) % 360;
		createColorWheel();
		drawAllGlobes();
		drawInfo();
	}
	function cycleColors() {
		// shift hue if one globe present, cycle when hold;
		var hueShiftTmp = hueShift;
		if (numberOfGlobes === 1) {
			hueShift = (hueShift + 20) % 360;
			shiftColors();
		} else {
			shiftColors();
			refreshColorsInterval = setInterval(function () {
				shiftColors();
				if (!colorCycleActive) {
					clearInterval(refreshColorsInterval);
					hueShift = hueShiftTmp;
					shiftColors();
				}
			}, colorCycleInterval);
		}
	}
	function animateGlobes(speed) {
		var a;
		a = setInterval(function () {
			var i, offset;
			if (speed === undefined) {speed = animationSpeed; }
			offset = speed / r;
			for (i = 0; i < numberOfGlobes; i += 1) {
				rArrays[i] = [rArrays[i][0] - offset, rArrays[i][1], rArrays[i][2]];
			}
			drawAllGlobes();
			drawInfo();
			if (!isAnimated) {clearInterval(a); }
		}, frameDuration);
	}

	cgd3.toggleHelp = function (booleanValue) {
		if (booleanValue === undefined) {showHelp = showHelp.toggle(); } else {showHelp = booleanValue; }
		drawHelp();
	};
	cgd3.toggleInfo = function (booleanValue) {
		if (booleanValue === undefined) {showInfo = showInfo.toggle(); } else {showInfo = booleanValue; }
		drawInfo();
	};
	cgd3.toggleMirror = function (booleanValue) {
		if (booleanValue === undefined) {showMirror = showMirror.toggle(); } else {showMirror = booleanValue; }
		drawAllGlobes();
	};
	cgd3.toggleAnimation = function (booleanValue, speed) {
		if (booleanValue === undefined) {isAnimated = isAnimated.toggle(); } else {isAnimated = booleanValue; }
		if (speed === undefined) {speed = animationSpeed; }
		animateGlobes(speed);
	};
	cgd3.toggleGraticule = function (booleanValue) {
		if (booleanValue === undefined) {showGraticule = showGraticule.toggle(); } else {showGraticule = booleanValue; }
		drawAllGlobes();
	};

	cgd3.kaleidoscope = function (booleanValue) {
		if (booleanValue === undefined) {kaleidoscope = kaleidoscope.toggle(); } else {kaleidoscope = booleanValue; }
	};

	cgd3.setGradientStyle = function (style) {
		if (style === undefined) {gradientStyle = (gradientStyle + 1) % 3;
			} else { gradientStyle = style; }
		drawAllGlobes();
	};


	cgd3.toggleFeatures = function () {
		showFeatureGlobe = showFeatureGlobe.toggle();
		clearCanvas(contextFeatureGlobe);
		drawAllGlobes();
	};
	cgd3.setNaturalEarthPath = function (pathTo) {
		topojsonPath = pathTo;
		setGeoDataDefaults();
	};
	cgd3.setAdminLevel = function (level) {
		adminLevel = level;
		setGeoDataDefaults();
	};
	cgd3.setAllDefaults = function () {
		setDefaults();
		setGeoDataDefaults();
	};

	cgd3.setFeatureData = function (pathToDataFile, feature) {
		featureData = pathToDataFile;
		featureJson = feature;
		setGeoDataDefaults();
	};

	function zoom(delta) {
		// visDeg visible angle in degrees
		var i, visDeg = 90 - (Math.acos((diagonal / 2) / r)).toDeg(), visDegHalf = visDeg / 2;

		function setGraticuleInterval(interval) {
			if (graticuleInterval !== interval) {
				graticuleInterval = interval;
				loadGeometry();
			}
		}

		if (isNaN(visDeg)) {visDeg = 90; }
		// sets graticule resolution
		if (r >= zoomMin && r <= zoomMax) {
			r = r + delta * r / 20;
			// clip view
			if (visDegHalf >= graticuleIntervals[0]) {setGraticuleInterval(graticuleIntervals[0]);
				} else {
				for (i = 0; i < graticuleIntervals.length - 1; i += 1) {
					if (visDegHalf < graticuleIntervals[i] &&  visDegHalf >= graticuleIntervals[i + 1]) {setGraticuleInterval(graticuleIntervals[i + 1]); }
				}
			}

			// set clipAngle based on zoom
			// TODO: specifications for different projections, currently orthographic only
			if (r >= diagonal / 2 && delta > 0) {
				clipAngle = visDeg;
			} else if (r >= diagonal / 2 && delta < 0) {
				clipAngle = visDeg * 1.1;
			} else {clipAngle = clipAngleMax; }
			if (debugLevel > 0) {console.log(delta, visDeg, clipAngle); }

			// set LOD
			if (!isFixedLOD) {
				if (r <= diagonal) {setGeometryLOD(0, 0, 0); }
				if (r > diagonal && r <= diagonal * 4) {setGeometryLOD(1, 1, 0); }
				if (r > diagonal * 4) {setGeometryLOD(2, 1, 1); }
			}

			// clamp zoom
			if (r < zoomMin) {r = zoomMin; }
			if (r > zoomMax) {r = zoomMax; }
			// clear gradient overlay on zoom resize
			for (i = 0; i < numberOfGlobes; i += 1) {
				updateGlobes[i] = 1;
			}
			drawMap();
		}
	}
	function wheel(event) {
		if (!event) {event = window.event; } // IE
		if (event.wheelDelta) {
			delta = event.wheelDelta / 120;
		} else if (event.detail) {delta = -event.detail / 3; }
		if (delta) {zoom(delta); }
		if (event.preventDefault) {
			event.preventDefault();
			event.returnValue = false;
		}
	}
	function setNumberOfGlobes() {
		if (numberOfGlobes < 2 || undefined) {
			numberOfGlobes = 1;
			console.log("Rendering " + numberOfGlobes + " Globe");
		} else {
			console.info("Rendering " + numberOfGlobes + " Globes");
		}
		if (debugLevel > 0) {console.info("start globe change"); }
		// TODO remove only affected canvases
		d3.selectAll("div").remove();
		prepareDocument();
		createColorWheel();
		handleGlobes();
		setGeometryLOD();
		drawAll();
	}
	cgd3.loadPreset = function (p) {
		if (debugLevel > 0) {console.log("loadPreset(" + p + ")"); }
		var i, preset;
		// expect preset format [[rot globe0][rot globe 1]...]
		if (p instanceof Array) {
			numberOfGlobes = p.length;
			preset = p;
		} else {
			preset = presets[p];
			numberOfGlobes = preset.length;
		}
		setNumberOfGlobes();
		for (i = 0; i < numberOfGlobes; i += 1) {
			if (preset[i] !== undefined) {
				rArrays[i] = preset[i];
			} else { rArrays[i] = rArrayDefault; }
		}
	};
	function keyDown(evt) {
		function hideAllButFirstGlobe() {
			var i;
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
			var i;
			gammaTmp = [];
			xTmp = evt.offsetX || evt.layerX;
			yTmp = evt.offsetY || evt.layerY;
			for (i = 0; i < numberOfGlobes; i += 1) {
				gammaTmp[i] = rArrays[i][2];
			}
			gammaStart = calcTan();
		}

		var validKey = 1;
		evt = evt || window.event;
		if (debugLevel > 1) {console.log("keyDown(evt) evt.keyCode:", evt.keyCode); }
		//noinspection FallthroughInSwitchStatementJS
		switch (evt.keyCode) {
		case 16:                                   // Shift
			selectAllGlobes();
			shiftKeyDown = 1;
			break;
		case 18:                                   // Alt
			if (!altKeyDown) {startRotation(); }
			altKeyDown = 1;
			break;
		case 32:                                   // Space
			hideAllButFirstGlobe();
			break;
		case 48:                                   // 0
			cgd3.loadPreset(0);
			drawAllGlobes();
			break;
		case 49:                                   // 1
			cgd3.loadPreset(1);
			drawAllGlobes();
			break;
		case 50:                                   // 2
			cgd3.loadPreset(2);
			drawAllGlobes();
			break;
		case 51:                                   // 3
			cgd3.loadPreset(3);
			drawAllGlobes();
			break;
		case 52:                                   // 4
			cgd3.loadPreset(4);
			drawAllGlobes();
			break;
		case 53:                                   // 5
			cgd3.loadPreset(5);
			drawAllGlobes();
			break;
		case 54:                                   // 6
			cgd3.loadPreset(6);
			drawAllGlobes();
			break;
		case 55:                                   // 7
			cgd3.loadPreset(7);
			drawAllGlobes();
			break;
		case 56:                                   // 8
			cgd3.loadPreset(8);
			drawAllGlobes();
			break;
		case 57:                                   // 9
			cgd3.loadPreset(9);
			drawAllGlobes();
			break;
		case 65:                                   // A
			cgd3.toggleAnimation();
			break;
		case 66:                                   // B
			showBorders = showBorders.cycle(3);
			drawAllGlobes();
			break;
		case 67:                                   // C
			showCoastlines = showCoastlines.toggle();
			drawAllGlobes();
			break;
		case 68:                                   // D
			cgd3.setGradientStyle();
			drawGradient();
			break;
		case 70:                                   // F
			cgd3.toggleFeatures();
			drawGradient();
			break;
		case 71:                                   // G
			cgd3.toggleGraticule();
			break;
		case 72:                                   // H
			cgd3.toggleHelp();
			break;
		case 73:                                   // I
			cgd3.toggleInfo();
			break;
		case 75:                                   // K
			cgd3.kaleidoscope();
			break;
		case 76:                                   // L
			showLakes = showLakes.toggle();
			drawAllGlobes();
			break;
		case 77:                                   // M
			momentumFlag = momentumFlag.toggle();
			break;
		case 79:                                   // O
			cgd3.cycleMapProjection(-1);
			break;
		case 80:                                   // P
			cgd3.cycleMapProjection();
			break;
		case 82:                                   // R
			cgd3.resetAll();
			break;
		// TODO Fix other time based repetitions like this:
		case 83:                                   // S
			if (!colorCycleActive) {
				colorCycleActive = 1;
				cycleColors();
			}
			break;
		case 84:                                   // T
			cgd3.toggleMirror();
			break;
		case 187:                                  // +/=
			numberOfGlobes += 1;
			setNumberOfGlobes();
			break;
		case 189:                                  // -/_
			numberOfGlobes -= 1;
			setNumberOfGlobes();
			break;
		case 192:                                  // `
		case 220:                                  // ^
			debugLevel = (debugLevel + 1) % 4;     // %4 set debug level range 0 - 3
			console.info("Debug Level: " + debugLevel);
			break;
		default:
			validKey = 0;
			break;
		}
		if (validKey && debugLevel > 1) {console.log("valid key down:", evt.keyCode); }
	}
	function keyUp(evt) {
		var validKey = 1;
		evt = evt || window.event;
		switch (evt.keyCode) {
		case 16:                                   // Shift
			shiftKeyDown = 0;
			deSelectAllGlobes();
			shiftActiveArrayMember(selectedGlobes);
			currentGlobeNumber = (currentGlobeNumber + 1) % numberOfGlobes;
			drawGlobes();
			break;
		case 18:                                   // Alt
			altKeyDown = 0;
			xRel = 0;
			yRel = 0;
			gammaStart = undefined;
			gammaTmp = [];
			break;
		case 83:                                   // S
			colorCycleActive = 0;
			//clearInterval(refreshColorsInterval);
			break;
		default:
			validKey = 0;
			break;
		}
		if (validKey && debugLevel > 0) {console.log("valid key up:", evt.keyCode); }
	}

	function prepareDocument() {
		var i, zID = 0, zStart = 1;
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
				if (debugLevel > 0) {console.log("handleDoubleClick()", geoCoordinatesAtMouseCursor); }
				cgd3.rotateToPosition();
			}

			function handleMouseClick() {
				if (lastClick === undefined) {
					lastClick = Date.now();
				} else {
					if (Date.now() - lastClick < doubleClickLengthInMs) {
						handleDoubleClick();
					}
					lastClick = Date.now();
				}
			}

			element = document.getElementById(divElementId);
			element.addEventListener("mousemove", track, false);
			element.addEventListener("mousedown", startTrack, false);
			element.addEventListener("click", handleMouseClick, false);
			element.addEventListener("mouseup", stopTrack, false);
			element.addEventListener("mousewheel", wheel, false);
			document.activeElement.addEventListener("keydown", keyDown, false);
			document.activeElement.addEventListener("keyup", keyUp, false);
			window.addEventListener("resize", resizeDocument, false);
			window.addEventListener("blur", resetModifiers, false); // reset key states on lost focus
			window.addEventListener("focus", resetModifiers, false); // and regained focus
			d3.select("#" + divElementId).on("mousemove.log", d3MousePosition);
		}

		function getWindowDimensions() {
			width = window.innerWidth;
			height = window.innerHeight; // needs fix -5 should not be necessary for no scroll bars
			minSize = 64;
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
		if (debugLevel > 0) {console.log("prepareDocument()"); }
		getWindowDimensions();
		d3.select("body").append("div").attr("id", divElementId);
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

		canvasID[zID] = "canvas_featureGlobe";
		appendCanvas();
		canvasFeatureGlobe = canvas[zID - 1];
		contextFeatureGlobe = context[zID - 1];

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
		if (debugLevel > 1) {
			console.log(" └─ z[]:", z, "canvasID", canvasID);
			console.log(" └─ canvas[]:", canvas);
			console.log(" └─ canvasGlobe[]:", canvasGlobe);
			console.log(" └─ canvasGradient:", canvasGradient);
			console.log(" └─ canvasHelp:", canvasHelp);
			console.log(" └─ canvasInfo:", canvasInfo);
		}
		addListeners();
	}

	cgd3.main = function () {
		if (debugLevel > 0) {console.log("--- main()"); }
		setDefaults();
		setGeoDataDefaults();
		setGeometryLOD();
		prepareDocument();
		initializeAll();
		setNumberOfGlobes();
		// preset overrides number of globes
		// {cgd3.loadPreset(4); }
		if (debugLevel > 0) {console.log("--- end main"); }
	};

	cgd3.firstDraw = function () {
		cgd3.setAllDefaults();
		setGeometryLOD();
		prepareDocument();
		initializeAll();
		setNumberOfGlobes();
	};


	cgd3.resetAll = function () {
		if (debugLevel > 0) {console.log("resetAll()"); }
		resetFlag = 1;
		d3.selectAll("div").remove();
		cgd3.main();
		resetFlag = 0;
	};
	return cgd3;
}();