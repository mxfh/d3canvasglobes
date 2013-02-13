/* set up environment with require.js */

require.config({
	baseUrl: "../../js/", // otherwise same as ../js/main.js
	paths: {
		d3: "external/d3.v3.min",
		topojson: "external/topojson.v0.min",
		// projections addon
		d3projection:  "external/d3.geo.projection.v0.bonnemod",
		cgd3: "../cgd3"
	}
});

require(["d3", "topojson", "helpers", "cgd3"],
	function () {
		require(["d3projection", "../demos/werner/werner"], function () { });
	});