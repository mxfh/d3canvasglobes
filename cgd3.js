// Globes on Canvas
// by Max Friedrich Hartmann
// github/twitter: @mxfh
// comments are welcome
// my javascript skills are in dire need of some serious improvement
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
// High priority
// TODO: Compare countries
// TODO: Add sample data for feature layer
// Medium
// TODO: skip for-loop when active globe known,
//       use only for moving multiples at once
// Low priority
// TODO: dynamic canvas size and position by content extent
// TODO: lock axis switches
// TODO: show scale / distance circles / orientation
// TODO: Raster
// TODO: Animations > Plate tectonics
// TODO: Sun Terminator
// TODO: Tissot's-Indicatrix (Pseudo/real)

cgd3 = (function() {
  var cgd3 = {version: '1.0'}, debugLevel, points, lines, showHeadline,
    headlineString, globalCompositeOperationType, gco, resetFlag,
    forceRedraw, animationSpeed, backgroundColor, adminLevel,
    isFixedLOD, isFixedAdminLevel, mapProjection, element, divElementId,
    featureJson, globe, bordersA0, land, coastlines, borders, bordersA1,
    lakes, adminUnits, states, features, graticule, graticuleIntervals,
    graticuleInterval, fillColor, fillColorDarker, fillColorDarkerA100,
    fillColorDarkerA75, fillColorDarkerA50, fillColorDarkerA25,
    fillColorLighter, fillColorLighterA100, fillColorLighterA75,
    fillColorLighterA50, fillColorLighterA25, fillColorA25, fillColorA50,
    fillColorA75, fillColorA100, textColor, gradientSphere,
    gradientSphereColor, globeOutlineColor, darkTone, brightTone,
    backgroundCanvasColor, refreshColorsInterval, width, height, origin,
    minSize, maxDim, minDim, diagonal, zoomMin, zoomMax, canvasPadding,
    globePadding, lineNumber, colWidth, rowHeight, padding, gutter,
    baselineOffset, formatPrecisionOne, geometryAtLOD, geometryLOD,
    featureData, topojsonPath, topojsonData, clipAngleMax, clipAngle,
    presets, rArrays, rArrayDefault, gammaTmp, gammaStart,
    globalProjection, projectionsArray, path, canvas, z, canvasID,
    canvasDefaultStyle, canvasBackground, canvasGradient, canvasInfo,
    canvasHelp, canvasGlobe, canvasFeatureGlobe, contextFeatureGlobe,
    context, contextBackground, contextGradient, contextInfo, contextHelp,
    contextGlobe, posX, posY, rInit, r, x, y, xTmp, yTmp, xRel, yRel,
    delta, geoCoordinatesAtMouseCursor,
    lastClick, doubleClickLengthInMs,
    maxFPS, frameDuration, colorCycleInterval, momentumFlag, isAnimated,
    mouseDown, shiftKeyDown, altKeyDown, colorCycleActive, gradientStyle,
    showGradientZoombased, showGraticule, showLines, showBorders, showLakes,
    showPlaces, places,
    showFeatureGlobe, showHelp, showInfo, showCoastlines, updateGlobes,
    showGlobes, selectedGlobes, lastSelectedGlobes, currentGlobeNumber,
    pi, radToDegFactor, hueWheel, hueShift, kaleidoscope, numberOfGlobes,
    lastNumberOfGlobes, showMirror, firstRun, firstFeatureLoad;

  // math
  Number.prototype.toDeg = function() {return this * radToDegFactor; };
  Number.prototype.toRad = function() {return this / radToDegFactor; };

  function setDefaults() {
    firstRun = 1;
    firstFeatureLoad = 1;
    debugLevel = 0;
    forceRedraw = 0;
    showHeadline = 0;
    headlineString = '';
    points = [[13.4, 52.5], [-87.8, 41.8]];
    globalCompositeOperationType = ['source-over', 'destination-out', 'xor'];
    // shorthand for globalCompositeOperation
    // https://developer.mozilla.org/en-US/docs/HTML/Canvas/Tutorial/Compositing
    gco = globalCompositeOperationType;
    numberOfGlobes = 1;
    showMirror = false;
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
    showLines = 0;
    showBorders = 0;
    showCoastlines = 0;
    showFeatureGlobe = 0;
    showLakes = 0;
    showHelp = 1;
    showInfo = 1;
    showPlaces = 0;
    momentumFlag = 1;
    isAnimated = 0;
    pi = Math.PI;
    radToDegFactor = 180 / pi;
    divElementId = 'map';
  }

  function setGeoDataDefaults() {
    if (!topojsonPath) {topojsonPath = 'topojson/'; }
    geometryAtLOD = [];
    // 0 is globe view zoom level
    geometryAtLOD[0] = topojsonPath + 'ne_110m_world.json';
    geometryAtLOD[1] = topojsonPath + 'ne_50m_world.json';
    geometryAtLOD[2] = topojsonPath + 'ne_10m_world.json';
    if (!featureData) {featureData = topojsonPath + 'ne_50m_world.json'; }
    if (!featureJson) {featureJson = 'a0countrieslakes'; }
    if (!geometryLOD) {geometryLOD = 0; }
    if (!isFixedLOD) {isFixedLOD = 0; }
    if (!isFixedAdminLevel) {isFixedAdminLevel = 0; }
    if (!adminLevel) {adminLevel = 0; }
    // default intervals for graticule resolutions
    graticuleIntervals = [30, 10, 5, 2, 1];
    graticuleInterval = graticuleIntervals[0];
  }
  // create graticules as GeoJSON on the fly
  function createGraticule(interval) {
    var i, lonLat, pointsPerCircle, pointInterval,
      graticuleGeoJson = {              // create object
        type: 'FeatureCollection',
        'features': []                // declare array
      };
    if (interval === undefined) {interval = graticuleInterval; }
    pointsPerCircle = 360 / interval * 3;
    pointInterval = 360 / pointsPerCircle;

    function graticuleJsonTemplate(name, type, value) {
      graticuleGeoJson.features.push({
        'type': 'Feature',
        'properties': {
          'name': name,
          'position': value,
          'class': 'Graticule',
          'type': type
        },
        'geometry': {
          'type': 'LineString',
          'coordinates': []
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
        graticuleJsonTemplate(
          'Circle of Latitude at ' + ((i + 1) * interval - 90),
          'Circle of Latitude',
          ((i + 1) * interval - 90)
        );
        createCircleOfLatitude();
      }
    }
    function createMeridians() {
      var k, kMax = 360 / interval;
      function createMeridian() {
        var l;
        for (l = 0; l <= pointsPerCircle / 2; l += 1) {
          // less lines at poles
          if ((l * pointInterval >= interval * 10 &&
            l * pointInterval <= 180 - interval * 10) ||
            // no 1°meridians up to 10°/20° based on interval
              (l * pointInterval >= interval * 6 &&
                l * pointInterval <= 180 - interval * 6 &&
                (k * interval) % 5 === 0) ||
              // keep 5° up to 30° based on interval
              (l * pointInterval >= interval * 3 &&
                l * pointInterval <= 180 - interval * 3 &&
                (k * interval) % 10 === 0) ||
              // keep 10° up to 30° based on interval
              (l * pointInterval >= interval &&
                l * pointInterval <= 180 - interval &&
                (k * interval) % 30 === 0) ||
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
        graticuleJsonTemplate('Meridian at ' + (k * interval - 180),
          'Meridian', (k * interval - 180));
        createMeridian();
      }
    }
    createCirclesOfLatitude();
    createMeridians();
    return graticuleGeoJson;
  }

  function createLines(a, b) { // Lines between two points
    var pointsPerCircle = 24,
      linesGeoJson = { // create object
        type: 'FeatureCollection',
        'features': [] // declare array
      };
    function linesJsonTemplate(name, type, start, end) {
      linesGeoJson.features.push({
        'type': 'Feature',
        'properties': {
          'name': name,
          'start': start,
          'end': end,
          'class': 'Line',
          'type': type,
          'length' : ''
        },
        'geometry': {
          'type': 'LineString',
          'coordinates': []
        }
      });
    }
    function createGreatCircle() {
      // no need to calculate points on circle,
      // d3 re-sampling should take care of that
      linesJsonTemplate('Great Circle', 'greatarc', a, b);
      linesGeoJson.features[0].geometry.coordinates.push(a);
      linesGeoJson.features[0].geometry.coordinates.push(b);
      linesGeoJson.features[0].properties.length = d3.geo.distance(a, b);
    }
    function createLoxodrome() {
      // calculate latitude in mercatorSpace
      var i, f,
        c = [a[0] + 540, d3.geo.mercator.raw(0, a[1].toRad())[1]],
        d = [b[0] + 540, d3.geo.mercator.raw(0, b[1].toRad())[1]],
        tmp,
        step = 1 / pointsPerCircle;
      // Fix wrapping lines
      if (d[0] - c[0] > 180) {
        d[0] = d[0] - 360;
      }
      if (c[0] - d[0] > 180) {
        c[0] = c[0] - 360;
      }
      linesJsonTemplate('Rhumb Line', 'loxodrome', a, b);
      for (i = 0; i <= pointsPerCircle; i += 1) {
        f = i * step;
        tmp = [
          (c[0] * f + d[0] * (1 - f) - 180) % 360,
          d3.geo.mercator.raw.invert(0, c[1] * f + d[1] * (1 - f))[1].toDeg()
        ];
        linesGeoJson.features[1].geometry.coordinates.push(tmp);
      }
      linesGeoJson.features[1].properties.length =
        d3.geo.length(linesGeoJson.features[1]);
    }

    createGreatCircle();
    createLoxodrome();
    return linesGeoJson;
  }
  function initializeLayout() {
    if (debugLevel > 0) {console.log('initializeLayout()'); }
    canvasPadding = minDim / 16;
    globePadding = canvasPadding * 0.8;
    posX = width / 2;
    posY = height / 2;
    x = posX;
    y = posY;
    rInit = minDim / 2 - globePadding;
    if (!r || resetFlag) {r = rInit; }
    formatPrecisionOne = d3.format('.1f');
    colWidth = 43;
    rowHeight = 16;
    padding = 3;
    gutter = 15;
    lineNumber = 0;
    origin = [canvasPadding, canvasPadding];
    baselineOffset = 9;
  }
  cgd3.setR = function(factor, absolute) {
    if (!absolute) {r = r * factor; }
    // if absolute is 1 set directly
    if (absolute) {r = factor; }
  };

  cgd3.getR = function() {
    return r;
  };

  function createColorWheel() {
    var i, hue, darker, lighter,
      hueAngle = 360 / numberOfGlobes,
      saturation = 70,
      lightness = 48,
      alpha = 1 / Math.sqrt(numberOfGlobes);
    if (debugLevel > 0) {console.log('createColorWheel()'); }
    function hslaString(hue, saturation, lightness, alpha) {
      return 'hsla(' + hue + ', ' + saturation + '%,' +
        ' ' + lightness + '%, ' + alpha + ')';
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
        fillColorDarkerA75[i] = hslaString(hue, saturation, darker, 0.75);
        fillColorDarkerA50[i] = hslaString(hue, saturation, darker, 0.50);
        fillColorDarkerA25[i] = hslaString(hue, saturation, darker, 0.25);
        fillColorLighter[i] = hslaString(hue, saturation, lighter, alpha);
        fillColorLighterA100[i] = hslaString(hue, saturation, lighter, 1);
        fillColorLighterA75[i] = hslaString(hue, saturation, lighter, 0.75);
        fillColorLighterA50[i] = hslaString(hue, saturation, lighter, 0.5);
        fillColorLighterA25[i] = hslaString(hue, saturation, lighter, 0.25);
      }
    }
    if (debugLevel > 1) {
      //noinspection JSLint
      console.log(
        ' └─ hueAngle:', hueAngle,
        'hueStart:', hueShift,
        'fillColor[]:', fillColor
      );
    }
  }
  function initializeColors() {
    if (debugLevel > 0) {console.log('initializeColors()'); }
    darkTone = 'rgba(26, 17, 16, 1)';
    brightTone = 'hsla(240, 100%, 99%, 1)';
    // ColorBrewer: RdYlBu
    // Rd 'rgba(215, 25, 28, 0.5)';
    // Bu = 'rgba(44, 123, 182, 0.5)';
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
    globeOutlineColor = 'rgba(0, 0, 0, 0.2)';
    backgroundColor = darkTone;
    backgroundCanvasColor = brightTone;
    // hueShift overrides predefined colors with computed hue at max angle
    hueShift = 10;
    hueWheel = 1;
    // create colors along hue circle
    createColorWheel();
    textColor = darkTone;
    gradientSphereColor = 'rgba(80, 80, 100, 0.5)';
  }
  cgd3.setClipAngle = function(angle, angleMax) {
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
    if (debugLevel > 0) {console.log('initializeProjection()'); }
    if (debugLevel > 1) {console.log(' └─ rArrays[]:', rArrays); }
    rArrays = [];
    rArrayDefault = [0, 0, 0];
    zoomMin = 10;
    zoomMax = 10000;
    delta = 0;
    // λ (longitude) and φ (latitude) of projection center,
    //   (γ) rotation angle counter-clockwise in degrees
    diagonal = Math.sqrt(maxDim * maxDim + minDim * minDim);
    yRel = 0;
    xRel = 0;
    xTmp = 0;
    yTmp = 0;
    // set initial global projection mode here:
    if (!mapProjection) { mapProjection = 'orthographic'; }
    globalProjection = d3.geo[mapProjection]();
    // TODO: setting maxclipangle should be done by or derived
    // cgd3.cycleMapProjection(0);
    // 88 for orthographic
    if (clipAngleMax === undefined || resetFlag) {clipAngleMax = 88; }
    if (clipAngle === undefined || resetFlag) {clipAngle = clipAngleMax; }
    // init projections array
    projectionsArray = [];
  }

  cgd3.setMapProjection = function(projectionNameString) {
    mapProjection = projectionNameString;
    globalProjection = d3.geo[mapProjection]();
  };

  cgd3.setForceRedraw = function(booleanValue) {
    forceRedraw = booleanValue;
  };

  cgd3.setFixedLOD = function(booleanValue, lod) {
    isFixedLOD = booleanValue;
    if (lod !== undefined) {geometryLOD = lod; }
    setGeoDataDefaults();
  };

  cgd3.setFixedAdminLevel = function(booleanValue, level) {
    isFixedAdminLevel = booleanValue;
    if (level !== undefined) {adminLevel = level; }
    setGeoDataDefaults();
  };

  cgd3.cycleMapProjection = function(increment) {
    var newIndex, index, i,
      definedMapProjections = [
        //built in
      ['mercator'],
      ['orthographic', 90, 'hasGradient'],
      ['albers', 120],
        //'albersUsa',
      ['azimuthalEqualArea'],
      ['azimuthalEquidistant'],
      ['equirectangular'],
      ['gnomonic',87], // 90 is infinity
      ['stereographic'],
        //extended projection list
      ['aitoff'],
      ['armadillo'],
      ['august'],
      ['baker'],
      ['berghaus'],
      ['boggs'],
      ['bonne'],
      ['bromley'],
      ['collignon'],
      ['conicConformal'],
      ['conicEquidistant'],
      ['craig'],
      ['craster'],
      ['cylindricalEqualArea'],
      ['eckert1'],
      ['eckert2'],
      ['eckert3'],
      ['eckert4'],
      ['eckert5'],
      ['eckert6'],
      ['eisenlohr'],
      ['fahey'],
      ['gringorten'],
      ['guyou'],
      ['hammer'],
      ['hammerRetroazimuthal'],
      ['hatano'],
      ['healpix'],
      ['hill'],
      ['homolosine'],
      ['kavrayskiy7'],
      ['lagrange'],
      ['larrivee'],
      ['laskowski'],
      ['littrow', 90],
      ['loximuthal'],
      ['miller'],
      ['modifiedStereographic'],
      ['mollweide'],
      ['mtFlatPolarParabolic'],
      ['mtFlatPolarQuartic'],
      ['mtFlatPolarSinusoidal'],
      ['naturalEarth'],
      ['nellHammer'],
      ['peirceQuincuncial'],
      ['polyconic'],
      ['rectangularPolyconic'],
      ['robinson'],
      ['satellite'],
      ['sinuMollweide'],
      ['sinusoidal'],
      ['times'],
      ['vanDerGrinten'],
      ['vanDerGrinten2'],
      ['vanDerGrinten3'],
      ['vanDerGrinten4'],
      ['wagner4'],
      ['wagner6'],
      ['wagner7'],
      ['wiechel'],
      ['winkel3']
      ],
      l = definedMapProjections.length;
      for (i = 0; i < l && index === undefined; i += 1) {
        if (definedMapProjections[i][0] === mapProjection) {index = i}
      }
    if (index >= 0) {
      if (increment === undefined) {increment = 1; }
      newIndex = index.cycle(l, increment);
      mapProjection = definedMapProjections[newIndex][0];
      if (definedMapProjections[newIndex][1] !== undefined) {
        clipAngleMax = definedMapProjections[newIndex][1];
      } else {clipAngleMax = 180;}
      clipAngle = clipAngleMax;
      if (debugLevel > 0) {
        console.log('cycleMapProjection:',
          index, l, increment, newIndex, mapProjection);
      }
      globalProjection = (d3.geo[mapProjection])();
      // TODO Load size presets (clipAngle etc...) based on projection
      console.info('current Map projection: ' + mapProjection);
      clearCanvas(contextBackground);
      if (definedMapProjections[newIndex][2] === 'hasGradient') {
        gradientStyle = 1;
      }
      if (definedMapProjections[newIndex][2] === 'hasOutline') {
        gradientStyle = 2;
      }
      else {gradientStyle = 0;}
      drawAll();
    }
  };

  function initializeGlobes() {
    var i;
    if (debugLevel > 0) {console.log('initializeGlobes()'); }
    for (i = 0; i < numberOfGlobes; i += 1) {
      if (rArrays[i] === undefined) {rArrays[i] = rArrayDefault; }
    }
    showGlobes = initializeArray(numberOfGlobes, 1);
    updateGlobes = initializeArray(numberOfGlobes, 1);
    selectedGlobes = initializeArray(numberOfGlobes, 0);
    // select first globe
    selectedGlobes[0] = 1;
    if (debugLevel > 1) {
      //noinspection JSLint
      console.log(
        'Globes -- selected:', selectedGlobes,
        'show:', showGlobes,
        'update:', updateGlobes
      );
    }
  }

  function selectGlobe(i) {
    //  if (!shiftKeyDown) {
    if (debugLevel > 0) {console.log('selectGlobe()'); }
    if (debugLevel > 1) {console.log('selectedGlobes', selectedGlobes); }
    selectedGlobes = setAllArrayValues(selectedGlobes, 0);
    selectedGlobes[i] = 1;
    if (debugLevel > 1) {console.log('selectedGlobes', selectedGlobes); }
    //  }
  }
  function selectAllGlobes() {
    if (!shiftKeyDown) {
      if (debugLevel > 0) {console.log('selectAllGlobes()'); }
      if (debugLevel > 1) {
        //noinspection JSLint
        console.log(
          'selectedGlobes:', selectedGlobes,
          'lastSelectedGlobes:', lastSelectedGlobes
        );
      }
      lastSelectedGlobes = selectedGlobes.slice(0);
      selectedGlobes = setAllArrayValues(selectedGlobes, 1);
      if (debugLevel > 1) {
        //noinspection JSLint
        console.log(
          'selectedGlobes:', selectedGlobes,
          'lastSelectedGlobes:', lastSelectedGlobes
        );
      }
    }
  }
  function deSelectAllGlobes() {
    if (debugLevel > 0) {console.log('deSelectAllGlobes()'); }
    if (debugLevel > 1) {
      console.log(
        'deselect: selectedGlobes, lastSelectedGlobes',
        selectedGlobes,
        lastSelectedGlobes
      );
    }
    selectedGlobes = lastSelectedGlobes.slice(0);
    if (debugLevel > 1) {
      console.log(
        'deselect: selectedGlobes, lastSelectedGlobes',
        selectedGlobes,
        lastSelectedGlobes
      );
    }
  }
  function handleGlobes() {
    var i,
      selected = selectedGlobes.indexOf(1),
      angle = 360 / numberOfGlobes;
    if (lastNumberOfGlobes === undefined) {lastNumberOfGlobes = 1; }
    if (debugLevel > 0) {console.log('handleGlobe()', lastNumberOfGlobes); }
    if (kaleidoscope) {
      for (i = 1; i < numberOfGlobes; i += 1) {
        rArrays[i] = [
          rArrays[0][0],
          rArrays[0][1],
          (rArrays[0][2] + angle * i) % 360
        ];
      }
      initializeGlobes();
      selectAllGlobes();
      // add
    } else if (lastNumberOfGlobes < numberOfGlobes) {
      for (i = lastNumberOfGlobes; i < numberOfGlobes; i += 1) {
        if (rArrays[i] === undefined) {
          rArrays[i] = [
            rArrays[selected][0],
            rArrays[selected][1],
            rArrays[selected][2]
          ];
        }
        if (debugLevel > 0) {
          console.log(
            ' └─ add',
            lastNumberOfGlobes,
            numberOfGlobes,
            i,
            selectedGlobes
          );
        }
        initializeGlobes();
        selectGlobe(i);
      }
      // remove
    } else if (lastNumberOfGlobes > numberOfGlobes) {
      for (i = lastNumberOfGlobes; i >= numberOfGlobes; i -= 1) {
        //rArrays[i] = undefined;
        if (debugLevel > 0) {
          console.log(
            ' └─ remove',
            lastNumberOfGlobes,
            numberOfGlobes,
            i,
            selectedGlobes
          );
        }
        initializeGlobes();
        if (selected < numberOfGlobes) {
          selectGlobe(selected);
        } else {
          selectGlobe(numberOfGlobes - 1);
        }
      }
    }
    lastNumberOfGlobes = numberOfGlobes;
    if (debugLevel > 1) {console.log(' └─ rArrays[]:', rArrays); }
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
    gradientSphere = contextGradient.createRadialGradient(
      posX - 0.3 * r,
      posY - 0.5 * r,
      0,
      posX,
      posY,
      r * 1.03
    );
    gradientSphere.addColorStop(0.00, gradientSphereColor.setAlpha(0));
    gradientSphere.addColorStop(0.10, gradientSphereColor.setAlpha(0.01));
    gradientSphere.addColorStop(0.30, gradientSphereColor.setAlpha(0.02));
    gradientSphere.addColorStop(0.50, gradientSphereColor.setAlpha(0.05));
    gradientSphere.addColorStop(0.65, gradientSphereColor.setAlpha(0.09));
    gradientSphere.addColorStop(0.75, gradientSphereColor.setAlpha(0.14));
    gradientSphere.addColorStop(0.83, gradientSphereColor.setAlpha(0.2));
    gradientSphere.addColorStop(0.90, gradientSphereColor.setAlpha(0.29));
    gradientSphere.addColorStop(0.95, gradientSphereColor.setAlpha(0.42));
    gradientSphere.addColorStop(0.98, gradientSphereColor.setAlpha(0.55));
    gradientSphere.addColorStop(1.00, gradientSphereColor.setAlpha(0.62));
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
    if (debugLevel > 1) {
      console.log(
        'clearCanvas(context)',
        ctx.canvas.id,
        'w:',
        ctx.canvas.width,
        'h:',
        ctx.canvas.height,
        'context:',
        ctx
      );
    }
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
    localContext.rect(
      getX(col) - padding,
      getY(row) - padding,
      cols * colWidth + (cols - 1) * gutter + padding * 2,
      rows * rowHeight + padding * 2
    );
    localContext.fillStyle = fillColor;
    localContext.fill();
  }
  function clearBackgroundRect(col, row, cols, rows, localContext, noPadding) {
    var paddingPlus = padding + 1;
    if (noPadding) {
      localContext.clearRect(
        getX(col),
        getY(row),
        cols * colWidth + (cols - 1) * gutter,
        rows * rowHeight
      );
    } else {
      localContext.clearRect(
        getX(col) - paddingPlus,
        getY(row) - paddingPlus,
        cols * colWidth + (cols - 1) * gutter + paddingPlus * 2,
        rows * rowHeight + paddingPlus * 2
      );
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
  function drawLegendLine(ctx, lineWidth, color, x, y) {
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - rowHeight / 3);
    ctx.lineTo(x + colWidth / 3, y - rowHeight / 3);
    ctx.stroke();
  }
  // Draw to canvas
  cgd3.drawInfo = function(forceUpdate) {
    // TODO: may be optimized by splitting into background and number display
    //       and updating only the changes of active globe,
    //       or by moving this completely to html
    if (!showInfo) {
      clearCanvas(contextInfo);
    } else {
      clearCanvas(contextInfo);
      var i, col, xLeft, xRight, lambda, phi, gamma,
        gDist, lDist,
        xZero = getX(0),
        xZeroRight = getXalignRight(0),
        yA = getYtext(0),
        yB = getYtext(1),
        yC = getYtext(2),
        yD = getYtext(3),
        yE = getYtext(4),
        yF = getYtext(6),
        yG = getYtext(7),
        yH = getYtext(8),
        dist,
        minDist = pi,
        minI,
        city,
        mouseXY,
        pop,
        popString;
      try {
      // find closest Place
        for (i = 0; i < places.geometries.length - 1; i += 1) {
          dist = d3.geo.distance(
            geoCoordinatesAtMouseCursor,
            places.geometries[i].coordinates
          );
          //console.log(dist, minI, i);
          if (dist < minDist) {
            minDist = dist;
            minI = i;
          }
          if (minDist < 0.05) {
            city =
              places.geometries[minI].properties.NAME + ', ' +
              places.geometries[minI].properties.SOV0NAME;
            pop = places.geometries[minI].properties.POP_MAX;
            if (pop > 1000000) {
              popString = ('Pop: ' + Math.round(pop / 100000) / 10 + 'M');
            } else if (pop > 10000) {
              popString = ('Pop: ' + Math.round(pop / 100) / 10 + 'k');
            }
            else {popString = ('Pop: ' + pop);}
          }
        }
        mouseXY = d3.mouse(element);
        if (showPlaces && city !== undefined) {
         // console.log(contextInfo.measureText(city).width);
          contextInfo.beginPath();
          contextInfo.rect(
            mouseXY[0] + 2,
            mouseXY[1] - 14,
            contextInfo.measureText(city).width + 4,
            12);
          contextInfo.rect(
            mouseXY[0] + 6,
            mouseXY[1] - 2,
            contextInfo.measureText(popString).width + 4,
            12);
          contextInfo.fillStyle = 'rgba(255, 255, 255, 0.8)';
          contextInfo.fill();
          contextInfo.fillStyle = textColor;
          contextInfo.fillText(city, mouseXY[0] + 4, mouseXY[1] - 4);
          contextInfo.fillText(popString, mouseXY[0] + 8, mouseXY[1] + 8);
        }
      } catch (err) {}
      // projection
      //clearBackgroundRect(-1, 3, 7, 8, contextInfo, 1);
      contextInfo.font = '12pt Garamond';
      if (showLines) {
        try {
          // Great Arc Distance
          gDist = Math.round(6371 * lines.features[0].properties.length);
          // Rhumb Line Distance
          lDist = Math.round(6371 * lines.features[1].properties.length);
        } catch (errLines) {
          gDist = 0;
          lDist = 0;
        }
        contextInfo.fillStyle = textColor;
        contextInfo.fillText('Map Projection: ' + mapProjection, xZero, yE);
        contextInfo.fillText('Great Arc:', xZero + colWidth / 2, yF);
        contextInfo.fillText('Loxodrome:', xZero + colWidth / 2, yG);
        contextInfo.textAlign = 'right';
        contextInfo.fillText(gDist + ' km', getXalignRight(2), yF);
        contextInfo.fillText(lDist + ' km', getXalignRight(2), yG);
        contextInfo.font = '10pt Garamond';
        contextInfo.fillText(
          '+' + Math.round((lDist / gDist - 1) * 1000) / 10 + ' %   ',
          getXalignRight(2),
          yH
        );
        drawLegendLine(contextInfo, 4, 'blue', xZero, yF);
        drawLegendLine(contextInfo, 2, 'orange', xZero, yG);
        contextInfo.textAlign = 'left';
      }

      if (showFeatureGlobe) {
        contextInfo.font = '15pt Garamond';
        //clearBackgroundRect(0, -2, 13, 1, contextInfo);
        contextInfo.textAlign = 'left';
        contextInfo.fillStyle = textColor;
        contextInfo.fillText(
          features.geometries[0].properties.name,
          xZero,
          getYtext(10)
        );
        contextInfo.font = '10pt Garamond';
        pop = features.geometries[0].properties.pop_est;
        if (pop > 1000000) {
          popString = ('Pop: ' + Math.round(pop / 100000) / 10 + 'M');
        } else if (pop > 10000) {
          popString = ('Pop: ' + Math.round(pop / 100) / 10 + 'k');
        }
        else {popString = ('Pop: ' + pop);}
        contextInfo.fillText(
          popString,
          xZero,
          getYtext(11)
        );
      }
      // Draw Headline
      //showHeadline = 1;
      if (showHeadline) {
        contextInfo.font = '13pt Garamond';
        //clearBackgroundRect(0, -2, 13, 1, contextInfo);
        contextInfo.textAlign = 'left';
        contextInfo.fillStyle = textColor;
        contextInfo.fillText(
          headlineString,
          xZero,
          getYtext(-1.66)
        );
      }
      contextInfo.font = '9pt Garamond';
      // Draw lon/lat mouse position
      if (geoCoordinatesAtMouseCursor !== undefined &&
          !isNaN(geoCoordinatesAtMouseCursor[0]) &&
          !isNaN(geoCoordinatesAtMouseCursor[1])
          ) {
        //clearBackgroundRect(0, 0, 1, 2, contextInfo);
        backgroundRect(0, 0, 1, 2, fillColor[currentGlobeNumber], contextInfo);
        contextInfo.fillStyle = textColor;
        contextInfo.fillText('φ', xZero, yA);
        contextInfo.textAlign = 'right';
        contextInfo.fillText(
          formatPrecisionOne(geoCoordinatesAtMouseCursor[1]),
          xZeroRight,
          yA
        );

        contextInfo.textAlign = 'left';
        contextInfo.fillText('λ', xZero, yB);
        contextInfo.textAlign = 'right';
        contextInfo.fillText(
          formatPrecisionOne(geoCoordinatesAtMouseCursor[0]),
          xZeroRight,
          yB
        );
        contextInfo.textAlign = 'left';
      }
      // Draw X/Y mouse position in debug mode
      contextInfo.fillStyle = textColor;
      if (debugLevel > 0) {
        //clearBackgroundRect(0, 2, 1, 2, contextInfo, 1);
        if (typeof x === 'number') {
          contextInfo.fillText('x', xZero, yC);
          contextInfo.textAlign = 'right';
          contextInfo.fillText(x, xZeroRight, yC);
          contextInfo.textAlign = 'left';
        }
        if (typeof y === 'number') {
          contextInfo.fillText('y', xZero, yD);
          contextInfo.textAlign = 'right';
          contextInfo.fillText(y, xZeroRight, yD);
          contextInfo.textAlign = 'left';
        }
      }

      for (i = 0; i < numberOfGlobes; i += 1) {
        if (selectedGlobes[i] || isAnimated || forceRedraw || forceUpdate) {
          lambda = (rArrays[i][0] + 180).mod(360) - 180;
          phi = (rArrays[i][1] + 180).mod(360) - 180;
          gamma = rArrays[i][2].mod(360);
          col = i + 1;
          xLeft = getX(col);
          xRight = getXalignRight(col);
          //clearBackgroundRect(col, 0, 1, 3, contextInfo);
          if (gamma !== 0) {
            backgroundRect(col, 0, 1, 3, fillColor[i], contextInfo);
          } else {backgroundRect(col, 0, 1, 2, fillColor[i], contextInfo); }
          contextInfo.fillStyle = textColor;
          contextInfo.fillText('φ₀', xLeft, yA);
          contextInfo.fillText('λ₀', xLeft, yB);
          if (gamma !== 0) {
            contextInfo.fillText('γ₀', xLeft, yC);
          }
          contextInfo.textAlign = 'right';
          contextInfo.fillText(formatPrecisionOne(phi), xRight, yA);
          contextInfo.fillText(formatPrecisionOne(lambda), xRight, yB);
          if (gamma !== 0) {
            contextInfo.fillText(formatPrecisionOne(gamma), xRight, yC);
          }
          contextInfo.textAlign = 'left';
        }
      }
    }
  };
  function helpText(string, keystring, newLines) {
    var y = getYtext(newLine(newLines)),
      xRight = width - canvasPadding;
    contextHelp.font = 'normal 12pt Garamond';
    contextHelp.textAlign = 'right';
    contextHelp.fillText(string, xRight - gutter - canvasPadding, y);
    if (keystring !== undefined) {
      contextHelp.font = 'bold 12pt Consolas';
      contextHelp.textAlign = 'left';
      contextHelp.fillText(keystring, xRight - canvasPadding, y);
    }
  }
  function drawHelp() {
    // TODO may be moved to html
    clearCanvas(contextHelp);
    if (showHelp) {
      contextHelp.font = '12pt Garamond';
      lineNumber = 0;
      contextHelp.fillStyle = textColor;
      helpText('Show/hide Help', 'H');
      helpText('Drag Mouse to move λ (lon) and φ (lat) of projection center');
      helpText('Click to go to position');
      helpText('also sets distance line end points');
      helpText('Zoom with mouse wheel', '', 2);

      helpText('Show/hide secondary globes', 'Space');
      helpText('Add/Remove additional globes', '=|-', 2);

      helpText('To switch globe or move all at once');
      helpText('Press/Hold', 'Shift', 2);

      helpText('For rotation γ (gamma) around center');
      helpText('Drag Mouse and Hold', 'Alt', 2);

      helpText('Start/Stop Animation', 'A');
      helpText('Disable Momentum', 'M', 2);
      helpText('Switch between projections (experimental)', 'O|P');
      helpText('For presets press', '1 - 9');
      helpText('Reset globes to origin', '0', 2);

      helpText('New globes are added with rotation', 'K');
      helpText('Show transparent globe', 'T', 2);

      helpText('Show/hide Distance Lines', 'X');
      helpText('Show/hide Graticule', 'G');
      helpText('Show/hide land Borders', 'B');
      helpText('Show/hide named places', 'N');
      helpText('Coastlines only (faster)', 'C');
      helpText('Show/hide Lakes', 'L');
      helpText('Cycle globe colors', 'S');
      helpText('Draw shadow decoration', 'D', 2);

      helpText('Show/hide position Info', 'I');
      helpText('Reset all', 'R', 2);
    }
  }

  function drawLand(
    ctx,
    path,
    fLand,
    fLakes,
    fBordersA0,
    fBordersA1,
    sLand,
    sBordersA0,
    sBordersA1
  ) {
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

  function drawLines(ctx, path) {
    if (showLines && lines !== undefined) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'orange';
      // loxodrome
      drawStrokedPath(ctx, path, lines.features[1]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'blue';
      // great arc
      drawStrokedPath(ctx, path, lines.features[0]);
      ctx.lineWidth = 1;
    }
  }

  function drawPlaces(ctx, path) {
    if (showPlaces && places !== undefined) {
      var pp;
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.fillStyle = 'maroon';
      for (var i = 0; i < places.geometries.length; i += 1) {
        drawFilledPath(ctx, path.pointRadius(1.8), places.geometries[i]);
      }
    }
  }

  function drawGlobeBackside(ctx, i) {
    var rotMirror, prjMirror, tmp;
    // flip canvas
    if (debugLevel > 0) {console.log('drawGlobeBackside(ctx, i):', ctx, i); }
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    // mirrored mode
    // set center to antipode inverse rotation
    rotMirror = [-(rArrays[i][0]) + 180, (rArrays[i][1]), -rArrays[i][2]];
    prjMirror = globalProjection
      .translate([posX, posY])
      .rotate(rotMirror)
      .clipExtent([[0, 0], [width, height]])
      .clipAngle(clipAngle).scale(r);
    path = d3.geo.path().projection(prjMirror).context(ctx);
    tmp = showLakes;
    showLakes = 0;
    drawLand(
      ctx,
      path,
      fillColorDarkerA75[i],
      fillColorA100[i],
      fillColorA75[i],
      fillColorA25[i],
      fillColorA50[i],
      fillColorA50[i],
      fillColorA25[i]
    );
    drawGraticule(ctx, path, fillColorA25[i]);
    drawLines(ctx, path);
    showLakes = tmp;
    // flip back to normal
    ctx.translate(width, 0);
    ctx.scale(-1, 1);

  }

  function bonneHeart(ctx, i) {
    // TODO: factor is guesswork so far should be derived from projection
    var xOffset = r * 1.321,
      offset = 90,
      heartColor = 'rgba(255, 192, 203,1)';
    function bonneHeartHalf(sign) {
      var rot = [-(rArrays[i][0]) - sign * 90, 0, rArrays[i][2]],
        prj = d3.geo.bonneHeart()
          .translate([posX + sign * xOffset, posY])
          .rotate(rot)
          .parallel(sign * offset)
          .clipExtent([[0, 0], [width, height]])
          .clipAngle(clipAngle).scale(r);

      path = d3.geo.path().projection(prj).context(ctx);
      // Filled Style
      drawLand(
        ctx,
        path,
        heartColor,
        fillColorA100[i],
        fillColorA75[i],
        fillColorA75[i],
        fillColorA25[i]
      );
      drawGraticule(ctx, path, 'rgba(255, 192, 203,0.25)');
    }
    // disallow mirror mode
    if (showMirror) {showMirror = 0; }
    clipAngle = 89.99999999;
    // Since clipping drove me nuts this map is rendered
    // in two parts each shifted by +/-90 degrees and clipped by 90 degrees
    bonneHeartHalf(1);
    bonneHeartHalf(-1);
  }

  cgd3.drawGlobe = function(i) {
    if (debugLevel > 0) {
      console.log(
        'drawGlobe(i):',
        i,
        'showMirror:',
        showMirror,
        'showGraticule:',
        showGraticule
      );
    }
    // -λ, -φ, γ
    var ctx, rot, prj;
    ctx = contextGlobe[i];
    clearCanvas(ctx);
    if (showMirror) {
      clipAngle = 89.99;
      drawGlobeBackside(ctx, i); }
    if (mapProjection === 'bonneHeart') {bonneHeart(ctx, i);
      } else {
      rot = [-(rArrays[i][0]), -(rArrays[i][1]), rArrays[i][2]];
      // tweak projections here
      prj = globalProjection
        .translate([posX, posY])
        .rotate(rot)
       // .clipAngle(clipAngle).scale(r)
        .clipExtent([[0, 0], [width, height]]);
      projectionsArray[i] = prj;
      path = d3.geo.path().projection(prj).context(ctx);
      // Filled Style
      drawLand(
        ctx,
        path,
        fillColor[i],
        fillColorA100[i],
        fillColorA75[i],
        fillColorA25[i],
        fillColorA75[i],
        fillColorA50[i],
        fillColorA25[i]
      );
      drawLines(ctx, path);
      drawGraticule(ctx, path, fillColorDarkerA25[i]);
      drawPlaces(ctx, path);
    }
  };
  function drawFeatureGlobe() {
    if (showFeatureGlobe) {
      if (debugLevel > 0) {console.log('drawFeatureGlobe()'); }
      // -λ, -φ, γ
      var i, ctx, rot, prj;
      i = numberOfGlobes - 1;
      ctx = contextFeatureGlobe;
      rot = [
        -(rArrays[i][0]),
        (-rArrays[i][1]),
        rArrays[i][2]];
      // tweak projections here
      prj = globalProjection
        .translate([posX, posY])
        .rotate(rot)
        .clipExtent([[0, 0], [width, height]])
        .clipAngle(clipAngle).scale(r);
      clearCanvas(ctx);
      path = d3.geo.path().projection(prj).context(ctx);
      // Filled Style
      ctx.fillStyle = fillColorDarkerA50[i];
      drawFilledPath(ctx, path, features);
    }
  }
  function drawGlobes() {
    if (debugLevel > 0) {
      console.log('drawGlobes()', 'updateGlobes[]', updateGlobes);
    }
    if (debugLevel > 1) {
      console.log('updateGlobes[]', updateGlobes);
    }
    var i;
    for (i = 0; i < numberOfGlobes; i += 1) {
      if (showGlobes[i] && (selectedGlobes[i] || updateGlobes[i])) {
        currentGlobeNumber = selectedGlobes.indexOf(1);
        cgd3.drawGlobe(i);
        drawFeatureGlobe();
        updateGlobes[i] = 0;
      }
    }
  }
  function drawGradient() {
    var ctx = contextGradient, rot, prj, offset = 1.321;
    if (debugLevel > 0) {console.log('drawGradient()'); }
    if (debugLevel > 1) {console.log('contextGradient:', ctx); }
    clearCanvas(ctx);
    if (mapProjection === 'bonneHeart') {
      ctx = contextBackground;
      clearCanvas(ctx);
      ctx.fillStyle = 'rgba(224,17,95,1)';
      prj = d3.geo.bonneHeart()
        .parallel(-90)
        .translate([posX - r * offset, posY])
        .clipAngle(90)
        .scale(r);
      path = d3.geo.path()
        .projection(prj)
        .context(ctx);
      drawFilledPath(ctx, path, globe);
      prj = d3.geo.bonneHeart()
        .parallel(90)
        .translate([posX + r * offset, posY])
        .clipAngle(90)
        .scale(r);
      path = d3.geo.path()
        .projection(prj)
        .context(ctx);
      drawFilledPath(ctx, path, globe);
      if (debugLevel > 1) {
        console.log(
          ' └─ Heart',
          'fillStyle:',
          ctx.fillColor
        );
      }
    } else {
      rot = [
        -(rArrays[0][0]),
        (-rArrays[0][1]),
        rArrays[0][2]
      ];
      // tweak projections here
      prj = globalProjection
      //.translate([posX, posY])
        .clipExtent([[0, 0], [width, height]])
        .rotate(rot)
        .clipAngle(clipAngle).scale(r);
      if (gradientStyle !== 0 && mapProjection === 'orthographic') {
        path = d3.geo.path().projection(prj).context(ctx);
        // draw gradient
        if (gradientStyle === 1 && showGradientZoombased) {
          createGradientSphere();
          ctx.fillStyle = gradientSphere;
          drawFilledPath(ctx, path, globe);
          if (debugLevel > 1) {
            console.log(
              ' └─ Gradient',
              'fillStyle:',
              ctx.fillStyle
            );
          }
        }
        // draw outline only
        if (gradientStyle === 2 || !showGradientZoombased) {
          ctx.strokeStyle = globeOutlineColor;
          drawStrokedPath(ctx, path, globe);
          if (debugLevel > 1) {
            console.log(
              ' └─ Outline',
              'strokeStyle:',
              ctx.strokeStyle
            );
          }
        }
      }
    }
  }
  function setAllGlobesToUpdate() {
    setAllArrayValues(updateGlobes, 1);
    if (debugLevel > 0) {
      console.log(
        'setAllGlobesToUpdate()',
        'updateGlobes[]',
        updateGlobes
      );
    }
  }
  cgd3.drawAllGlobes = function() {
    if (debugLevel > 0) {console.log('drawAllGlobes()'); }
    setAllGlobesToUpdate();
    drawGlobes();
  };

  function drawMap() {
    if (debugLevel > 0) {console.log('drawMap()'); }
    cgd3.drawAllGlobes();
    drawFeatureGlobe();
    drawGradient();
  }

  function drawAll() {
    if (debugLevel > 0) {console.log('drawAll()'); }
    forceRedraw = 1;
    contextBackground.fillStyle = backgroundCanvasColor;
    contextBackground.fillRect(0, 0, width, height);
    drawMap();
    cgd3.drawInfo();
    drawHelp();
    forceRedraw = 0;
  }
  function loadGeometry() {
    if (debugLevel > 0) {console.log('loadGeometry()'); }
    d3.json(topojsonData, function(error, json) {
      if (debugLevel > 0) {console.log('d3.json'); }
      if (error) {console.log(error); }
      globe = {type: 'Sphere'};
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
        places = topojson.object(json, json.objects.places);
        states = topojson.object(json, json.objects.a1countrieslakes);
        lakes = topojson.object(json, json.objects.lakes);
      }
      graticule = createGraticule(graticuleInterval);
      lines = createLines(points[0], points[1]);
      if (firstRun) {drawAll(); firstRun = 0; }
    });
    d3.json(featureData, function(error, json) {
      // TODO 2nd json-file should be appended to first loop
      // console.log(featureData);
      if (debugLevel > 0) {console.log('d3.json - features'); }
      if (error) {console.log(error); }
      if (!error) {
        // Get selected feature by single hash in URL
        // http://.*#DEU
        var iso = window.location.hash.substring(1);
        //console.log(iso);
        if (iso === undefined || iso === '') {
          iso = '';
        }
        else {
         features = topojson.object(json, json.objects[featureJson]);
         features.geometries = features.geometries.filter(function(d) {
           return d.id === iso;
         });
         if (features.geometries !== undefined) {
           if (firstFeatureLoad) {
             var pos = d3.geo.centroid(features);
             cgd3.loadPreset([
               [pos[0],pos[1],0],
               [pos[0],pos[1],0]
             ]);
             cgd3.toggleFeatures(1);
             cgd3.hideAllButFirstGlobe();
             cgd3.toggleHelp(0);
             firstFeatureLoad = false;
           }
         }
        }
      }
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
    // TODO: figure out a way to read out all active projections independently !
    if (globalProjection !== undefined) {
      //console.log(projectionsArray);
      geoCoordinatesAtMouseCursor = projectionsArray[selectedGlobes.indexOf(1)].invert(d3.mouse(element));
      //geoCoordinatesAtMouseCursor = globalProjection.invert(d3.mouse(element));
      if (debugLevel > 1) {
        console.log(
          'd3MousePosition()',
          currentGlobeNumber,
          projectionsArray[currentGlobeNumber].invert(d3.mouse(element))
        );
      }
    }
    if (last !== geoCoordinatesAtMouseCursor) {
      cgd3.drawInfo();
    }
  }
  function rotate() {
    var i;
    for (i = 0; i < numberOfGlobes; i += 1) {
      if (selectedGlobes[i]) {
        if (!altKeyDown) {
          rArrays[i] = [
            rArrays[i][0] - xRel / r,
            rArrays[i][1] + yRel / r,
            rArrays[i][2]];
        }
        if (altKeyDown) {
          rArrays[i] = [
            rArrays[i][0],
            rArrays[i][1],
            gammaTmp[i] + calcTan() - gammaStart
          ];
        }
        updateGlobes[i] = 1;
      }
    }
  }

  cgd3.setRotation = function(i, r) {
    rArrays[i] = [
      r[0],
      r[1],
      r[2]
    ];
  };

  cgd3.setRelativeRotation = function(i, rRel) {
    rArrays[i] = [
      rArrays[i][0] + rRel[0],
      rArrays[i][1] + rRel[1],
      rArrays[i][2] + rRel[2]
    ];
  };

  function track(evt) {
    if (debugLevel > 2) {console.log('track(evt)', 'evt:', evt); }
    x = evt.offsetX || evt.layerX;
    y = evt.offsetY || evt.layerY;
    if (mouseDown || altKeyDown) {
      xRel = x - xTmp;
      yRel = y - yTmp;
      rotate();
      if (!isAnimated) {drawGlobes(); }
    }
    if (!isAnimated) {cgd3.drawInfo(); }
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
      refreshIntervalId = setInterval(function() {
        yRel = yRel * factorSlowdown - yRel.sign() * linearSlowdown;
        xRel = xRel * factorSlowdown - xRel.sign() * linearSlowdown;
        rotate();
        if (!isAnimated) {
          drawGlobes();
          cgd3.drawInfo();
        }
        var minThreshhold = 2;
        if (
          (
            Math.abs(xRel) < minThreshhold &&
            Math.abs(yRel) < minThreshhold
          ) ||
            !momentumFlag
        ) {
          clearInterval(refreshIntervalId);
        }
      }, frameDuration);
    }
  }
  cgd3.rotateToPosition = function(lonLat) {
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
    if (debugLevel > 0) {console.log('rotateToPosition'); }
    if (!isNaN(endPosition[0]) && !isNaN(endPosition[1])) {
      if (dLon >= 180) {dLon = (dLon - 360); }
      if (dLon <= -180) {dLon = (dLon + 360); }
      steps = Math.floor(Math.sqrt(dLon * dLon + dLat * dLat)) * 2 + 6;
      //console.log(steps);
      stepLon = dLon / steps;
      stepLat = dLat / steps;
      cosFactor = ((pi * 2) / steps);
      refreshIntervalId = setInterval(function() {
        i += 1;
        // cosine curve tweening
        rArrays[currentGlobeNumber] = [
          rArrays[currentGlobeNumber][0] +
            stepLon * (Math.cos(cosFactor * i) * -1 + 1),
          rArrays[currentGlobeNumber][1] +
            stepLat * (Math.cos(cosFactor * i) * -1 + 1),
          rArrays[currentGlobeNumber][2]
        ];
        if (!isAnimated) {
          cgd3.drawGlobe(currentGlobeNumber);
          cgd3.drawInfo();
        }
        if (i >= steps) {clearInterval(refreshIntervalId); }
      }, frameDuration);
    }
  };
  function shiftColors() {
    hueShift = (hueShift - 360 / numberOfGlobes) % 360;
    createColorWheel();
    cgd3.drawAllGlobes();
    cgd3.drawInfo();
  }
  function cycleColors() {
    // shift hue if one globe present, cycle when hold;
    var hueShiftTmp = hueShift;
    if (numberOfGlobes === 1) {
      hueShift = (hueShift + 20) % 360;
      shiftColors();
    } else {
      shiftColors();
      refreshColorsInterval = setInterval(function() {
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
    a = setInterval(function() {
      var i, offset;
      if (speed === undefined) {speed = animationSpeed; }
      offset = speed / r;
      for (i = 0; i < numberOfGlobes; i += 1) {
        rArrays[i] = [rArrays[i][0] - offset, rArrays[i][1], rArrays[i][2]];
      }
      cgd3.drawAllGlobes();
      cgd3.drawInfo();
      if (!isAnimated) {clearInterval(a); }
    }, frameDuration);
  }

  cgd3.toggleHelp = function(booleanValue) {
    if (booleanValue === undefined) {
      showHelp = !showHelp;
    } else {
      showHelp = booleanValue;
    }
    drawHelp();
  };
  cgd3.toggleInfo = function(booleanValue) {
    if (booleanValue === undefined) {
      showInfo = !showInfo;
    } else {
      showInfo = booleanValue;
    }
    cgd3.drawInfo();
  };

  cgd3.toggleHeadline = function(booleanValue) {
    if (booleanValue === undefined) {
      showHeadline = !showHeadline;
    } else {
      showInfo = booleanValue;
    }
    cgd3.drawInfo();
  };

  cgd3.setHeadlineString = function(inputString) {
    headlineString = inputString;
  };

  cgd3.toggleMirror = function(booleanValue) {
    if (booleanValue === undefined) {
      showMirror = !showMirror;
    } else {
      showMirror = booleanValue;
    }
    console.log(showMirror);
    cgd3.drawAllGlobes();
  };
  cgd3.toggleAnimation = function(booleanValue, speed) {
    if (booleanValue === undefined) {
      isAnimated = !isAnimated;
    } else {
      isAnimated = booleanValue;
    }
    if (speed === undefined) {speed = animationSpeed; }
    animateGlobes(speed);
  };
  cgd3.toggleGraticule = function(booleanValue) {
    if (booleanValue === undefined) {
      showGraticule = !showGraticule;
    } else {
      showGraticule = booleanValue;
    }
    cgd3.drawAllGlobes();
  };

  cgd3.toggleLines = function(booleanValue) {
    if (booleanValue === undefined) {
      showLines = !showLines;
    } else {
      showLines = booleanValue;
    }
    cgd3.drawAllGlobes();
  };

  cgd3.toggleLakes = function(booleanValue) {
    if (booleanValue === undefined) {
      showLakes = !showLakes;
    } else {
      showLakes = booleanValue;
    }
    cgd3.drawAllGlobes();
  };

  cgd3.togglePlaces = function(booleanValue) {
    if (booleanValue === undefined) {
      showPlaces = !showPlaces;
    } else {
      showPlaces = booleanValue;
    }
    cgd3.drawAllGlobes();
  };

  cgd3.kaleidoscope = function(booleanValue) {
    if (booleanValue === undefined) {
      kaleidoscope = !kaleidoscope;
    } else {
      kaleidoscope = booleanValue;
    }
  };

  cgd3.setGradientStyle = function(style) {
    if (style === undefined) {
      gradientStyle = (gradientStyle + 1) % 3;
    } else { gradientStyle = style; }
    cgd3.drawAllGlobes();
  };


  cgd3.toggleFeatures = function(booleanValue) {
    if (booleanValue === undefined) {
      showFeatureGlobe = !showFeatureGlobe;
    } else {
      showFeatureGlobe = booleanValue;
    }
    clearCanvas(contextFeatureGlobe);
    cgd3.drawAllGlobes();
  };

  cgd3.setNaturalEarthPath = function(pathTo) {
    topojsonPath = pathTo;
    setGeoDataDefaults();
  };
  cgd3.setAdminLevel = function(level) {
    adminLevel = level;
    setGeoDataDefaults();
  };
  cgd3.setAllDefaults = function() {
    setDefaults();
    setGeoDataDefaults();
  };

  cgd3.setFeatureData = function(pathToDataFile, feature) {
    featureData = pathToDataFile;
    featureJson = feature;
    setGeoDataDefaults();
  };

  function zoom(delta) {
    // visDeg visible angle in degrees
    var i,
      visDeg = 90 - (Math.acos((diagonal / 2) / r)).toDeg(),
      visDegHalf = visDeg / 2;

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
      if (visDegHalf >= graticuleIntervals[0]) {
        setGraticuleInterval(graticuleIntervals[0]);
      } else {
        for (i = 0; i < graticuleIntervals.length - 1; i += 1) {
          if (
            visDegHalf < graticuleIntervals[i] &&
              visDegHalf >= graticuleIntervals[i + 1]
          ) {
            setGraticuleInterval(graticuleIntervals[i + 1]);
          }
        }
      }

      // set clipAngle based on zoom
      // TODO: specifications for different projections,
      //       currently orthographic only
      if (globalProjection === 'orthographic') {
        if (r >= diagonal / 2 && delta > 0) {
          clipAngle = visDeg;
        } else if (r >= diagonal / 2 && delta < 0) {
          clipAngle = visDeg * 1.1;
        } else {
          clipAngle = clipAngleMax;
        }
        if (debugLevel > 0) {
          console.log(delta, visDeg, clipAngle);
        }
      } else {clipAngle = clipAngleMax;}
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
      console.log('Rendering ' + numberOfGlobes + ' Globe');
    } else {
      console.info('Rendering ' + numberOfGlobes + ' Globes');
    }
    if (debugLevel > 0) {console.info('start globe change'); }
    // TODO remove only affected canvases
    d3.selectAll('div').remove();
    prepareDocument();
    createColorWheel();
    handleGlobes();
    setGeometryLOD();
    drawAll();
  }
  cgd3.loadPreset = function(p) {
    if (debugLevel > 0) {console.log('loadPreset(' + p + ')'); }
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

  cgd3.hideAllButFirstGlobe = function() {
    var i;
    for (i = 1; i < numberOfGlobes; i += 1) {
      clearCanvas(contextGlobe[i]);
      showGlobes[i] = !showGlobes[i];
    }
    if (!showGlobes[1]) {
      lastSelectedGlobes = selectedGlobes.slice(0);
      setAllArrayValues(selectedGlobes, 0);
      setAllArrayValues(updateGlobes, 0);
      selectedGlobes[0] = 1;
      updateGlobes[0] = 1;
    } else {
      selectedGlobes = lastSelectedGlobes.slice(0);
      cgd3.drawAllGlobes();
    }
  };

  function keyDown(evt) {
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
    if (debugLevel > 1) {
      console.log(
        'keyDown(evt) evt.keyCode:',
        evt.keyCode
      );
    }
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
      cgd3.hideAllButFirstGlobe();
      break;
    case 48:                                   // 0
      cgd3.loadPreset(0);
      cgd3.drawAllGlobes();
      break;
    case 49:                                   // 1
      cgd3.loadPreset(1);
      cgd3.drawAllGlobes();
      break;
    case 50:                                   // 2
      cgd3.loadPreset(2);
      cgd3.drawAllGlobes();
      break;
    case 51:                                   // 3
      cgd3.loadPreset(3);
      cgd3.drawAllGlobes();
      break;
    case 52:                                   // 4
      cgd3.loadPreset(4);
      cgd3.drawAllGlobes();
      break;
    case 53:                                   // 5
      cgd3.loadPreset(5);
      cgd3.drawAllGlobes();
      break;
    case 54:                                   // 6
      cgd3.loadPreset(6);
      cgd3.drawAllGlobes();
      break;
    case 55:                                   // 7
      cgd3.loadPreset(7);
      cgd3.drawAllGlobes();
      break;
    case 56:                                   // 8
      cgd3.loadPreset(8);
      cgd3.drawAllGlobes();
      break;
    case 57:                                   // 9
      cgd3.loadPreset(9);
      cgd3.drawAllGlobes();
      break;
    case 65:                                   // A
      cgd3.toggleAnimation();
      break;
    case 66:                                   // B
      showBorders = showBorders.cycle(3);
      cgd3.drawAllGlobes();
      break;
    case 67:                                   // C
      showCoastlines = !showCoastlines;
      cgd3.drawAllGlobes();
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
      cgd3.toggleLakes();
      break;
    case 77:                                   // M
      momentumFlag = !momentumFlag;
      break;
    case 78:                                   // N
      cgd3.togglePlaces();
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
    case 88:                                   // X
      cgd3.toggleLines();
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
      console.info('Debug Level: ' + debugLevel);
      break;
    default:
      validKey = 0;
      break;
    }
    if (validKey && debugLevel > 1) {
      console.log(
        'valid key down:',
        evt.keyCode
      );
    }
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
    if (validKey && debugLevel > 0) {
      console.log(
        'valid key up:',
        evt.keyCode
      );
    }
  }

  function prepareDocument() {
    var i, zID = 0, zStart = 1;
    function addListeners() {
      function resetModifiers() {
        if (debugLevel > 0) {console.log('focus event'); }
        shiftKeyDown = 0;
        mouseDown = 0;
        altKeyDown = 0;
      }
      function resizeDocument() {
        if (window.innerWidth !== width || window.innerHeight !== height) {
          if (debugLevel > 0) {console.log('resizeDocument()'); }
          d3.selectAll('div').remove();
          prepareDocument();
          initializeLayout();
          drawAll();
        }
      }

      function handleDoubleClick() {
        if (debugLevel > 0) {
          console.log(
            'handleDoubleClick()',
            geoCoordinatesAtMouseCursor
          );
        }
        cgd3.rotateToPosition();
        points.shift();
        points.push(geoCoordinatesAtMouseCursor);
        lines = createLines(points[0], points[1]);
        //console.log(geoCoordinatesAtMouseCursor, points[0], points[1]);
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
      element.addEventListener('mousemove', track, false);
      element.addEventListener('mousedown', startTrack, false);
      element.addEventListener('click', handleMouseClick, false);
      element.addEventListener('mouseup', stopTrack, false);
      element.addEventListener('mousewheel', wheel, false);
      document.activeElement.addEventListener('keydown', keyDown, false);
      document.activeElement.addEventListener('keyup', keyUp, false);
      window.addEventListener('resize', resizeDocument, false);
      // reset key states on lost focus
      window.addEventListener('blur', resetModifiers, false);
      // and regained focus
      window.addEventListener('focus', resetModifiers, false);
      d3.select('#' + divElementId).on('mousemove.log', d3MousePosition);
    }

    function getWindowDimensions() {
      width = window.innerWidth;
      height = window.innerHeight;
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
      d3.selectAll('div').append('canvas')
        .attr('id', canvasID[zID])
        .attr('style', canvasDefaultStyle + z[zID] + ';');
      canvas[zID] = document.getElementById(canvasID[zID]);
      canvas[zID].width = width;
      canvas[zID].height = height;
      context[zID] = canvas[zID].getContext('2d');
      if (!isLastCanvas) {
        zID += 1;
        z[zID] = z[zID - 1] + 1;
      }
    }
    if (debugLevel > 0) {console.log('prepareDocument()'); }
    getWindowDimensions();
    d3.select('body').append('div').attr('id', divElementId);
    canvas = [];
    canvasGlobe = [];
    context = [];
    contextGlobe = [];
    z = [];
    z[zID] = zStart;
    canvasDefaultStyle = 'position: absolute; left: 0; top: 0; z-index: ';
    canvasID = [];

    canvasID[zID] = 'canvas_background';
    appendCanvas();
    canvasBackground = canvas[zID - 1];
    contextBackground = context[zID - 1];

    for (i = 0; i < numberOfGlobes; i += 1) {
      canvasID[zID] = 'canvas_globe_' + i;
      appendCanvas();
      canvasGlobe[i] = canvas[zID - 1];
      contextGlobe[i] = context[zID - 1];
    }

    canvasID[zID] = 'canvas_featureGlobe';
    appendCanvas();
    canvasFeatureGlobe = canvas[zID - 1];
    contextFeatureGlobe = context[zID - 1];

    canvasID[zID] = 'canvas_gradient';
    appendCanvas();
    canvasGradient = canvas[zID - 1];
    contextGradient = context[zID - 1];

    canvasID[zID] = 'canvas_help';
    appendCanvas();
    canvasHelp = canvas[zID - 1];
    contextHelp = context[zID - 1];

    canvasID[zID] = 'canvas_info';
    appendCanvas(1);
    canvasInfo = canvas[zID];
    contextInfo = context[zID];
    if (debugLevel > 1) {
      console.log(' └─ z[]:', z, 'canvasID', canvasID);
      console.log(' └─ canvas[]:', canvas);
      console.log(' └─ canvasGlobe[]:', canvasGlobe);
      console.log(' └─ canvasGradient:', canvasGradient);
      console.log(' └─ canvasHelp:', canvasHelp);
      console.log(' └─ canvasInfo:', canvasInfo);
    }
    addListeners();
  }

  cgd3.main = function() {
    if (debugLevel > 0) {console.log('--- main()'); }
    setDefaults();
    setGeoDataDefaults();
    setGeometryLOD();
    prepareDocument();
    initializeAll();
    setNumberOfGlobes();
    // preset overrides number of globes
    // {cgd3.loadPreset(4); }
    if (debugLevel > 0) {console.log('--- end main'); }
  };

  cgd3.firstDraw = function() {
    cgd3.setAllDefaults();
    setGeometryLOD();
    prepareDocument();
    initializeAll();
    setNumberOfGlobes();
  };


  cgd3.resetAll = function() {
    if (debugLevel > 0) {console.log('resetAll()'); }
    resetFlag = 1;
    d3.selectAll('div').remove();
    cgd3.main();
    resetFlag = 0;
  };
  return cgd3;
}());
