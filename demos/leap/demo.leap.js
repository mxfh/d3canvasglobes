console.info(cgd3.version);
cgd3.firstDraw();
cgd3.loadPreset(
  [
    [15, 40, 0],
    [15, 40, 0]
  ]
);
cgd3.toggleLakes(1);
cgd3.toggleGraticule(1);
cgd3.hideAllButFirstGlobe();
setTimeout(function() {
  cgd3.toggleHelp(0);
  console.info(
    ' on initial load auto-hide help after 15 seconds,' +
      ' show again by pressing \'H\''
  );
}, 15000);
//cgd3.setHeadlineString("");
//cgd3.toggleHeadline();

var latestFrame = {timestamp : 0},
	h = [[],[]],
	diffV = [0, 0],
	lastV = [[0, 0, 0], [0, 0, 0]],
	distance = [0, 0],
	maxHands = 1,
	maxSensitivity = 0.6,
	newConnection = 0,
	movementFactor =  [0.05, 0.05, 1],
	maxRange = 40; //set maxRange based on use in cm? should be smaller 80

function manipulateGlobe(i, v) {
	"use strict";
	cgd3.setRelativeRotation(i, [-v[0] * movementFactor[0], v[1] * movementFactor[1], 0]);
	//cgd3.setRotation(i, [v[2] * 220, v[1] * 120, v[0] * 180]);
	cgd3.drawGlobe(i);
	cgd3.drawInfo(1);
}
function moveGlobe(i) {
	"use strict";
	if (h[i][0] !== 0 && latestFrame.pointables.length > 0) {
		diffV[i] = [
			Math.abs(h[i][0] - lastV[i][0]) +
				Math.abs(h[i][2] - lastV[i][2])
		];
		if (diffV[i] > 0.5 && diffV[i] < 2000 && distance[i] < 1) {
			manipulateGlobe(i, [h[i][0], h[i][2], 0]);
			lastV[i] = h[i].slice(0);
		}
	} else { // Spin with Momentum
		//console.log(lastV[i]);
		if (Math.abs(lastV[i][0]) > 0.01 || Math.abs(lastV[i][2]) > 0.01 ) {
			manipulateGlobe(i, [lastV[i][0], lastV[i][2], 0]);
			lastV[i] = [lastV[i][0] * 0.9, 0, lastV[i][2] * 0.9];
		}
	}
}
function getHand(i) {
	"use strict";
	var j;
	try {
		distance[i] = Math.pow(
			(   latestFrame.hands[i].sphereCenter[0] * latestFrame.hands[i].sphereCenter[0] +
				latestFrame.hands[i].sphereCenter[1] * latestFrame.hands[i].sphereCenter[1] +
				latestFrame.hands[i].sphereCenter[2] * latestFrame.hands[i].sphereCenter[2]
				), 1/3) / maxRange;
		if (distance[i] < 1 && distance[i] > 0.2 ) {
			for (j = 0; j < 3; j += 1) {h[i][j] = latestFrame.hands[i].palmVelocity[j] * (1 - distance[i]);}
		//} else if (distance[i] <= maxSensitivity) {
		//	for (j = 0; j < 3; j += 1) {h[i][j] = latestFrame.hands[i].palmVelocity[j] * distance[i];}
		} else {h[i] = [0,0,0];}
	}
	catch(err) {h[i] = [0,0,0];}
}
Leap.loop(function(frame) {
	var i;
	if (!newConnection) {
		newConnection = 1;
		alert("Leap Motion controller detected.\n\n" +
			"current maximum interaction distance:\n" +	maxRange + " cm\n\n" +
			"For optimal interaction use\n" +
			"Leap SDK 0.7.5 or higher\n" +
			"with the following settings:\n\n" +
			"- low resource mode\n" +
			"- precision mode enabled\n" +
			"- robust mode disabled");
	}
	if (latestFrame !== frame) {
		latestFrame = frame;
		for (i = 0; i < maxHands; i += 1) {
			getHand(i);
		}
	}
	for (i = 0; i < maxHands; i += 1) {moveGlobe(i);}
});
