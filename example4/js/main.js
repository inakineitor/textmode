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
    CANVAS_WIDTH_CHARS: 100,
    CANVAS_HEIGHT_CHARS: 35,
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
            TOP_LEFT: 201,     // CP437 for ╔ (double line)
            TOP: 205,          // CP437 for ═ (double line)
            TOP_RIGHT: 187,    // CP437 for ╗ (double line)
            LEFT: 186,         // CP437 for ║ (double line)
            RIGHT: 186,        // CP437 for ║ (double line)
            BOTTOM_LEFT: 200,  // CP437 for ╚ (double line)
            BOTTOM: 205,       // CP437 for ═ (double line)
            BOTTOM_RIGHT: 188, // CP437 for ╝ (double line)
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
    },
    INITIAL_WAVES_DELAY_SEC: 2.25,
};

///////////////////////////////////////////////////////////////////////////////////////////////////
// Utility Functions
///////////////////////////////////////////////////////////////////////////////////////////////////

function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

function getCharSize(container) {
    // Ensure styles are applied for measurement. fontSize must be set on container first.
    const M_span = document.createElement('span');
    const computedStyle = window.getComputedStyle(container);
    
    M_span.style.fontFamily = computedStyle.fontFamily;
    M_span.style.fontSize = computedStyle.fontSize; // Crucial: this is after JS sets it
    M_span.style.lineHeight = computedStyle.lineHeight; // Should be '1'
    M_span.style.whiteSpace = "pre"; // Ensure single char width is measured
    M_span.style.letterSpacing = computedStyle.letterSpacing; // Should be '0'

    M_span.style.visibility = "hidden";
    M_span.style.position = "absolute"; // So it doesn't disrupt layout
    M_span.textContent = 'M'; // A common character for width measurement
    
    document.body.appendChild(M_span); 
    const charWidth = M_span.offsetWidth;
    const charHeight = M_span.offsetHeight;
    document.body.removeChild(M_span);

    if (charWidth === 0 || charHeight === 0) {
        console.warn("Character size measurement returned zero. Using fallback.");
        const fontSizePx = parseFloat(computedStyle.fontSize);
        // Fallback based on an assumed character aspect ratio (e.g. 0.5 to 0.6) if measurement fails
        if (fontSizePx > 0) {
            return { width: fontSizePx * 0.6, height: fontSizePx }; // Approximate aspect ratio
        }
        return { width: 8, height: 16 }; // Absolute fallback
    }
    return { width: charWidth, height: charHeight };
}

/**
 * Returns a random character from the NAME string, excluding whitespace
 * @returns {number} ASCII code of a random character from NAME_ART
 */
function getRandomCharFromName() {
    const charactersArray = CONFIG.NAME_ART.replace(/\\s/g, "").split("");
    const uniqueCharactersArray = [...new Set(charactersArray)];
    if (uniqueCharactersArray.length === 0) return 0; // Default char (e.g., space)
    const randomChar = uniqueCharactersArray[Math.floor(Math.random() * uniqueCharactersArray.length)];
    return randomChar.charCodeAt(0);
}

