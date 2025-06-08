// NameAnimator.js - Handles name animation effects

import { clamp, generateRandomMask } from './utils.js';
import { randomBrightColor } from './utils.js';

/**
 * Animates the display of text with a randomized reveal effect
 */
export class NameAnimator {
    constructor(screenManager, nameArtString, config) {
        this.screenManager = screenManager;
        this.nameArtString = nameArtString;
        this.config = config.NAME_ANIM;
        this.randomSeed = config.RANDOM_SEED;
        this._processNameArt();
    }

    _processNameArt() {
        this.nameInRows = this.nameArtString.split("\n").map((row) => ` ${row} `);
        this.nameWidth = this.nameInRows[0].length;
        this.nameHeight = this.nameInRows.length;
        this.mergedName = [
            " ".repeat(this.nameWidth),
            ...this.nameInRows,
            " ".repeat(this.nameWidth),
        ].join("");
    }

    update(timeInSecondsSinceStart, previousBackgroundColorBuffer, previousForegroundColorBuffer) {
        const { REVEAL_OFFSET_TIME_SEC, REVEAL_SPEED_FACTOR, LAG_FRAMES_1, LAG_FRAMES_2, START_ROW_FACTOR } = this.config;

        const baseRevealCount = Math.floor((timeInSecondsSinceStart - REVEAL_OFFSET_TIME_SEC) * REVEAL_SPEED_FACTOR);

        const numberOfCharsRevealed = clamp(baseRevealCount, 0, this.mergedName.length);
        const revealedMask = generateRandomMask(this.mergedName.length, numberOfCharsRevealed, this.randomSeed);

        const laggedRevealCount = clamp(baseRevealCount - LAG_FRAMES_1, 0, this.mergedName.length);
        const laggedRevealedMask = generateRandomMask(this.mergedName.length, laggedRevealCount, this.randomSeed);

        const veryLaggedRevealCount = clamp(baseRevealCount - LAG_FRAMES_2, 0, this.mergedName.length);
        const veryLaggedRevealedMask = generateRandomMask(this.mergedName.length, veryLaggedRevealCount, this.randomSeed);

        const startRow = Math.floor((this.screenManager.charsHigh - this.nameHeight) * START_ROW_FACTOR);
        const startCol = Math.floor((this.screenManager.charsWide - this.nameWidth) / 2);

        const terminalTextColor = getComputedStyle(document.getElementsByClassName("terminal")[0]).getPropertyValue("color");

        for (let i = 0; i < this.mergedName.length; i++) {
            if (!revealedMask[i]) continue;

            const char = this.mergedName[i];
            const row = Math.floor(i / this.nameWidth);
            const col = i % this.nameWidth;

            if (char === " ") {
                const adjacentIndices = [
                    i - this.nameWidth - 1, i - this.nameWidth, i - this.nameWidth + 1,
                    i - 1, i + 1,
                    i + this.nameWidth - 1, i + this.nameWidth, i + this.nameWidth + 1,
                ];
                let hasNonSpaceNeighbor = false;
                for (const adjIdx of adjacentIndices) {
                    if (adjIdx >= 0 && adjIdx < this.mergedName.length) {
                        // Check if the character at mergedName[adjIdx] is part of the original name rows, not the padding
                        const adjRow = Math.floor(adjIdx / this.nameWidth);
                        if (adjRow > 0 && adjRow <= this.nameHeight) { // Only consider neighbors within the actual name rows (excluding top/bottom padding)
                            if (this.mergedName[adjIdx] !== " ") {
                                hasNonSpaceNeighbor = true;
                                break;
                            }
                        }
                    }
                }
                if (!hasNonSpaceNeighbor) continue;
            }

            const charPos = startCol + col + (startRow + row) * this.screenManager.charsWide;
            const prevBackgroundColor = previousBackgroundColorBuffer[charPos];
            const prevForegroundColor = previousForegroundColorBuffer[charPos];
            const prevColor = [prevBackgroundColor, prevForegroundColor];
            const displayedLongAgo = laggedRevealedMask[i];
            const setWhite = veryLaggedRevealedMask[i];

            this.screenManager.print(
                startCol + col,
                startRow + row,
                char,
                setWhite ? ["transparent", terminalTextColor] : displayedLongAgo ? prevColor : randomBrightColor()
            );
        }
    }
} 