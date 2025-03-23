///////////////////////////////////////////////////////////////////////////////////////////////////
// Globals
///////////////////////////////////////////////////////////////////////////////////////////////////

// This is our global textmode manager
var screenManager;

// The font that we will use
var sourceFont = new Image();
sourceFont.src = "font.png";


///////////////////////////////////////////////////////////////////////////////////////////////////
// Initialisation
///////////////////////////////////////////////////////////////////////////////////////////////////

function init() {
    // Initialise the textmode library
    screenManager = new TextModeScreen(40, 25, "mainCanvas", sourceFont);
    
    // Call our main loop at 25fps
    setInterval(mainLoop, 1000 / 25);
}


///////////////////////////////////////////////////////////////////////////////////////////////////
// The main loop
///////////////////////////////////////////////////////////////////////////////////////////////////

function mainLoop() {
    // Fill the screen with a spiral effect
    var spinAngle = Math.PI * 4 + Math.sin(Date.now() / 2000) * 2;
    var offsetAngle = 0.001 * Math.sin(Date.now() / 2000 - Math.PI * 0.5);
    var writePos = 0;
    for (y = 0; y < screenManager.charsHigh; y++) {
        for (x = 0; x < screenManager.charsWide; x++) {
            var oy = y - (screenManager.charsHigh / 2);
            var ox = x - (screenManager.charsWide / 2);
            var distSquared = (ox * ox) + (oy * oy);
            var angle = spinAngle + Math.atan2(ox, oy) + distSquared * offsetAngle;

            var colour = ((spinAngle + angle / Math.PI * 2 * 4) & 1) == 0 ? 0x89 : 0xa9;
            screenManager.charBuffer[writePos] = Math.random() * 255;
            screenManager.colourBuffer[writePos] = colour;
            writePos++;
        }
    }

    // Shadow an area of the screen, draw an outlined box and write some text in it
    screenManager.processBox(2, 2, 22, 3, function(charId, colourId) { return [charId, colourId & 0x77]; });
    screenManager.printBox(1, 1, 22, 3, 0x4f);
    screenManager.print(2, 2, " >> Hello world! << ", 0x4f);

    // Render the textmode screen to our canvas
    screenManager.presentToScreen();
}


