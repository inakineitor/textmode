///////////////////////////////////////////////////////////////////////////////////////////////////
// 16 value colour table
///////////////////////////////////////////////////////////////////////////////////////////////////

var colourTable = ['#000000', '#0000AA', '#00AA00', '#00AAAA',
                   '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
                   '#555555', '#5555FF', '#55FF55', '#55FFFF', 
                   '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'];


///////////////////////////////////////////////////////////////////////////////////////////////////
// Initialise the textmode object
///////////////////////////////////////////////////////////////////////////////////////////////////

function TextModeScreen(charsWide, charsHigh, canvasName, sourceFont) {
    var canvas = document.getElementById(canvasName);
    if (!canvas) {
        alert("Failed to find canvas");
        return;
    }
    this.context2d = canvas.getContext("2d");
    if (!this.context2d) {
        alert("Couldn't get 2d context on canvas");
        return;
    }
    
    // Setup canvas size and buffers
    canvas.width = charsWide * 16;
    canvas.height = charsHigh * 24;
    this.charsWide = charsWide;
    this.charsHigh = charsHigh;
    this.charBuffer = new Uint8Array(charsWide * charsHigh)
    this.colourBuffer = new Uint8Array(charsWide * charsHigh)

    // Create foreground font colours
    this.colouredFonts = new Array(16);
    for (i = 0; i < 16; i++) {
        this.colouredFonts[i] = document.createElement('canvas');
        this.colouredFonts[i].width = sourceFont.width;
        this.colouredFonts[i].height = sourceFont.height;
        var bufferContext = this.colouredFonts[i].getContext('2d');
        bufferContext.fillStyle = colourTable[i];
        bufferContext.fillRect(0, 0, sourceFont.width, sourceFont.height);
        bufferContext.globalCompositeOperation = "destination-atop";
        bufferContext.drawImage(sourceFont, 0, 0);
    }
}


///////////////////////////////////////////////////////////////////////////////////////////////////
// Render buffers to the HTML canvas
///////////////////////////////////////////////////////////////////////////////////////////////////

TextModeScreen.prototype.presentToScreen = function() {
    var readPos = 0;
    var sy = 0;
    for (y = 0; y < this.charsHigh; y++) {
        var sx = 0;
        for (x = 0; x < this.charsWide; x++) {
            var charId = this.charBuffer[readPos];
            var colourId = this.colourBuffer[readPos];
            readPos++;

            var cx = (charId & 0x0f) * 16;
            var cy = (charId >> 4) * 24;
            this.context2d.fillStyle = colourTable[colourId >> 4];
            this.context2d.fillRect(sx, sy, 16, 24);
            this.context2d.drawImage(this.colouredFonts[colourId & 15], cx, cy, 16, 24, sx, sy, 16, 24);
            
            sx += 16;
        }
        sy += 24;
    }
}


///////////////////////////////////////////////////////////////////////////////////////////////////
// Print a string
///////////////////////////////////////////////////////////////////////////////////////////////////

TextModeScreen.prototype.print = function(x, y, text, colour) {
    if (y >= 0 && y < this.charsHigh) {
        var writePos = x + y * this.charsWide;
        for (i = 0; i < text.length; i++) {
            if (x + i >= 0 && x + i < this.charsWide) {
                this.charBuffer[writePos] = text.charCodeAt(i);
                this.colourBuffer[writePos] = colour;
            }
            writePos++;
        }
    }
}


///////////////////////////////////////////////////////////////////////////////////////////////////
// Print an outlined box
///////////////////////////////////////////////////////////////////////////////////////////////////

TextModeScreen.prototype.printBox = function(x, y, w, h, colour) {
    var innerWidth = w - 2;
    this.print(x, y, String.fromCharCode(201) + Array(innerWidth + 1).join(String.fromCharCode(205)) + String.fromCharCode(187), colour);
    for (j = y + 1; j < y + h - 1; j++) {
        this.print(x, j, String.fromCharCode(186) + Array(innerWidth + 1).join(" ") + String.fromCharCode(186), colour);
    }
    this.print(x, y + h - 1, String.fromCharCode(200) + Array(innerWidth + 1).join(String.fromCharCode(205)) + String.fromCharCode(188), colour);
}


///////////////////////////////////////////////////////////////////////////////////////////////////
// Process a group of characters with a user defined function
///////////////////////////////////////////////////////////////////////////////////////////////////

TextModeScreen.prototype.processBox = function(x, y, w, h, func) {
    for (sy = y; sy < y + h; sy++) {
        if (sy >= 0 && sy <= this.charsHigh) {
            var readWritePos = x + sy * this.charsWide;
            for (sx = x; sx < x + w; sx++) {
                if (sx >= 0 && sx <= this.charsWide) {
                    var charId = this.charBuffer[readWritePos];
                    var colourId = this.colourBuffer[readWritePos];
                    var results = func(charId, colourId);
                    this.charBuffer[readWritePos] = results[0];
                    this.colourBuffer[readWritePos] = results[1];
                }
                readWritePos++;
            }
        }
    }
}