// utils.js - Utility functions for the text-mode demo

import { CONFIG } from './config.js';

/**
 * Clamps a number between min and max values
 */
export function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

/**
 * Calculates screen dimensions based on canvas element
 */
export function calculateScreenDimensions(canvasEl) {
    // Synchronize canvas buffer dimensions with its CSS dimensions.
    // This ensures that 1 CSS pixel = 1 canvas pixel, for crisp rendering.
    const displayWidth = canvasEl.clientWidth;
    const displayHeight = canvasEl.clientHeight;

    if (canvasEl.width !== displayWidth || canvasEl.height !== displayHeight) {
        canvasEl.width = displayWidth;
        canvasEl.height = displayHeight;
    }

    // Now, use canvasEl.width and canvasEl.height as the authoritative pixel dimensions
    const currentCanvasWidth = canvasEl.width;
    const currentCanvasHeight = canvasEl.height;

    // Calculate the number of rows based on the target character pixel height.
    // Ensure at least 1 row.
    let numRows = Math.max(1, Math.floor(currentCanvasHeight / CONFIG.TARGET_CHAR_PIXEL_HEIGHT));

    // Calculate the actual pixel height of each character cell to fill the canvas height evenly.
    // Ensure actualCharHeight is non-negative.
    const actualCharHeight = numRows > 0 ? currentCanvasHeight / numRows : 0;

    const charAspectRatio = 16 / 24;

    // Calculate the ideal character width if aspect ratio were perfectly preserved based on actualCharHeight
    const idealCharWidth = actualCharHeight * charAspectRatio;

    // Determine minimum number of columns required to fit content
    const nameArtLines = CONFIG.NAME_ART.split('\n');
    const maxNameArtContentLength = nameArtLines.reduce((maxLen, line) => Math.max(maxLen, line.length), 0);
    // NameAnimator adds 1 space padding on each side of each line string it processes,
    // so the effective width needed is max content length + 2.
    const nameArtEffectiveWidth = maxNameArtContentLength + 2;
    const scrollSignEffectiveWidth = CONFIG.SCROLL_SIGN.TEXT.length + CONFIG.SCROLL_SIGN.BOX_WIDTH_PADDING;
    const minContentRequiredCols = Math.max(1, nameArtEffectiveWidth, scrollSignEffectiveWidth);

    let numCols;
    // Calculate number of columns
    // It must be at least minContentRequiredCols.
    // If possible, it should also accommodate currentCanvasWidth with idealCharWidth.
    if (idealCharWidth > 0 && currentCanvasWidth > 0) {
        const numColsBasedOnIdealWidthAndCanvas = Math.max(1, Math.floor(currentCanvasWidth / idealCharWidth));
        numCols = Math.max(minContentRequiredCols, numColsBasedOnIdealWidthAndCanvas);
    } else {
        // Fallback if idealCharWidth is not positive (e.g., actualCharHeight is 0)
        // or if currentCanvasWidth is 0.
        // In such cases, numColsBasedOnIdealWidthAndCanvas is not meaningful or calculable.
        // Prioritize minContentRequiredCols, with a system fallback if needed.
        numCols = Math.max(minContentRequiredCols, 10); // 10 was an original fallback for numCols in some scenarios
        if (idealCharWidth <= 0) {
            console.warn("Calculated idealCharWidth is not positive. numCols might not preserve ideal aspect ratio.");
        }
        if (currentCanvasWidth <= 0) {
            console.warn("currentCanvasWidth is not positive. numCols calculation is primarily based on content requirements.");
        }
    }

    // Calculate final character width based on chosen numCols and currentCanvasWidth.
    // This width will be used for rendering and ensures all columns fit.
    // Aspect ratio might be altered if numCols was dictated by minContentRequiredCols
    // and (currentCanvasWidth / numCols) differs significantly from idealCharWidth.
    const finalCharWidth = (numCols > 0 && currentCanvasWidth > 0) ? currentCanvasWidth / numCols : 0;

    if (finalCharWidth <= 0 && currentCanvasWidth > 0 && numCols > 0) {
        // This condition implies an issue if finalCharWidth is zero despite positive canvas width and columns.
        // It could happen if currentCanvasWidth is positive but extremely small relative to numCols.
        console.warn("Calculated finalCharWidth is zero or negative despite positive canvas width and columns. This might lead to rendering issues.", { currentCanvasWidth, numCols, finalCharWidth });
    }

    return { numRows, numCols, actualCharHeight, charWidth: finalCharWidth };
}

/**
 * Returns a random bright color
 */
export function randomBrightColor() {
    // Corrected palette: bright colors are 10-14 (inclusive)
    // Base is 10, and there are 5 possibilities (10, 11, 12, 13, 14).
    return 10 + Math.floor(Math.random() * 5);
}

/**
 * Returns a boolean mask where `true` means the character is revealed and `false` means it is masked.
 * This mask has exactly `charsRevealedNum` characters revealed. There should be a difference of only 1
 * in the mask between `generateRandomMask(str, n)` and `generateRandomMask(str, n + 1)`. The function
 * output should be deterministic given the random seed.
 */
export function generateRandomMask(length, revealedNum, seed) {
    const mask = new Array(length).fill(false);
    let currentSeed = seed;

    const indices = Array.from({ length }, (_, i) => i);

    for (let i = indices.length - 1; i > 0; i--) {
        currentSeed = (currentSeed * 9301 + 49297) % 233280;
        const j = currentSeed % (i + 1);
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    for (let i = 0; i < revealedNum; i++) {
        if (indices[i] !== undefined) { // Ensure index is valid
            mask[indices[i]] = true;
        }
    }
    return mask;
}

/**
 * Provides random characters (as ASCII codes) from a given source string,
 * excluding whitespace. Unique characters are pre-calculated for O(1) retrieval.
 */
export class RandomCharProvider {
    /**
     * @param {string} sourceString The string to source characters from.
     *                              Typically, this would be CONFIG.NAME_ART.
     */
    constructor(sourceString) {
        // Remove all whitespace characters (spaces, newlines, tabs, etc.),
        // then split the remaining string into an array of characters.
        const charactersArray = sourceString.replace(/\s/g, "").split("");
        // Store only unique characters from this array.
        this.uniqueCharactersArray = [...new Set(charactersArray)];
    }

    /**
     * Returns the ASCII code of a random character from the unique set derived
     * from the source string during construction.
     * This operation is O(1) after the initial setup.
     * @returns {number} ASCII code of a random character. Returns 0 if the source string
     *                   contained no non-whitespace characters.
     */
    getRandomCharAscii() {
        if (this.uniqueCharactersArray.length === 0) {
            return 0; // Default value (e.g., for space or null char) if no valid characters are available
        }
        // Select a random character from the pre-calculated unique set.
        const randomIndex = Math.floor(Math.random() * this.uniqueCharactersArray.length);
        const randomChar = this.uniqueCharactersArray[randomIndex];
        return randomChar.charCodeAt(0);
    }
} 