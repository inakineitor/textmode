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
    },
    INITIAL_WAVES_DELAY_SEC: 2.25,
};

///////////////////////////////////////////////////////////////////////////////////////////////////
// Utility Functions
///////////////////////////////////////////////////////////////////////////////////////////////////

function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
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
let sourceFont;

function init() {
    const canvas = document.getElementById("mainCanvas");
    sourceFont = new Image();
    sourceFont.src = "font.png"; // Assuming font.png is in the same directory or accessible

    sourceFont.onload = () => {
        screenManager = new TextModeScreen(CONFIG.CANVAS_WIDTH_CHARS, CONFIG.CANVAS_HEIGHT_CHARS, canvas, sourceFont);
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
        setInterval(mainLoop, 1000 / CONFIG.FPS);

        const secondsFromStart = (secs) => startTime + secs * 1000;
        const initialWaves = [
            [23, 16, secondsFromStart(5)],
            [34, 16, secondsFromStart(7)],
            [48, 21, secondsFromStart(8.45)],
            [60, 22, secondsFromStart(9.5)],
            [74, 17, secondsFromStart(10.75)],
        ];

        for (const [charX, charY, time] of initialWaves) {
            effectsManager.startNewEffect(charX - 16 + 16, charY - 11 + 8, time - CONFIG.INITIAL_WAVES_DELAY_SEC * 1000);
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

        mainLoop(); // Run first loop immediately
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
        screenManager.charBuffer[i] = getRandomCharFromName();
        screenManager.colourBuffer[i] = 0x00; // Dark background
    }

    const timeInSecondsSinceStart = (Date.now() - startTime) / 1000;

    nameAnimator.update(timeInSecondsSinceStart, previousColorBuffer);
    scrollSign.update(timeInSecondsSinceStart);
    effectsManager.update();

    screenManager.presentToScreen();
}

// Start the application
window.onload = init;

// Ensure TextModeScreen is defined (e.g., included via a <script> tag in HTML)
// For example:
// class TextModeScreen { constructor(w,h,c,f){ this.charsWide=w; this.charsHigh=h; this.charBuffer=new Uint8Array(w*h); this.colourBuffer=new Uint8Array(w*h); /*...*/ } print(x,y,char,col) {/*...*/} presentToScreen(){/*...*/} } 