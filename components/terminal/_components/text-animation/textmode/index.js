// textmode.js - Text mode screen management

import { CanvasFont } from "./canvas-font.js";

const CHARACTER_WIDTH = 16;
const CHARACTER_HEIGHT = 24;

export class TextModeScreen {
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
		this.backgroundColorBuffer = Array(charsWide * charsHigh).fill("transparent");
		this.foregroundColorBuffer = Array(charsWide * charsHigh).fill("transparent");

		// Create foreground font colours
		this.canvasFont = new CanvasFont(sourceFont);
	}

	/**
	 * Render buffers to the HTML canvas
	 * */
	presentToScreen() {
		// Clear the entire canvas to ensure transparency works correctly
		this.context2d.clearRect(
			0,
			0,
			this.context2d.canvas.width,
			this.context2d.canvas.height
		);

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
			// Direct CSS color strings
			const backgroundColor = this.backgroundColorBuffer[readPosition];
			const foregroundColor = this.foregroundColorBuffer[readPosition];

			const characterSpriteX = (charId & 0x0f) * CHARACTER_WIDTH;
			const characterSpriteY = (charId >> 4) * CHARACTER_HEIGHT;

			// Draw background
			this.context2d.fillStyle = backgroundColor;
			this.context2d.fillRect(
				startX,
				startY,
				CHARACTER_WIDTH,
				CHARACTER_HEIGHT
			);

			// Only draw the character if the foreground color is not transparent
			if (foregroundColor !== "transparent") {
				this.context2d.drawImage(
					this.canvasFont.getColoredFont(foregroundColor),
					characterSpriteX,
					characterSpriteY,
					CHARACTER_WIDTH,
					CHARACTER_HEIGHT,
					startX,
					startY,
					CHARACTER_WIDTH,
					CHARACTER_HEIGHT
				);
			}
		}
	}

	/**
	 * Print a string
	 * @param {number} x - X position
	 * @param {number} y - Y position  
	 * @param {string} text - Text to print
	 * @param {string[]} colorTuple - [background, foreground] CSS color strings
	 */
	print(x, y, text, colorTuple) {
		if (y < 0 || y >= this.charsHigh) return;

		const [background, foreground] = colorTuple;
		for (let i = 0; i < text.length; i++) {
			if (x + i < 0 || this.charsWide <= x + i) continue;

			const writePosition = x + y * this.charsWide + i;
			this.charBuffer[writePosition] = text.charCodeAt(i);
			this.backgroundColorBuffer[writePosition] = background;
			this.foregroundColorBuffer[writePosition] = foreground;
		}
	}

	/**
	 * Print an outlined box
	 * @param {number} x - X position
	 * @param {number} y - Y position
	 * @param {number} width - Width
	 * @param {number} height - Height
	 * @param {string[]} colorTuple - [background, foreground] CSS color strings
	 */
	printBox(x, y, width, height, colorTuple) {
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
			`${topLeft}${Array(innerWidth + 1).join(
				top
			)}${topRight}`,
			colorTuple
		);
		for (let j = y + 1; j < y + height - 1; j++) {
			this.print(
				x,
				j,
				`${left}${Array(innerWidth + 1).join(
					" "
				)}${right}`,
				colorTuple
			);
		}
		this.print(
			x,
			y + height - 1,
			`${bottomLeft}${Array(innerWidth + 1).join(
				bottom
			)}${bottomRight}`,
			colorTuple
		);
	}

	/**
	 * Process a group of characters with a user defined function
	 * @param {number} x - X position
	 * @param {number} y - Y position
	 * @param {number} w - Width
	 * @param {number} h - Height
	 * @param {function} func - Function that takes (charId, [background, foreground]) and returns [charId, [background, foreground]]
	 */
	processBox(x, y, w, h, func) {
		for (let sy = y; sy < y + h; sy++) {
			if (sy < 0 || this.charsHigh < sy) continue;

			for (let i = 0; i < w; i++) {
				const sx = x + i;
				const readWritePos =
					x + sy * this.charsWide + i;

				if (sx < 0 || this.charsWide < sx) continue;

				const charId = this.charBuffer[readWritePos];
				const backgroundColor = this.backgroundColorBuffer[readWritePos];
				const foregroundColor = this.foregroundColorBuffer[readWritePos];
				const colorTuple = [backgroundColor, foregroundColor];
				const results = func(charId, colorTuple);
				this.charBuffer[readWritePos] = results[0];
				const [newBackground, newForeground] = results[1];
				this.backgroundColorBuffer[readWritePos] = newBackground;
				this.foregroundColorBuffer[readWritePos] = newForeground;
			}
		}
	}
}

export { CHARACTER_WIDTH, CHARACTER_HEIGHT };
