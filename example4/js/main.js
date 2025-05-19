// main2.js - Refactored version

///////////////////////////////////////////////////////////////////////////////////////////////////
// Configuration
///////////////////////////////////////////////////////////////////////////////////////////////////

const NAME_ART = `    .....     .    ,68b.   ,                     ..         .    
  .d88888Neu. 'L   '   \`Y89'               < .z@8"\`        @88>  
  F""""*8888888F    u.    u.                !@88E          %8P   
 *      \`"*88*"   x@88k u@88c.       u      '888E   u       .    
  -....    ue=:. ^"8888""8888"    us888u.    888E u@8NL   .@88u  
         :88N  \`   8888  888R  .@88 "8888"   888E\`"88*"  ''888E\` 
         9888L     8888  888R  9888  9888    888E .dN.     888E  
  uzu.   \`8888L    8888  888R  9888  9888    888E~8888     888E  
,""888i   ?8888    8888  888R  9888  9888    888E '888&    888E  
4  9888L   %888>  "*88*" 8888" 9888  9888    888E  9888.   888&  
'  '8888   '88%     ""   'Y"   "888*""888" '"888*" 4888"   R888" 
     "*8Nu.z*"                  ^Y"   ^Y'     ""    ""      ""   `;

const CONFIG = {
    CANVAS_WIDTH_CHARS: 100, // Will be dynamically overwritten
    CANVAS_HEIGHT_CHARS: 35, // Will be dynamically overwritten
    TARGET_CHAR_PIXEL_HEIGHT: 20,
    FPS: 25,
    NAME_ART,
    RANDOM_SEED: 360,
    NAME_ANIM: {
        REVEAL_OFFSET_TIME_SEC: 0.3,
        REVEAL_SPEED_FACTOR: 500,
        LAG_FRAMES_1: 150,
        LAG_FRAMES_2: 250,
        START_ROW_FACTOR: 3 / 8,
    },
    SCROLL_SIGN: {
        TEXT: "Scroll down to learn more",
        START_ROW_FACTOR: 5 / 6,
        BOX_WIDTH_PADDING: 4,
        BOX_HEIGHT: 3,
        COLOR: 0x0f,
        ANIM_START_DELAY_SEC: 3.1, // Time after initial name animation might settle
        ANIM_TOTAL_DELAY_SEC: 6.25, // Additional delay for full scroll sign effect start
        ANIM_REVEAL_SPEED_FACTOR: 70,
        BORDER_CHARS: {
            TOP_LEFT: 201,
            TOP: 205,
            TOP_RIGHT: 187,
            LEFT: 186,
            RIGHT: 186,
            BOTTOM_LEFT: 200,
            BOTTOM: 205,
            BOTTOM_RIGHT: 188,
        },
        FLASH_EFFECT_THRESHOLD_END: 15,    // Chars from end of reveal
        PAUSE_FACTOR: 2, // Factor of text length for pause steps
        PAUSE_FLAT: 4    // Flat number of pause steps
    },
    EFFECT_DEFAULTS: {
        MAX_DISTANCE: 100,
        SPEED_CELLS_PER_SEC: 10,
        FADE_TIME_SEC: 0.6,
        ORIGINAL_COLOR: 0x0f, // white
        COLOR_HOLD_MS: 45, // New: Default duration to hold a wave color
    },
    INITIAL_WAVES_DELAY_SEC: 2.25,
};

///////////////////////////////////////////////////////////////////////////////////////////////////
// Utility Functions
///////////////////////////////////////////////////////////////////////////////////////////////////

function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

function calculateScreenDimensions(canvasEl) {
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

    // The line `canvasEl.style.fontSize` has been removed as it's generally not relevant
    // for direct canvas bitmap rendering of characters from a font atlas.

    return { numRows, numCols, actualCharHeight, charWidth: finalCharWidth };
}

/**
 * Provides random characters (as ASCII codes) from a given source string,
 * excluding whitespace. Unique characters are pre-calculated for O(1) retrieval.
 */
