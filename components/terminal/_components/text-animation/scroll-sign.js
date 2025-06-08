// ScrollSign.js - Manages the "Scroll down to learn more" animation

import { randomBrightColor, clamp } from './utils.js';

/**
 * Animates a "Scroll down to learn more" sign with box and flashing text
 */
export class ScrollSign {
    constructor(screenManager, config) {
        this.screenManager = screenManager;
        this.config = config.SCROLL_SIGN;
        this.instructionText = this.config.TEXT;
        this._generateCoordinates();
        this.flashCharColorStates = new Map(); // To store { color, lastChangeTime } for flashing chars
    }

    _generateCoordinates() {
        this.coordinates = [];
        const sm = this.screenManager;
        const conf = this.config;

        const startRowText = Math.floor(sm.charsHigh * conf.START_ROW_FACTOR);
        const startColText = Math.floor((sm.charsWide - this.instructionText.length) / 2);

        const boxX = startColText - Math.floor(conf.BOX_WIDTH_PADDING / 2);
        const boxY = startRowText - 1;
        const boxWidth = this.instructionText.length + conf.BOX_WIDTH_PADDING;
        const boxHeight = conf.BOX_HEIGHT;

        const { TOP_LEFT, TOP, TOP_RIGHT, LEFT, RIGHT, BOTTOM_LEFT, BOTTOM, BOTTOM_RIGHT } = conf.BORDER_CHARS;

        // Initial clear for the box area (using spaces)
        for (let r = 0; r < boxHeight; r++) {
            for (let c = 0; c < boxWidth; c++) {
                this.coordinates.push([boxX + c, boxY + r, " "]);
            }
        }

        // Draw border
        // Top edge
        for (let i = 0; i < boxWidth; i++) {
            const charCode = i === 0 ? TOP_LEFT : i === boxWidth - 1 ? TOP_RIGHT : TOP;
            this.coordinates.push([boxX + i, boxY, String.fromCharCode(charCode)]);
        }
        // Right edge
        for (let i = 1; i < boxHeight - 1; i++) {
            this.coordinates.push([boxX + boxWidth - 1, boxY + i, String.fromCharCode(RIGHT)]);
        }
        // Bottom edge
        for (let i = boxWidth - 1; i >= 0; i--) {
            const charCode = i === 0 ? BOTTOM_LEFT : i === boxWidth - 1 ? BOTTOM_RIGHT : BOTTOM;
            this.coordinates.push([boxX + i, boxY + boxHeight - 1, String.fromCharCode(charCode)]);
        }
        // Left edge
        for (let i = boxHeight - 2; i > 0; i--) {
            this.coordinates.push([boxX, boxY + i, String.fromCharCode(LEFT)]);
        }

        // Add instruction text - these coordinates will overwrite some of the initial clear spaces and border pushes
        // This implies the order of drawing matters: clear, then border, then text OVERWRITES.
        // For the animation, we need to know the final character for each coordinate.
        // The _generateCoordinates should create the *final* visual state in this.coordinates.
        // Let's adjust: border coordinates should replace the initial spaces at their positions.
        // Text coordinates should replace whatever is at their positions.

        // Create a temporary map for final characters to avoid multiple pushes for same coord
        const finalCharsMap = new Map();
        const key = (x, y) => `${x},${y}`;

        // 1. Fill with spaces
        for (let r = 0; r < boxHeight; r++) {
            for (let c = 0; c < boxWidth; c++) {
                finalCharsMap.set(key(boxX + c, boxY + r), " ");
            }
        }

        // 2. Set border characters
        for (let i = 0; i < boxWidth; i++) { // Top
            finalCharsMap.set(key(boxX + i, boxY), String.fromCharCode(i === 0 ? TOP_LEFT : i === boxWidth - 1 ? TOP_RIGHT : TOP));
        }
        for (let i = 1; i < boxHeight - 1; i++) { // Right
            finalCharsMap.set(key(boxX + boxWidth - 1, boxY + i), String.fromCharCode(RIGHT));
        }
        for (let i = boxWidth - 1; i >= 0; i--) { // Bottom
            finalCharsMap.set(key(boxX + i, boxY + boxHeight - 1), String.fromCharCode(i === 0 ? BOTTOM_LEFT : i === boxWidth - 1 ? BOTTOM_RIGHT : BOTTOM));
        }
        for (let i = boxHeight - 2; i > 0; i--) { // Left
            finalCharsMap.set(key(boxX, boxY + i), String.fromCharCode(LEFT));
        }

        // 3. Set text characters
        for (let i = 0; i < this.instructionText.length; i++) {
            finalCharsMap.set(key(startColText + i, startRowText), this.instructionText[i]);
        }

        // Convert map to coordinates array, ordered for animation (e.g. clear, border, text)
        // The animation sequence logic in `update` will determine what to show when.
        // For simplicity, `this.coordinates` will store the sequence of drawing operations
        // as originally conceived for `main2.js` (clear block, then border sequence, then text sequence).
        // This matches the structure `update` now expects.

        this.coordinates = []; // Reset
        // A. Initial clear for the box area (using spaces)
        for (let r = 0; r < boxHeight; r++) {
            for (let c = 0; c < boxWidth; c++) {
                this.coordinates.push([boxX + c, boxY + r, " "]); // Char here is placeholder for animation step
            }
        }
        // B. Border drawing sequence
        for (let i = 0; i < boxWidth; i++) {
            this.coordinates.push([boxX + i, boxY, String.fromCharCode(i === 0 ? TOP_LEFT : i === boxWidth - 1 ? TOP_RIGHT : TOP)]);
        }
        for (let i = 1; i < boxHeight - 1; i++) {
            this.coordinates.push([boxX + boxWidth - 1, boxY + i, String.fromCharCode(RIGHT)]);
        }
        for (let i = boxWidth - 1; i >= 0; i--) {
            this.coordinates.push([boxX + i, boxY + boxHeight - 1, String.fromCharCode(i === 0 ? BOTTOM_LEFT : i === boxWidth - 1 ? BOTTOM_RIGHT : BOTTOM)]);
        }
        for (let i = boxHeight - 2; i > 0; i--) {
            this.coordinates.push([boxX, boxY + i, String.fromCharCode(LEFT)]);
        }
        // C. Text drawing sequence
        for (let i = 0; i < this.instructionText.length; i++) {
            this.coordinates.push([startColText + i, startRowText, this.instructionText[i]]);
        }
    }

