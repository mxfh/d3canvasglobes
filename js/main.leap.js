/* set up environment with require.js */
"use strict";

require.config({
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
		require(["d3projection", "demo.leap"], function () { });  //runs demo.newsglobe
	});