class RandomCharProvider {
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

function randomBrightColor() {
    // Corrected palette: bright colors are 10-14 (inclusive)
    // Base is 10, and there are 5 possibilities (10, 11, 12, 13, 14).
    return 10 + Math.floor(Math.random() * 5);
}

/**
 * Returns a boolean mask where `true` means the character is revealed and `false` means it is masked.
 * This mask has exactly `charsRevealedNum` characters revealed. There should be a difference of only 1
 * in the mask between `generateRandomMask(str, n)` and `generateRandomMask(str, n + 1)`. The function
 * output should be deterministic given the random seed.
 * @param {number} length
 * @param {number} revealedNum
 * @param {number} seed The random seed to use.
 */
function generateRandomMask(length, revealedNum, seed) {
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

///////////////////////////////////////////////////////////////////////////////////////////////////
// Name Animator Class
///////////////////////////////////////////////////////////////////////////////////////////////////
class NameAnimator {
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

    update(timeInSecondsSinceStart, previousColorBuffer) {
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
            const prevColor = previousColorBuffer[charPos]; // Assuming previousColorBuffer is available
            const displayedLongAgo = laggedRevealedMask[i];
            const setWhite = veryLaggedRevealedMask[i];

            this.screenManager.print(
                startCol + col,
                startRow + row,
                char,
                setWhite ? 0x0f : displayedLongAgo ? prevColor : randomBrightColor()
            );
        }
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Scroll Sign Class
///////////////////////////////////////////////////////////////////////////////////////////////////
class ScrollSign {
    constructor(screenManager, config) {
        this.screenManager = screenManager;
        this.config = config.SCROLL_SIGN;
        this.instructionText = this.config.TEXT;
        this._generateCoordinates();
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

        for (let i = 0; i < totalDrawnSignElements; i++) {
            const [x, y, charInCoordinateEntry] = this.coordinates[i];
            let charToPrint = charInCoordinateEntry;
            let colorToUse = COLOR;

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
                            colorToUse = randomBrightColor();
                        }
                    } else {
                        // This text char not yet revealed due to textRevealProgress, print a space.
                        // (Its slot is active because i < totalDrawnSignElements)
                        charToPrint = ' ';
                    }
                } else {
                    // Pause is active for text, or text sequence not even nominally reached.
                    // Since i < totalDrawnSignElements, this slot is "active". Print a space.
                    charToPrint = ' ';
                }
            }
            this.screenManager.print(x, y, charToPrint, colorToUse);
        }
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Effects Manager Class
///////////////////////////////////////////////////////////////////////////////////////////////////
class EffectsManager {
    constructor(screenManager, config) {
        this.screenManager = screenManager;
        this.config = config.EFFECT_DEFAULTS;
        this.activeEffects = [];
    }

    startNewEffect(x, y, startTime = Date.now(), customConfig = {}) {
        const effectConfig = { ...this.config, ...customConfig };
        this.activeEffects.push({
            x,
            y,
            startTime, // Effect's visual animation start time
            maxDistance: effectConfig.MAX_DISTANCE,
            speed: effectConfig.SPEED_CELLS_PER_SEC,
            fadeTime: effectConfig.FADE_TIME_SEC,
            originalColor: effectConfig.ORIGINAL_COLOR, // Base color, used by createSpreadingEffect
            colorHoldMs: effectConfig.COLOR_HOLD_MS,   // Duration to hold color, now per cell

            // Map to store color states for individual cells within this effect
            // Key: generated from distance/wavePosition, Value: { color, lastChangeTime }
            cellColorStates: new Map()
        });
    }

