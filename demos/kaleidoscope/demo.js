console.log(cgd3.version);
cgd3.setNaturalEarthPath("../../topojson/");
cgd3.setFeatureData("../../topojson/ne_110m_world.json");
cgd3.firstDraw();
cgd3.toggleInfo(0);
cgd3.toggleHelp(0);
cgd3.toggleGraticule(0);
cgd3.loadPreset([[-65, -55, 0], [-65, -55, 72], [-65, -55, 144], [-65, -55, 216], [-65, -55, 288]]);
cgd3.kaleidoscope(1);
cgd3.toggleAnimation(1, 150);
cgd3.setFixedLOD(1, 1);

