/* set up environment with require.js */

require.config({
	baseUrl: "js/",
	paths: {
		d3: "external/d3.min",
		topojson: "external/topojson",
		// projections add-on
		d3projection:  "external/d3.geo.projection.v0",
		cgd3: "../cgd3"
	}
});
require(["d3", "topojson", "helpers", "cgd3"],
	function () {
		require(["d3projection", "../demos/overlay/demo"], function () { });
	});