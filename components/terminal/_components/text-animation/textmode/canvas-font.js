export class CanvasFont {
  cachedColoredFonts = new Map();
  sourceFont = undefined;

  constructor(sourceFont) {
    this.sourceFont = sourceFont;
  }

  getColoredFont(color) {
    if (this.cachedColoredFonts.has(color)) {
      return this.cachedColoredFonts.get(color);
    }

    const coloredFont = document.createElement("canvas");
    coloredFont.width = this.sourceFont.width;
    coloredFont.height = this.sourceFont.height;
    const bufferContext =
      coloredFont.getContext("2d");
    bufferContext.fillStyle = color;
    bufferContext.fillRect(
      0,
      0,
      this.sourceFont.width,
      this.sourceFont.height
    );
    bufferContext.globalCompositeOperation =
      "destination-atop";
    bufferContext.drawImage(this.sourceFont, 0, 0);

    this.cachedColoredFonts.set(color, coloredFont);
    return coloredFont;
  }
}