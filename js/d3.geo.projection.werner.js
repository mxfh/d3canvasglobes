(function() {
	var π = Math.PI;
	var projection = d3.geo.projection, projectionMutator = d3.geo.projectionMutator;
	function parallel1Projection(projectAt) {
		var φ0 = 0, m = projectionMutator(projectAt), p = m(φ0);
		p.parallel = function(_) {
			if (!arguments.length) return φ0 / π * 180;
			return m(φ0 = _ * π / 180);
		};
		return p;
	}
	// based on Bonne / Werner
	function bonneHeart(λOffset) {
		var //φ0 = 1.2835, // 85° fixed for heart
			φ0 = 1.57079633, // 85° fixed for heart
			cotφ0 = 1 / Math.tan(φ0);
		function forward(λ, φ) {
			var ρ = cotφ0 + φ0 - φ, E;
				E = ρ ? (λ + λOffset) * Math.cos(φ) / ρ : ρ;
			return [ ρ * Math.sin(E), cotφ0 - ρ * Math.cos(E) ];
		}
		// Backward function not tested
		forward.invert = function(x, y) {
			var ρ = Math.sqrt(x * x + (y = cotφ0 - y) * y), φ = cotφ0 + φ0 - ρ;
			return [ ρ / Math.cos(φ) * Math.atan2(x, y) + λOffset, φ ];
		};
		return forward;
	}
	(d3.geo.bonneHeart = function() {
		return parallel1Projection(bonneHeart);
	}).raw = bonneHeart;
})();