///////////////////////////////////////////////////////////////////////////////////////////////////
// Globals
///////////////////////////////////////////////////////////////////////////////////////////////////

// This is our global textmode manager
var screenManager;

// The font that we will use
var sourceFont = new Image();
sourceFont.src = "font.png";

// Background and overlay images. These are the same size as the canvas so that they don't get 
// stretched or shrunk
var background = new Image();
background.src = "background.png";
var overlay = new Image();
overlay.src = "overlay.png";

// We want to keep track of time
var startTime = 0;


///////////////////////////////////////////////////////////////////////////////////////////////////
// Initialisation
///////////////////////////////////////////////////////////////////////////////////////////////////

function init() {
    // Initialise the textmode library
    screenManager = new TextModeScreen(40, 25, "mainCanvas", sourceFont);
    
    // Call our main loop at 25fps
    startTime = Date.now();
    setInterval(mainLoop, 1000 / 25);
}


///////////////////////////////////////////////////////////////////////////////////////////////////
// The main loop
///////////////////////////////////////////////////////////////////////////////////////////////////

function mainLoop() {
    var timeInSecondsSinceStart = (Date.now() - startTime) / 1000;

    // Fill the screen with a zooming circle effect
    var zoomOffset = timeInSecondsSinceStart
    var spinAngle = Math.PI * 4 + (timeInSecondsSinceStart * 0.5);
    var aspectCorrect = screenManager.charsHigh / screenManager.charsWide;
    var writePos = 0;
    for (y = 0; y < screenManager.charsHigh; y++) {
        for (x = 0; x < screenManager.charsWide; x++) {
            var oy = y - (screenManager.charsHigh / 2);
            var ox = (x - (screenManager.charsWide / 2)) * aspectCorrect;
            var distance = Math.sqrt((ox * ox) + (oy * oy));
            var angle = Math.atan2(ox, oy);

            if (((zoomOffset -   distance * 0.125) % 1) > 0.5) {
                screenManager.charBuffer[writePos] = (spinAngle + (angle / Math.PI * 2) & 1) == 0 ? 32 : 177;
                screenManager.colourBuffer[writePos] = (spinAngle - (angle / Math.PI * 2) & 1) == 0 ? 0xca : 0xdb;
            } else {
                screenManager.colourBuffer[writePos] = 0x00;
            }
            writePos++;
        }
    }

    // Draw an outlined box with a drop shadow and write some text in it. Use "time since start"
    // to make the text appear
    if (timeInSecondsSinceStart >= 2.0) {
        screenManager.processBox(2, 2, 29, 5, function(charId, colourId) { return [charId, colourId & 0x77]; });
        screenManager.printBox(1, 1, 29, 5, 0x1f);
        var textToPrint = "Suddenly, the octopus was\ntransported to another\ndimension...";
        var charsToDisplay = (timeInSecondsSinceStart - 2.5) * 15;
        screenManager.print(3, 2, textToPrint.substring(0, charsToDisplay), 0x1f);
    }
    
    // Render the background, then the textmode buffer, then put the overlay on top
    screenManager.context2d.drawImage(background, 0, 0);
    screenManager.presentToScreen(0x00);
    screenManager.context2d.drawImage(overlay, 0, 0);
}


