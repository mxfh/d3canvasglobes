/* set up environment with require.js */
"use strict";

require.config({
	paths: {
		d3: "external/d3.min",
		topojson: "external/topojson",
		// projections addon
		d3projection:  "external/d3.geo.projection.v0",
		cgd3: "../cgd3"
	}
});
require(["d3", "topojson", "helpers", "cgd3"],
	function () {
		require(["d3projection", "demo.hollowearth"], function () { });  //runs demo.hollowearth.js
	});