function randomBrightColor() {
    return Math.floor(10 + Math.random() * 5);
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

    recalculateLayout() {
        this._generateCoordinates();
        // Add any necessary animation state resets here if required
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
            startTime,
            maxDistance: effectConfig.MAX_DISTANCE,
            speed: effectConfig.SPEED_CELLS_PER_SEC,
            fadeTime: effectConfig.FADE_TIME_SEC,
            originalColor: effectConfig.ORIGINAL_COLOR,
        });
    }

    update() {
        this.activeEffects = this.activeEffects.filter(effect => {
            // Now correctly call the global createSpreadingEffect from ripple.js
            const isComplete = createSpreadingEffect(
                this.screenManager,
                effect.x,
                effect.y,
                effect.maxDistance,
                () => randomBrightColor(), // Or a more specific color function from config
                effect.startTime,
                effect.speed,
                effect.fadeTime,
                effect.originalColor
            );
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

function calculateScreenDimensions(container) {
    const containerHeight = container.clientHeight;
    const containerWidth = container.clientWidth;

    let numRows = Math.max(1, Math.floor(containerHeight / CONFIG.TARGET_CHAR_PIXEL_HEIGHT));
    const actualCharHeight = containerHeight / numRows; // Characters will perfectly fill height

    // Temporarily set font size on container for measurement
    const originalFontSize = container.style.fontSize;
    container.style.fontSize = actualCharHeight + 'px';
    
    const { width: charWidth } = getCharSize(container);
    
    // Restore original font size if needed, or leave as is if it's meant to be permanent
    // For this flow, it's meant to be permanent for this render cycle.

    let numCols = charWidth > 0 ? Math.max(1, Math.floor(containerWidth / charWidth)) : 10; // Ensure charWidth is positive

    return { numRows, numCols, actualCharHeight, charWidth };
}

function init() {
    const textContainer = document.getElementById("textContainer");
    if (!textContainer) {
        console.error("Failed to find textContainer element for TextModeScreen.");
        alert("Initialization failed: textContainer not found.");
        return;
    }

    const { numRows, numCols, actualCharHeight } = calculateScreenDimensions(textContainer);
    textContainer.style.fontSize = actualCharHeight + 'px'; // Apply calculated font size

    CONFIG.CANVAS_WIDTH_CHARS = numCols;
    CONFIG.CANVAS_HEIGHT_CHARS = numRows;

    screenManager = new TextModeScreen(CONFIG.CANVAS_WIDTH_CHARS, CONFIG.CANVAS_HEIGHT_CHARS, "textContainer");
    if (!screenManager.container) {
        console.error("ScreenManager failed to initialize its container.");
        return;
    }
    
    nameAnimator = new NameAnimator(screenManager, CONFIG.NAME_ART, CONFIG);
    scrollSign = new ScrollSign(screenManager, CONFIG);
    effectsManager = new EffectsManager(screenManager, CONFIG);

    const resizeObserver = new ResizeObserver(([containerEntry]) => {
        const { width: newContainerWidth, height: newContainerHeight } = containerEntry.contentRect;

        if (newContainerWidth === 0 || newContainerHeight === 0) {
            console.log("Container has zero dimension, skipping resize.");
            return;
        }
        
        const { numRows: newNumRows, numCols: newNumCols, actualCharHeight: newActualCharHeight } = calculateScreenDimensions(textContainer);
        textContainer.style.fontSize = newActualCharHeight + 'px';


        if (newNumCols !== screenManager.charsWide || newNumRows !== screenManager.charsHigh) {
            CONFIG.CANVAS_WIDTH_CHARS = newNumCols;
            CONFIG.CANVAS_HEIGHT_CHARS = newNumRows;
            screenManager.resize(newNumCols, newNumRows);
            if (scrollSign) {
                scrollSign.recalculateLayout();
            }
            // nameAnimator should adapt automatically as it reads screenManager.charsWide/High in its update.
            // effectsManager active effects might visually shift; clearing them could be an option:
            // if (effectsManager) effectsManager.activeEffects = [];
        }
        // console.log(width, height, "Text container resized");
    });
    resizeObserver.observe(textContainer);

    startTime = Date.now();

    // Calculate the dynamic starting position of the actual name art content
    const nameArtActualHeight = nameAnimator.nameHeight; // Number of lines in NAME_ART
    const nameArtPaddedWidth = nameAnimator.nameWidth;   // Width of ' ' + NAME_ART_line + ' '

    // This is the top-left of the bounding box where NameAnimator draws its mergedName
    const nameDisplayBoxStartRow = Math.floor((screenManager.charsHigh - nameArtActualHeight) * CONFIG.NAME_ANIM.START_ROW_FACTOR);
    const nameDisplayBoxStartCol = Math.floor((screenManager.charsWide - nameArtPaddedWidth) / 2);

    // The actual content of NAME_ART (e.g., its first character) starts at an offset (1,1) 
    // within this display box due to mergedName's structure (blank top row, and space padding in each line of nameInRows)
    const nameContentAbsoluteStartCol = nameDisplayBoxStartCol + 1; 
    const nameContentAbsoluteStartRow = nameDisplayBoxStartRow + 1;

    const secondsFromStart = (secs) => startTime + secs * 1000;
    
    // Initial wave coordinates are now relative to the top-left of the NAME_ART content
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
        // Ensure the effect starts within the valid screen boundaries, though ideally relX/Y are within name art
        const clampedAbsX = clamp(absX, 0, screenManager.charsWide - 1);
        const clampedAbsY = clamp(absY, 0, screenManager.charsHigh - 1);
        effectsManager.startNewEffect(clampedAbsX, clampedAbsY, time - CONFIG.INITIAL_WAVES_DELAY_SEC * 1000);
    }

    textContainer.addEventListener("click", (e) => {
        if (!screenManager || !screenManager.container) return;

        const rect = textContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const cellWidth = textContainer.clientWidth / screenManager.charsWide;
        const cellHeight = textContainer.clientHeight / screenManager.charsHigh;

        if (cellWidth > 0 && cellHeight > 0) {
            const charX = Math.floor(clickX / cellWidth);
            const charY = Math.floor(clickY / cellHeight);
            const clampedX = clamp(charX, 0, screenManager.charsWide - 1);
            const clampedY = clamp(charY, 0, screenManager.charsHigh - 1);
            effectsManager.startNewEffect(clampedX, clampedY);
        }
    });

    // mainLoop(); // Initial call is handled by requestAnimationFrame
    requestAnimationFrame(mainLoop); // Start the animation loop
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Main Loop
///////////////////////////////////////////////////////////////////////////////////////////////////

// let lastFrameTime = 0; // For FPS control with requestAnimationFrame, if needed
// const desiredInterval = 1000 / CONFIG.FPS;

function mainLoop(currentTime) { // currentTime is provided by requestAnimationFrame
    if (!screenManager) return; 

    // Optional: FPS throttling if requestAnimationFrame runs too fast for your CONFIG.FPS
    // if (currentTime - lastFrameTime < desiredInterval) {
    //     requestAnimationFrame(mainLoop);
    //     return;
    // }
    // lastFrameTime = currentTime;

    const previousCharBuffer = new Uint8Array(screenManager.charBuffer);
    const previousColorBuffer = new Uint8Array(screenManager.colourBuffer);

    for (let i = 0; i < screenManager.charsWide * screenManager.charsHigh; i++) {
        screenManager.charBuffer[i] = getRandomCharFromName();
        screenManager.colourBuffer[i] = 0x00; 
    }

    const timeInSecondsSinceStart = (Date.now() - startTime) / 1000; // Or use (currentTime - startTime) / 1000 if startTime is from performance.now()

    nameAnimator.update(timeInSecondsSinceStart, previousColorBuffer);
    scrollSign.update(timeInSecondsSinceStart);
    effectsManager.update();

    screenManager.presentToScreen();

    requestAnimationFrame(mainLoop); // Continue the loop
}

// Start the application
window.onload = init;

// Ensure TextModeScreen is defined (e.g., included via a <script> tag in HTML)
// For example:
// class TextModeScreen { constructor(w,h,c,f){ this.charsWide=w; this.charsHigh=h; this.charBuffer=new Uint8Array(w*h); this.colourBuffer=new Uint8Array(w*h); /*...*/ } print(x,y,char,col) {/*...*/} presentToScreen(){/*...*/} } 