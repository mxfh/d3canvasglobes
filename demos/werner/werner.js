console.log(cgd3.version);
cgd3.setNaturalEarthPath("../../topojson/");
cgd3.setFeatureData("../../topojson/ne_110m_world.json");
cgd3.setAllDefaults();
cgd3.firstDraw();
cgd3.toggleInfo(0);
cgd3.toggleHelp(0);
cgd3.toggleGraticule();
cgd3.toggleAnimation(1, 15);
cgd3.setR(0.3);
cgd3.setFixedLOD(1, 1);
cgd3.setMapProjection("bonneHeart");

d3.selectAll("body").append("div")
	.attr("id", "love")
	.attr("style", "font-family: 'Hoefler Text', Georgia, Garamond, Times, serif; font-size: 64px; text-align: center; width: auto; padding-top: " + window.innerHeight * 0.85 + "px; margin-left: auto; margin-right: auto; z-index: 12;")
	.text("You are my world.");

