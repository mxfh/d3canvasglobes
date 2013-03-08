console.info(cgd3.version);
cgd3.setNaturalEarthPath("../../topojson/");
cgd3.setFeatureData("../../topojson/ne_110m_world.json");
cgd3.firstDraw();
cgd3.toggleGraticule();
cgd3.toggleMirror();
cgd3.toggleAnimation();
cgd3.rotateToPosition([-20, 25]);