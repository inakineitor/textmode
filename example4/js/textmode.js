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

  constructor(charsWide, charsHigh, containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      alert("Failed to find container element: " + containerId);
      return;
    }

    this.charsWide = charsWide;
    this.charsHigh = charsHigh;
    const bufferSize = charsWide * charsHigh;
    this.charBuffer = new Uint8Array(bufferSize);
    this.colourBuffer = new Uint8Array(bufferSize);

    // Buffers to store the state of the previous frame for optimization
    this.prevCharBuffer = new Uint8Array(bufferSize);
    this.prevColourBuffer = new Uint8Array(bufferSize);
    // Initialize with a value that will force initial render, e.g., -1 if your char/color codes are non-negative
    // Or, more simply, ensure they are different from the initial charBuffer/colourBuffer state if it's all zeros/spaces.
    // For Uint8Array, they default to 0. If charBuffer[0] could be 0 (e.g. space or null char),
    // and colourBuffer[0] could be 0 (e.g. black on black), we need a different strategy for the first frame.
    // A simple way is to fill them with a value that is unlikely to be the initial state, or use a 'firstRender' flag.
    // Let's fill prevColourBuffer with a value that will ensure the first frame updates all colors.
    // charCode 0 (null) is often rendered as space or nothing, so a diff check is usually fine.
    this.prevColourBuffer.fill(255); // Fill with an invalid color index to force initial color set.
    // prevCharBuffer defaults to 0s, charBuffer also defaults to 0s (which we treat as space)
    // So, if initial screen is all spaces, textContent won't update unless explicitly set.
    // Let's ensure first paint of characters if charBuffer is not all 0s.
    // The initial charBuffer is all 0s. presentToScreen treats 0 as space. So this should be fine.


    // Initialize the text container
    this.container.style.display = "grid";
    this.container.style.gridTemplateColumns = `repeat(${this.charsWide}, auto)`;
    this.container.style.gridTemplateRows = `repeat(${this.charsHigh}, auto)`;
    
    this.textCells = [];
    this.container.innerHTML = ''; // Clear existing content

    const fragment = document.createDocumentFragment(); // Create a DocumentFragment

    for (let i = 0; i < bufferSize; i++) {
        const cell = document.createElement("span");
        cell.textContent = " "; 
        cell.style.display = "inline-block";
        cell.style.backgroundColor = this.#COLOR_TABLE[0]; 
        cell.style.color = this.#COLOR_TABLE[15]; 
        fragment.appendChild(cell); // Append cell to fragment
        this.textCells.push(cell);
    }
    this.container.appendChild(fragment); // Append fragment to container once
  }

  /**
   * Render buffers to the HTML. Only update changed cells.
   * */
  presentToScreen() {
    for (let i = 0; i < this.textCells.length; i++) {
      const charId = this.charBuffer[i];
      const colorId = this.colourBuffer[i];
      const prevCharId = this.prevCharBuffer[i];
      const prevColorId = this.prevColourBuffer[i];
      const cell = this.textCells[i];

      const isTargetVisible = (colorId !== 0); // colorId 0 means black foreground & black background
      const wasPreviouslyVisible = (prevColorId !== 0);

      if (isTargetVisible) {
        // Cell is intended to be visible.
        // Update character if it changed OR if it was previously invisible (to show correct char).
        if (charId !== prevCharId || !wasPreviouslyVisible) {
          let character = String.fromCharCode(charId);
          // Ensure null characters (charId 0) are rendered as spaces when visible.
          if (charId === 0) { 
            character = " "; 
          }
          cell.textContent = character;
        }
        
        // Update colors if they changed OR if it was previously invisible.
        if (colorId !== prevColorId || !wasPreviouslyVisible) {
          cell.style.backgroundColor = this.#COLOR_TABLE[colorId >> 4];
          cell.style.color = this.#COLOR_TABLE[colorId & 0x0F];
        }
      } else {
        // Cell is intended to be invisible (black-on-black).
        // Only update the DOM if it was previously visible to make it invisible.
        if (wasPreviouslyVisible) {
          cell.style.backgroundColor = this.#COLOR_TABLE[0]; // Black
          cell.style.color = this.#COLOR_TABLE[0];          // Black
          // Set textContent to a space for consistency when becoming invisible.
          if (cell.textContent !== " ") { 
            cell.textContent = " "; 
          }
        }
        // If target is invisible AND was already invisible, do nothing.
      }
    }

    // After rendering, save the current state as the previous state for the next frame
    this.prevCharBuffer.set(this.charBuffer);
    this.prevColourBuffer.set(this.colourBuffer);
  }

  /**
   * Print a string
   */
  print(x, y, text, color) {
    if (y < 0 || y >= this.charsHigh) return;

    for (let i = 0; i < text.length; i++) {
      const currentX = x + i;
      if (currentX < 0 || this.charsWide <= currentX) continue;

      const writePosition = currentX + y * this.charsWide;
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
    const topLeft = 201;    // CP437 for ╔ (double line)
    const top = 205;        // CP437 for ═ (double line)
    const topRight = 187;   // CP437 for ╗ (double line)
    const left = 186;       // CP437 for ║ (double line)
    const right = 186;      // CP437 for ║ (double line)
    const bottomLeft = 200; // CP437 for ╚ (double line)
    const bottom = 205;     // CP437 for ═ (double line)
    const bottomRight = 188;// CP437 for ╝ (double line)
    const space = 32; // Space character code

    const startX = Math.max(0, x);
    const startY = Math.max(0, y);
    const endX = Math.min(this.charsWide, x + width);
    const endY = Math.min(this.charsHigh, y + height);

    for (let curY = startY; curY < endY; curY++) {
        for (let curX = startX; curX < endX; curX++) {
            const writePos = curX + curY * this.charsWide;
            let charToPrint = space;

            if (curX === x && curY === y) charToPrint = topLeft;
            else if (curX === (x + width - 1) && curY === y) charToPrint = topRight;
            else if (curX === x && curY === (y + height - 1)) charToPrint = bottomLeft;
            else if (curX === (x + width - 1) && curY === (y + height - 1)) charToPrint = bottomRight;
            else if (curY === y || curY === (y + height - 1)) charToPrint = top;
            else if (curX === x || curX === (x + width - 1)) charToPrint = left;

            const isOnBorder = (curX === x || curX === (x + width - 1) || curY === y || curY === (y + height - 1));
            
            if (curY >= y && curY < (y+height) && curX >=x && curX < (x+width)) {
                if (isOnBorder) {
                    this.charBuffer[writePos] = charToPrint;
                } else {
                    this.charBuffer[writePos] = space;
                }
                this.colourBuffer[writePos] = color;
            }
        }
    }
  }

  /**
   * Process a group of characters with a user defined function
   */
  processBox(x, y, w, h, func) {
    const startY = Math.max(0, y);
    const endY = Math.min(this.charsHigh, y + h);
    const startX = Math.max(0, x);
    const endX = Math.min(this.charsWide, x + w);

    for (let curY = startY; curY < endY; curY++) {
      for (let curX = startX; curX < endX; curX++) {
        if (curX >= x && curX < (x + w) && curY >= y && curY < (y + h)) {
            const readWritePos = curX + curY * this.charsWide;
            
            const charId = this.charBuffer[readWritePos];
            const colorId = this.colourBuffer[readWritePos];
            const results = func(charId, colorId);
            if (results && results.length === 2) {
                this.charBuffer[readWritePos] = results[0];
                this.colourBuffer[readWritePos] = results[1];
            }
        }
      }
    }
  }
}
