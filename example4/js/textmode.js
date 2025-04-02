const CHARACTER_WIDTH = 16;
const CHARACTER_HEIGHT = 24;

class TextModeScreen {
  /**
   * 16 value colour table
   */
  #COLOR_TABLE = [
    "#000000",
    "#0000AA",
    "#00AA00",
    "#00AAAA",
    "#AA0000",
    "#AA00AA",
    "#AA5500",
    "#AAAAAA",
    "#555555",
    "#5555FF",
    "#55FF55",
    "#55FFFF",
    "#FF5555",
    "#FF55FF",
    "#FFFF55",
    "#FFFFFF",
  ];

  constructor(charsWide, charsHigh, canvas, sourceFont) {
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
    canvas.width = charsWide * CHARACTER_WIDTH;
    canvas.height = charsHigh * CHARACTER_HEIGHT;
    this.charsWide = charsWide;
    this.charsHigh = charsHigh;
    this.charBuffer = new Uint8Array(charsWide * charsHigh);
    this.colourBuffer = new Uint8Array(charsWide * charsHigh);

    // Create foreground font colours
    this.coloredFonts = new Array(this.#COLOR_TABLE.length);
    for (let i = 0; i < this.coloredFonts.length; i++) {
      this.coloredFonts[i] = document.createElement("canvas");
      this.coloredFonts[i].width = sourceFont.width;
      this.coloredFonts[i].height = sourceFont.height;
      const bufferContext = this.coloredFonts[i].getContext("2d");
      bufferContext.fillStyle = this.#COLOR_TABLE[i];
      bufferContext.fillRect(0, 0, sourceFont.width, sourceFont.height);
      bufferContext.globalCompositeOperation = "destination-atop";
      bufferContext.drawImage(sourceFont, 0, 0);
    }
  }

  /**
   * Render buffers to the HTML canvas
   * */
  presentToScreen() {
    for (
      let readPosition = 0;
      readPosition < this.charsWide * this.charsHigh;
      readPosition++
    ) {
      const x = readPosition % this.charsWide;
      const y = Math.floor(readPosition / this.charsWide);

      const startY = y * CHARACTER_HEIGHT;
      const startX = x * CHARACTER_WIDTH;

      const charId = this.charBuffer[readPosition];
      const colorId = this.colourBuffer[readPosition];

      const characterSpriteX = (charId & 0x0f) * CHARACTER_WIDTH;
      const characterSpriteY = (charId >> 4) * CHARACTER_HEIGHT;

      this.context2d.fillStyle = this.#COLOR_TABLE[colorId >> 4];
      this.context2d.fillRect(
        startX,
        startY,
        CHARACTER_WIDTH,
        CHARACTER_HEIGHT,
      );
      this.context2d.drawImage(
        this.coloredFonts[colorId & 15],
        characterSpriteX,
        characterSpriteY,
        CHARACTER_WIDTH,
        CHARACTER_HEIGHT,
        startX,
        startY,
        CHARACTER_WIDTH,
        CHARACTER_HEIGHT,
      );
    }
  }

  /**
   * Print a string
   */
  print(x, y, text, color) {
    if (y < 0 || y >= this.charsHigh) return;

    for (let i = 0; i < text.length; i++) {
      if (x + i < 0 || this.charsWide <= x + i) continue;

      const writePosition = x + y * this.charsWide + i;
      this.charBuffer[writePosition] = text.charCodeAt(i);
      this.colourBuffer[writePosition] = color;
    }
  }

  /**
   * Print an outlined box
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number} color - Color
   */
  printBox(x, y, width, height, color) {
    const topLeft = String.fromCharCode(201);
    const top = String.fromCharCode(205);
    const topRight = String.fromCharCode(187);
    const left = String.fromCharCode(186);
    const right = String.fromCharCode(186);
    const bottomLeft = String.fromCharCode(200);
    const bottom = String.fromCharCode(205);
    const bottomRight = String.fromCharCode(188);

    const innerWidth = width - 2;
    this.print(
      x,
      y,
      `${topLeft}${Array(innerWidth + 1).join(top)}${topRight}`,
      color,
    );
    for (let j = y + 1; j < y + height - 1; j++) {
      this.print(
        x,
        j,
        `${left}${Array(innerWidth + 1).join(" ")}${right}`,
        color,
      );
    }
    this.print(
      x,
      y + height - 1,
      `${bottomLeft}${Array(innerWidth + 1).join(bottom)}${bottomRight}`,
      color,
    );
  }

  /**
   * Process a group of characters with a user defined function
   */
  processBox(x, y, w, h, func) {
    for (let sy = y; sy < y + h; sy++) {
      if (sy < 0 || this.charsHigh < sy) continue;

      for (let i = 0; i < w; i++) {
        const sx = x + i;
        const readWritePos = x + sy * this.charsWide + i;

        if (sx < 0 || this.charsWide < sx) continue;

        const charId = this.charBuffer[readWritePos];
        const colorId = this.colourBuffer[readWritePos];
        const results = func(charId, colorId);
        this.charBuffer[readWritePos] = results[0];
        this.colourBuffer[readWritePos] = results[1];
      }

      // let readWritePos = x + sy * this.charsWide;
      // for (let sx = x; sx < x + w; sx++, readWritePos++) {
      //   if (sx < 0 || this.charsWide < sx) continue;
      //
      //   const charId = this.charBuffer[readWritePos];
      //   const colorId = this.colourBuffer[readWritePos];
      //   const results = func(charId, colorId);
      //   this.charBuffer[readWritePos] = results[0];
      //   this.colourBuffer[readWritePos] = results[1];
      // }
    }
  }
}