    update() {
        this.activeEffects = this.activeEffects.filter(effect => {
            const isComplete = createSpreadingEffect(
                this.screenManager,
                effect.x,
                effect.y,
                effect.maxDistance,
                (distance, wavePosition, cellKey) => {

                    let cellState = effect.cellColorStates.get(cellKey);
                    const currentTime = Date.now();

                    if (!cellState) { // If this cell is new to the effect or its state was cleared
                        cellState = {
                            color: randomBrightColor(),
                            lastChangeTime: currentTime
                        };
                        effect.cellColorStates.set(cellKey, cellState);
                    } else {
                        // Check if the hold time for this specific cell has elapsed
                        if (currentTime - cellState.lastChangeTime > effect.colorHoldMs) {
                            cellState.color = randomBrightColor();
                            cellState.lastChangeTime = currentTime;
                        }
                    }
                    return cellState.color;
                },
                effect.startTime,
                effect.speed,
                effect.fadeTime,
                effect.originalColor
            );

            // When an effect is complete, its cellColorStates map will be garbage collected along with the effect object.
            return !isComplete; // Keep if NOT complete
        });
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Globals & Initialization
///////////////////////////////////////////////////////////////////////////////////////////////////

let screenManager;
let nameAnimator;
let scrollSign;
let effectsManager;
let startTime;
let sourceFont;
let randomCharProvider;

function init() {
    const canvas = document.getElementById("mainCanvas");
    sourceFont = new Image();
    sourceFont.src = "font.png"; // Assuming font.png is in the same directory or accessible

    sourceFont.onload = () => {
        const { numRows, numCols } = calculateScreenDimensions(canvas);
        // container.style.fontSize is set inside calculateScreenDimensions

        CONFIG.CANVAS_WIDTH_CHARS = numCols;
        CONFIG.CANVAS_HEIGHT_CHARS = numRows;

        screenManager = new TextModeScreen(CONFIG.CANVAS_WIDTH_CHARS, CONFIG.CANVAS_HEIGHT_CHARS, canvas, sourceFont); // Corrected typo from CANAS_HEIGHT_CHARS

        randomCharProvider = new RandomCharProvider(CONFIG.NAME_ART);

        nameAnimator = new NameAnimator(screenManager, CONFIG.NAME_ART, CONFIG);
        scrollSign = new ScrollSign(screenManager, CONFIG);
        effectsManager = new EffectsManager(screenManager, CONFIG);

        const resizeObserver = new ResizeObserver(([canvasEntry]) => {
            const { contentRect: { width, height } } = canvasEntry;
            // console.log(width, height, "Canvas resized");
            // Add logic here if screenManager needs to be re-initialized or adjusted on resize
        });
        resizeObserver.observe(canvas);

        startTime = Date.now();

        const nameArtActualHeight = nameAnimator.nameHeight;
        const nameArtPaddedWidth = nameAnimator.nameWidth;

        const nameDisplayBoxStartRow = Math.floor((screenManager.charsHigh - nameArtActualHeight) * CONFIG.NAME_ANIM.START_ROW_FACTOR);
        const nameDisplayBoxStartCol = Math.floor((screenManager.charsWide - nameArtPaddedWidth) / 2);

        const nameContentAbsoluteStartCol = nameDisplayBoxStartCol + 1;
        const nameContentAbsoluteStartRow = nameDisplayBoxStartRow + 1;

        const secondsFromStart = (secs) => startTime + secs * 1000;

        const initialWaves = [
            [6, 4, secondsFromStart(5)],
            [17, 4, secondsFromStart(7)],
            [31, 9, secondsFromStart(8.45)],
            [43, 10, secondsFromStart(9.5)],
            [57, 5, secondsFromStart(10.75)],
        ];

        for (const [relX, relY, time] of initialWaves) {
            const absX = nameContentAbsoluteStartCol + relX;
            const absY = nameContentAbsoluteStartRow + relY;
            const clampedAbsX = clamp(absX, 0, screenManager.charsWide - 1);
            const clampedAbsY = clamp(absY, 0, screenManager.charsHigh - 1);
            effectsManager.startNewEffect(clampedAbsX, clampedAbsY, time - CONFIG.INITIAL_WAVES_DELAY_SEC * 1000);
        }

        canvas.addEventListener("click", (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const canvasX = (e.clientX - rect.left) * scaleX;
            const canvasY = (e.clientY - rect.top) * scaleY;

            const charX = Math.floor(canvasX / (canvas.width / screenManager.charsWide));
            const charY = Math.floor(canvasY / (canvas.height / screenManager.charsHigh));
            effectsManager.startNewEffect(charX, charY);
        });

        requestAnimationFrame(mainLoop);
    };

    sourceFont.onerror = () => {
        console.error("Failed to load font.png");
    };
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Main Loop
///////////////////////////////////////////////////////////////////////////////////////////////////

function mainLoop() {
    if (!screenManager) return; // Guard against running before init completes

    // It's important to get a fresh copy if modules might modify these buffers directly
    // However, if they only use screenManager.print(), this might not be strictly necessary
    // depending on TextModeScreen's internal workings. For safety, let's keep it.
    const previousCharBuffer = new Uint8Array(screenManager.charBuffer);
    const previousColorBuffer = new Uint8Array(screenManager.colourBuffer);

    // Fill the screen with random background
    for (let i = 0; i < screenManager.charsWide * screenManager.charsHigh; i++) {
        screenManager.charBuffer[i] = randomCharProvider.getRandomCharAscii();
        screenManager.colourBuffer[i] = 0x00; // Light gray background characters
    }

    const timeInSecondsSinceStart = (Date.now() - startTime) / 1000;

    nameAnimator.update(timeInSecondsSinceStart, previousColorBuffer);
    scrollSign.update(timeInSecondsSinceStart);
    effectsManager.update();

    screenManager.presentToScreen();
    requestAnimationFrame(mainLoop); // Schedule the next frame
}

// Start the application
window.onload = init;