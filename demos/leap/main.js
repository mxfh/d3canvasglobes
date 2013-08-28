/* set up environment with require.js */

require.config({
	baseUrl: "../../js/", // otherwise same as ../js/main.js
	paths: {
		d3: "external/d3.min",
		topojson: "external/topojson",
		leap: "external/leap.min",
		// projections add-on
		d3projection:  "external/d3.geo.projection.v0",
		cgd3: "../cgd3"
	}
});
require(["d3", "topojson", "helpers", "cgd3", "leap"],
	function () {
		cgd3.setNaturalEarthPath("../../topojson/");
		cgd3.setFeatureData("../../topojson/ne_110m_world.json");
		require(["d3projection", "../demos/leap/demo"], function () {});
	});