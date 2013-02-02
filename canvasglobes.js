// Globes on Canvas
// by Max Friedrich Hartmann
// github/twitter: @mxfh
// comments are welcome my javascript skills are in dire need of some serious improvement
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
// TODO: add circles of latitude
// TODO: add mirror option
// TODO: Jump to Country
// TODO: Compare countries
// TODO: Graticule
// TODO: Switch projections
// TODO: Raster
// TODO: Animations > Plate tectonics
// TODO: Sun Terminator
// TODO: Tissot's-Indicatrix (Pseudo/real)

document.domain = "github.com";

function globeOverlay() {
    var element, globe, land, coastlines, borders, lakes,
        fillColorA, fillColorB, textColor, gradient,
        width, height, origin, minSize, maxDim, minDim, diagonal, zoomMin, zoomMax,
        canvasPadding, globePadding, colWidth, rowHeight, padding, gutter, baselineOffset,
        scales, scale, topoFile, clipAngle, presets,
        λA, φA, γA, λB, φB, γB, rotation, projection, canvas, context, path,
        posX, posY, rInit, r, x, y, xTmp, yTmp, xRel, yRel,
        mouseFactor, momentum, flag, shiftFlag, shiftToggle, altFlag,
        toggleGradient, switchColors, showGlobeB, showBorders, showLakes, showHelp, showCoastlines;

    //initialize Layout
    width = window.innerWidth;
    height = window.innerHeight;
    canvas = document.getElementById('canvas1');
    minSize = 640;
    if (width < minSize) {
        width = minSize;
    }
    if (height < minSize) {
        height = minSize;
    }
    if (canvas.getContext) {
        canvas.width = width;
        canvas.height = height;
        context = canvas.getContext('2d');
    }
    function clearCanvas() {
        context.clearRect(0, 0, canvas.width, canvas.height);
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
    origin = [canvasPadding, canvasPadding];
    baselineOffset = 9;
    function getX(column) {
        return origin[0] + (colWidth + gutter) * column;
    }

    function getXalignRight(column) {
        return getX(column) + colWidth;
    }

    function getY(row) {
        return origin[1] + rowHeight * row;
    }

    function getYtext(row) {
        return getY(row) + baselineOffset;
    }

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

    //  ColorBrewer: RdYlBu
    fillColorA = "rgba(215, 25, 28, 0.5)";
    fillColorB = "rgba(44, 123, 182, 0.5)";
    textColor = "rgba(0, 0, 0, 0.7)";
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

    initGradient();
    flag = 0;
    shiftFlag = 0;
    shiftToggle = 0;
    altFlag = 0;
    toggleGradient = 0;
    showBorders = 0;
    showCoastlines = 0;
    showLakes = 0;
    showGlobeB = 1;
    showHelp = 1;
    switchColors = 0;
    mouseFactor = 80;
    momentum = 1;
    clipAngle = 88;
    zoomMin = 10;
    zoomMax = 10000;
    scales = ["ne_110m_world.json", "ne_50m_world.json", "ne_10m_world.json"];
    topoFile = scales[0];
    scale = 0;
// λ (longitude) and φ (latitude) of projection center, rotation angle (γ) counter-clockwise in degrees
    presets = []; // λA, φA, γA, λB, φB, γB
    presets[0] = [0, 0, 0, 0, 0, 0];
    presets[1] = [0, -10 , 0, -50, -13, 44]; // African and South American Coastlines
    presets[2] = [15, 10, 0, -100, 10, 0];  // Europe - America
    presets[3] = [0, 90, 0, 120, -90, 0];    // Overlayed poles
    function loadPreset(p) {
        λA = presets[p][0];
        φA = presets[p][1];
        γA = presets[p][2];
        λB = presets[p][3];
        φB = presets[p][4];
        γB = presets[p][5];
    }

    if (λA === undefined) {
        loadPreset(1);
    } // initial preset
    element = document.getElementById("map");
    element.addEventListener("mousemove", track, false);
    element.addEventListener("mousedown", startTrack, false);
    element.addEventListener("mouseup", stopTrack, false);
    element.addEventListener("mousewheel", wheel, false);
    document.addEventListener("keydown", keyDown, false);
    document.addEventListener("keyup", keyUp, false);
    diagonal = Math.sqrt(maxDim * maxDim + minDim * minDim);

    function handle(delta) {
        if (r >= zoomMin && r <= zoomMax) {
            r = r + delta * (r / 10);
            if (r >= diagonal / 2) {
                clipAngle = 90 - Math.acos((diagonal / 2) / r) * 180 / Math.PI;
            }
            else {
                clipAngle = 89
            }
            if (r > diagonal && r <= diagonal * 4 && scale != 1) {
                toggleGradient = 1;
                scale = 1;
                momentum = 0;
                loadGeometry(scales[scale]);
            }
            if (r > diagonal * 4 && scale != 2) {
                toggleGradient = 1;
                scale = 2;
                momentum = 0;
                loadGeometry(scales[scale]);
            }
            if (r <= diagonal) {
                toggleGradient = 0;
                initGradient();
                scale = 0;
                momentum = 1;
                loadGeometry(scales[scale]);
            }

            if (r < zoomMin) {
                r = zoomMin
            }
            if (r > zoomMax) {
                r = zoomMax
            }
            drawglobes(λA, φA, γA, λB, φB, γB);
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

    function rotate() {
        mouseFactor = r;
        if (shiftFlag === 1) {
            if (altFlag === 0) {
                λA = λA - xRel / mouseFactor;
                φA = φA + yRel / mouseFactor;
                λB = λB - xRel / mouseFactor;
                φB = φB + yRel / mouseFactor;
            }
            if (altFlag === 1) {
                γA = γA - xRel / mouseFactor;
                γB = γB - xRel / mouseFactor;
            }
        }
        if (shiftFlag === 0) {
            if (shiftToggle === 0) {
                if (altFlag === 0) {
                    λA = λA - xRel / mouseFactor;
                    φA = φA + yRel / mouseFactor;
                }
                if (altFlag === 1) {
                    γA = γA - xRel / mouseFactor;
                }
            }
            if (shiftToggle === 1) {
                if (altFlag === 0) {
                    λB = λB - xRel / mouseFactor;
                    φB = φB + yRel / mouseFactor;
                }
                if (altFlag === 1) {
                    γB = γB - xRel / mouseFactor;
                }
            }

        }
    }

    function track(evt) {
        x = evt.offsetX || evt.layerX;
        y = evt.offsetY || evt.layerY;
        if (flag === 1) {
            xRel = x - xTmp;
            yRel = y - yTmp;
            rotate();
            drawglobes(λA, φA, γA, λB, φB, γB);
        }
        renderPositionInfo();
    }

    function startTrack(evt) {
        xTmp = evt.offsetX || evt.layerX;
        yTmp = evt.offsetY || evt.layerY;
        flag = 1;
        drawglobes(λA, φA, γA, λB, φB, γB);
    }

    function stopTrack() {
        flag = 0;
        if (momentum === 1) {
            var refreshIntervalId = setInterval(function () {
                if (momentum === 0) {
                    clearInterval(refreshIntervalId);
                }
                var linSlowdown = clipAngle * 0.002;
                var multiSlowdown = 0.98;
                if (xRel > 0) {
                    xRel = (xRel) * multiSlowdown - linSlowdown;
                }
                if (xRel < 0) {
                    xRel = (xRel) * multiSlowdown + linSlowdown;
                }
                if (yRel > 0) {
                    yRel = (yRel) * multiSlowdown - linSlowdown;
                }
                if (yRel < 0) {
                    yRel = (yRel) * multiSlowdown + linSlowdown;
                }
                rotate();
                drawglobes(λA, φA, γA, λB, φB, γB);
                if (Math.abs(xRel) < 1 && Math.abs(yRel) < 1) {
                    clearInterval(refreshIntervalId);
                }
            }, 1000 / 48);
        }
    }

    function toggle(p) {
        if (p === 1) {
            p = 0;
        }
        else {
            p = 1;
        }
        return p;
    }

    function keyDown(evt) {
        evt = evt || window.event;
        if (evt.keyCode === 16) {                                            // Shift
            shiftFlag = 1;
            shiftToggle = toggle(shiftToggle);
        }
        if (evt.keyCode === 18) {
            altFlag = 1;
        }                               // Alt
        if (evt.keyCode === 82 || evt.keyCode === 48) {                      // 0/R
            xRel = 0;
            yRel = 0;
            //momentum = 0;
            clearCanvas();
            loadPreset(0);
            r = rInit;
            initGradient();
        }
        if (evt.keyCode === 49) {
            loadPreset(1);
        }                             // 1
        if (evt.keyCode === 50) {
            loadPreset(2);
        }                             // 2
        if (evt.keyCode === 51) {
            loadPreset(3);
        }                             // 3
        if (evt.keyCode === 71) {
            toggleGradient = toggle(toggleGradient);
        }   // G
        if (evt.keyCode === 66) {
            showBorders = toggle(showBorders);
        }        // B
        if (evt.keyCode === 67) {
            showCoastlines = toggle(showCoastlines);
        }  // C
        if (evt.keyCode === 32) {
            showGlobeB = toggle(showGlobeB);
        }          // Space
        if (evt.keyCode === 83) {
            switchColors = toggle(switchColors);
        }      // S
        if (evt.keyCode === 72) {
            showHelp = toggle(showHelp);
        }              // H
        if (evt.keyCode === 76) {
            showLakes = toggle(showLakes);
        }              // L
        if (evt.keyCode === 77) {
            momentum = toggle(momentum);
        }              // M
        drawglobes(λA, φA, γA, λB, φB, γB);
    }

    function keyUp(evt) {
        evt = evt || window.event;
        if (evt.keyCode == 16) {
            shiftFlag = 0;
        }                             // Shift
        if (evt.keyCode === 18) {
            altFlag = 0;
        }                              // Alt
    }

    function drawglobe(λ, φ, γ, fillColor) {
        // path = undefined;
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
    }

    function drawglobeAppearance() {
        if (toggleGradient === 0) {
            context.beginPath();
            context.fillStyle = gradient;
            path(globe);
            context.fill();
        }
        if (toggleGradient === 1) {
            context.beginPath();
            path(globe);
            context.strokeStyle = "rgba(0, 0, 0, 0.2)";
            context.stroke();
        }
    }

    function drawglobes(λA, φA, γA, λB, φB, γB) {
        clearCanvas();
        if (switchColors === 1) {
            var tmp;
            tmp = fillColorA;
            fillColorA = fillColorB;
            fillColorB = tmp;
            switchColors = 0;
        }
        drawglobe(λA, φA, γA, fillColorA);
        if (showGlobeB === 1) {
            drawglobe(λB, φB, γB, fillColorB);
        }
        drawglobeAppearance();
        renderPositionInfo();
        if (showHelp === 1) {
            renderHelp();
        }
    }

    function renderPositionInfo() {
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

    function renderHelp() {
        context.textAlign = "right";
        context.fillStyle = textColor;
        context.fillText("Drag Mouse to move λ (longitude) and φ (latitude) of projection center", width - canvasPadding, getYtext(0));
        context.fillText("Hold [Shift] to switch globe, hold [Alt] for rotation γ around center", width - canvasPadding, getYtext(1));
        context.fillText("For presets press [1] - [3], [R] or [0] resets both globes to origin", width - canvasPadding, getYtext(2));
        context.fillText("[B] toggles land borders and [C] coastlines", width - canvasPadding, getYtext(3));
        context.fillText("[Space Bar] toggles secondary globe", width - canvasPadding, getYtext(4));
        context.fillText("[S] switches colors [G] toggles Gradient", width - canvasPadding, getYtext(5));
        context.fillText("Zoom with mouse wheel", width - canvasPadding, getYtext(6));
        context.fillText("[H] shows/hides this help text", width - canvasPadding, getYtext(7));
        context.textAlign = "left";
    }

    function loadGeometry(topoFile) {
        d3.json(topoFile, function (world) {
            globe = {type: "Sphere"};
            land = topojson.object(world, world.objects.land);
            coastlines = topojson.object(world, world.objects.coastline);
            borders = topojson.object(world, world.objects.landborders);
            lakes = topojson.object(world, world.objects.lakes);
            drawglobes(λA, φA, γA, λB, φB, γB);
        });
    }

    loadGeometry(topoFile);
    drawglobes(λA, φA, γA, λB, φB, γB);
}