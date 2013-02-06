"use strict";
// Math
Number.prototype.mod = function (n) {return ((this % n) + n) % n; };

// sign function (+/-/0) of number http://stackoverflow.com/questions/7624920/number-sign-in-javascript
Number.prototype.sign = function () {return this ? this < 0 ? -1 : 1 : 0; };

Number.prototype.toggle = function() {
	var flag;
	if (this) {flag = 0;} else { flag = 1;}
	return flag;
};


// Colors
String.prototype.colorNameToHex = function(returnUnresolved) { // color list from http://stackoverflow.com/q/1573053/731179  with added gray/gray
	var hexRGB ,definedColorNames = {"aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff", "beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887", "cadetblue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff", "darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b","darkmagenta":"#8b008b","darkolivegreen":"#556b2f", "darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f","darkslateblue":"#483d8b","darkslategray":"#2f4f4f","darkturquoise":"#00ced1", "darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969","dodgerblue":"#1e90ff", "firebrick":"#b22222","floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff", "gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","green":"#008000","greenyellow":"#adff2f", "honeydew":"#f0fff0","hotpink":"#ff69b4", "indianred ":"#cd5c5c","indigo ":"#4b0082","ivory":"#fffff0","khaki":"#f0e68c", "lavender":"#e6e6fa","lavenderblush":"#fff0f5","lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6","lightcoral":"#f08080","lightcyan":"#e0ffff","lightgoldenrodyellow":"#fafad2", "lightgrey":"#d3d3d3","lightgreen":"#90ee90","lightpink":"#ffb6c1","lightsalmon":"#ffa07a","lightseagreen":"#20b2aa","lightskyblue":"#87cefa","lightslategray":"#778899","lightsteelblue":"#b0c4de", "lightyellow":"#ffffe0","lime":"#00ff00","limegreen":"#32cd32","linen":"#faf0e6", "magenta":"#ff00ff","maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd","mediumorchid":"#ba55d3","mediumpurple":"#9370d8","mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee", "mediumspringgreen":"#00fa9a","mediumturquoise":"#48d1cc","mediumvioletred":"#c71585","midnightblue":"#191970","mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5", "navajowhite":"#ffdead","navy":"#000080", "oldlace":"#fdf5e6","olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500","orangered":"#ff4500","orchid":"#da70d6", "palegoldenrod":"#eee8aa","palegreen":"#98fb98","paleturquoise":"#afeeee","palevioletred":"#d87093","papayawhip":"#ffefd5","peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080", "red":"#ff0000","rosybrown":"#bc8f8f","royalblue":"#4169e1", "saddlebrown":"#8b4513","salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57","seashell":"#fff5ee","sienna":"#a0522d","silver":"#c0c0c0","skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090","snow":"#fffafa","springgreen":"#00ff7f","steelblue":"#4682b4", "tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0", "violet":"#ee82ee", "wheat":"#f5deb3","white":"#ffffff","whitesmoke":"#f5f5f5", "yellow":"#ffff00","yellowgreen":"#9acd32", "darkgrey":"#a9a9a9", "darkslategrey":"#2f4f4f", "dimgrey":"#696969", "grey":"#808080", "lightgray":"#d3d3d3", "lightslategrey":"#778899", "slategrey":"#708090"};
	if (definedColorNames[this.toLowerCase()] !== undefined) {
		hexRGB = definedColorNames [this.toLowerCase()];
		// to keep unresolved strings set flag returnUnresolved to true
	} else {if (returnUnresolved) {hexRGB = this; } else {hexRGB = undefined; }}
	return  hexRGB;
};

String.prototype.setAlpha = function(alpha) {
	// change alpha of color string in any css color space
	// intended for use in canvas/svg
	// currently implemented:
	// css defined colors               > rgba
	// rgba, rgb, r%g%b%, #rgb, #rrggbb > rgba
	// hsl, hsla                        > hsla
	// unresolved                       > as is
	//
	// If no alpha is passed its is set to 1 or keeps the value in rgba/hsla

	// kill whitespace split at "(", ")", ","
	var i, hex, c = this.replace(/\s/g, '').split(/[\(\),]/);
	c[0] = c[0].colorNameToHex(1); // detect defined color names
	if (c[0].charAt(0) === "#") {  // detect hex strings
		hex = c[0].replace(/#/g, ''); c[0] = "hex";  }
	switch (c[0]) {
		case "rgba":
			if (alpha === undefined) {alpha = c[4]; }
			c = "rgba(" + c[1] + ", " + c[2] + ", " + c[3] + ", " + alpha + ")";
			break;
		case "rgb":
			if (alpha === undefined) {alpha = 1; }
			//  if colors are in percentage values
			for  (i = 1; i <= 3; i = i + 1) {
				if (c[i].charAt(c[i].length-1 ) === "%") {
					c[i] = Math.round(c[i].replace(/%/g, '') * 2.55);
				}
			}
			c = "rgba(" + c[1] + ", " + c[2] + ", " + c[3] + ", " + alpha + ")";
			break;
		case "hsl":
			if (alpha === undefined) {alpha = 1; }
			c = "hsla(" + c[1] + ", " + c[2] + ", " + c[3] + ", " + alpha + ")";
			break;
		case "hsla":
			if (alpha === undefined) {alpha = c[4]; }
			c = "hsla(" + c[1] + ", " + c[2] + ", " + c[3] + ", " + alpha + ")";
			break;
		case "hex":
			if (alpha === undefined) {alpha = 1; }
			if (hex.length === 3 ) {
				c[1] = parseInt(hex.charAt(0) + hex.charAt(0), 16);
				c[2] = parseInt(hex.charAt(1) + hex.charAt(1), 16);
				c[3] = parseInt(hex.charAt(2) + hex.charAt(2), 16);
			} else if (hex.length === 6 ) {
				c[1] = parseInt(hex.charAt(0) + hex.charAt(1), 16);
				c[2] = parseInt(hex.charAt(2) + hex.charAt(3), 16);
				c[3] = parseInt(hex.charAt(4) + hex.charAt(5), 16);
			} else {break;}
			c = "rgba(" + c[1] + ", " + c[2] + ", " + c[3] + ", " + alpha + ")";
			break;
		default: c = this; break;
	}
	return c;
};