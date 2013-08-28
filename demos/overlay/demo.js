console.info(cgd3.version);
cgd3.firstDraw();
cgd3.loadPreset(1
  //[[15, 40, 0],[-45, 70, 0]]
);
cgd3.toggleLakes(1);
cgd3.toggleGraticule(0);
//cgd3.hideAllButFirstGlobe();
var helpTimer = 30; // initial load autohide help timer in seconds
setTimeout(function() {
  cgd3.toggleHelp(0);
  console.info(
    ' on initial load auto-hide help after ' + helpTimer + ' seconds,' +
      ' show again by pressing \'H\''
  );
}, helpTimer * 1000);
//cgd3.setHeadlineString("");
//cgd3.toggleHeadline();