    update(timeInSecondsSinceStart) {
        const {
            ANIM_START_DELAY_SEC,
            ANIM_TOTAL_DELAY_SEC,
            ANIM_REVEAL_SPEED_FACTOR,
            COLOR,
            FLASH_EFFECT_THRESHOLD_END,
            PAUSE_FACTOR,
            PAUSE_FLAT,
            BOX_WIDTH_PADDING, // Added for index calculation
            BOX_HEIGHT         // Added for index calculation
        } = this.config;

        const effectiveTime = timeInSecondsSinceStart - ANIM_START_DELAY_SEC - ANIM_TOTAL_DELAY_SEC;
        const numCharsToRevealOverall = Math.floor(effectiveTime * ANIM_REVEAL_SPEED_FACTOR);
        const totalDrawnSignElements = clamp(numCharsToRevealOverall, 0, this.coordinates.length);

        // Define key points in the `this.coordinates` sequence for stages:
        // Stage 1: Initial clear (all spaces)
        const boxWidth = this.instructionText.length + BOX_WIDTH_PADDING;
        const numInitialClearChars = boxWidth * BOX_HEIGHT;
        // Stage 2: Border graphics
        const numBorderGraphicChars = (2 * boxWidth) + (2 * (BOX_HEIGHT - 2));
        const endOfBorderGraphicsIndex = numInitialClearChars + numBorderGraphicChars; // Point after border graphics are listed
        // Stage 3: Text characters (these follow directly after border graphics in this.coordinates)
        // textSequenceStartIndexInCoords is effectively endOfBorderGraphicsIndex

        const PAUSE_ANIMATION_STEPS = Math.floor(this.instructionText.length * PAUSE_FACTOR) + PAUSE_FLAT;

        const terminalTextColor = getComputedStyle(document.getElementsByClassName("terminal")[0]).getPropertyValue("color");

        for (let i = 0; i < totalDrawnSignElements; i++) {
            const [x, y, charInCoordinateEntry] = this.coordinates[i];
            let charToPrint = charInCoordinateEntry;
            let colorToUse = terminalTextColor;

            if (i < numInitialClearChars) {
                // Stage 1: Initial clear. charInCoordinateEntry is ' '. Print as is.
                // These are revealed directly by numCharsToRevealOverall.
            } else if (i < endOfBorderGraphicsIndex) {
                // Stage 2: Border graphics. charInCoordinateEntry is a border char. Print as is.
                // These are also revealed directly by numCharsToRevealOverall.
            } else {
                // Stage 3: Slot for a text character (i >= endOfBorderGraphicsIndex)
                // charInCoordinateEntry is the actual text character from this.instructionText.

                // Check if pause is over for text reveal. Text reveal starts after border AND pause.
                const stepsWhenTextCanStart = endOfBorderGraphicsIndex + PAUSE_ANIMATION_STEPS;

                if (numCharsToRevealOverall >= stepsWhenTextCanStart) {
                    // Pause is over. Now determine if *this specific* text char (at index i) should be shown.
                    // textCharIndexInSequence is its 0-based order in the text string.
                    const textCharIndexInSequence = i - endOfBorderGraphicsIndex;
                    // textRevealProgress is how many text chars should be visible *after* the pause.
                    const textRevealProgress = numCharsToRevealOverall - stepsWhenTextCanStart;

                    if (textCharIndexInSequence < textRevealProgress) {
                        // This text character should be visible. charToPrint is already correct.
                        // Apply flashing logic based on text reveal progress
                        if (textRevealProgress - FLASH_EFFECT_THRESHOLD_END < textCharIndexInSequence) {
                            const currentTime = Date.now();
                            let charState = this.flashCharColorStates.get(textCharIndexInSequence);

                            if (!charState || (currentTime - charState.lastChangeTime > this.config.FLASH_TEXT_COLOR_HOLD_MS)) {
                                const newColor = randomBrightColor();
                                charState = { color: newColor, lastChangeTime: currentTime };
                                this.flashCharColorStates.set(textCharIndexInSequence, charState);
                            }
                            colorToUse = charState.color;
                        }
                    } else {
                        // This text char not yet revealed due to textRevealProgress, print a space.
                        // (Its slot is active because i < totalDrawnSignElements)
                        // Also, if a character is no longer in the flashing window, its state can be cleared from the map
                        if (this.flashCharColorStates.has(textCharIndexInSequence)) {
                            this.flashCharColorStates.delete(textCharIndexInSequence);
                        }
                        charToPrint = ' ';
                    }
                } else {
                    // Pause is active for text, or text sequence not even nominally reached.
                    // Since i < totalDrawnSignElements, this slot is "active". Print a space.
                    // Clear any potentially stale flash states if the whole text part is paused/not reached.
                    // This might be too aggressive if we want states to persist through short pauses.
                    // For now, let's only clear when a char is definitely *not* flashing or *not* revealed.
                    charToPrint = ' ';
                }
            }
            this.screenManager.print(x, y, charToPrint, colorToUse);
        }
        // Optimization: Clean up states for characters that are no longer part of the *potential* flash window at all
        // This is a bit more complex to determine precisely without iterating all possible textCharIndexInSequence values.
        // The current cleanup (when a char is not revealed or not flashing) is a good start.
    }
} 