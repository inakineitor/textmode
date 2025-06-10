// main.js - Main application module using ES modules

import { TextModeScreen } from './textmode/index.js';
import { CONFIG, NAME_ART } from './config.js';
import { calculateScreenDimensions, clamp, RandomCharProvider } from './utils.js';
import { NameAnimator } from './name-animator.js';
import { ScrollSign } from './scroll-sign.js';
import { EffectsManager } from './effects-manager.js';

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

export function init() {
    const canvas = document.getElementById("mainCanvas");
    sourceFont = new Image();
    sourceFont.src = "static/images/computer-font.png"; // Assuming font.png is in the same directory or accessible

    sourceFont.onload = () => {
        const { numRows, numCols } = calculateScreenDimensions(canvas);
        // container.style.fontSize is set inside calculateScreenDimensions

        CONFIG.CANVAS_WIDTH_CHARS = numCols;
        CONFIG.CANVAS_HEIGHT_CHARS = numRows;

        screenManager = new TextModeScreen(CONFIG.CANVAS_WIDTH_CHARS, CONFIG.CANVAS_HEIGHT_CHARS, canvas, sourceFont);

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
            [17, 4, secondsFromStart(7), 15, 5], // 4th and 5th values are name-relative trigger coordinates
            [31, 9, secondsFromStart(8.45), 29, 9],
            [43, 10, secondsFromStart(9.5), 41, 10],
            [57, 5, secondsFromStart(10.75), 57, 5],
        ];

        const getClampedAbsCoords = (relX, relY) => {
            const absX = nameContentAbsoluteStartCol + relX;
            const absY = nameContentAbsoluteStartRow + relY;
            const clampedAbsX = clamp(absX, 0, screenManager.charsWide - 1);
            const clampedAbsY = clamp(absY, 0, screenManager.charsHigh - 1);
            return [clampedAbsX, clampedAbsY];
        }

        // const waveReaction = (x, y) => {
        //     for (const [relX, relY, time, triggerRelX, triggerRelY] of initialWaves) {
        //         if (triggerRelX === undefined || triggerRelY === undefined) continue;

                
        //         const [triggerAbsX, triggerAbsY] = getClampedAbsCoords(triggerRelX, triggerRelY);

        //         if (x === triggerAbsX && y === triggerAbsY) {
        //             const [clampedAbsX, clampedAbsY] = getClampedAbsCoords(relX, relY);
        //             console.log(`wave reaction at [${clampedAbsX}, ${clampedAbsY}] for trigger at [${triggerRelX},${triggerRelY}]`);
        //             effectsManager.startNewEffect(clampedAbsX, clampedAbsY, Date.now(), {}, null);
        //         }
        //     }
        // };

        // const [clampedAbsX, clampedAbsY] = getClampedAbsCoords(initialWaves[0][0], initialWaves[0][1]);
        // effectsManager.startNewEffect(
        //     clampedAbsX,
        //     clampedAbsY,
        //     initialWaves[0][2] - CONFIG.INITIAL_WAVES_DELAY_SEC * 1000,
        //     {},
        //     waveReaction
        // );

        for (const [relX, relY, time, triggerRelX, triggerRelY] of initialWaves) {
            const [clampedAbsX, clampedAbsY] = getClampedAbsCoords(relX, relY);

            effectsManager.startNewEffect(
                clampedAbsX,
                clampedAbsY,
                time - CONFIG.INITIAL_WAVES_DELAY_SEC * 1000,
                {},
            );
        }

        canvas.addEventListener("click", (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const canvasX = (e.clientX - rect.left) * scaleX;
            const canvasY = (e.clientY - rect.top) * scaleY;

            const charX = Math.floor(canvasX / (canvas.width / screenManager.charsWide));
            const charY = Math.floor(canvasY / (canvas.height / screenManager.charsHigh));

            console.log(`Click at (abs: ${charX},${charY}) (rel: ${charX - nameContentAbsoluteStartCol},${charY - nameContentAbsoluteStartRow})`);

            // Define recursive onCellVisit callback function to create chain reactions
            // const onCellVisit = (x, y, distance) => {
            //     // Check if this coordinate matches any trigger point from initialWaves
            //     for (const [relX, relY, time, triggerRelX, triggerRelY] of initialWaves) {
            //         if (triggerRelX === undefined || triggerRelY === undefined) continue;

            //         // Convert trigger coordinates from name-relative to absolute
            //         const [triggerAbsX, triggerAbsY] = getClampedAbsCoords(triggerRelX, triggerRelY);

            //         // If the wave hits a trigger point, start a new effect there
            //         if (x === triggerAbsX && y === triggerAbsY) {
            //             const [clampedAbsX, clampedAbsY] = getClampedAbsCoords(relX, relY);
            //             console.log(`Wave triggered new effect at [${clampedAbsX},${clampedAbsY}]`);

            //             // Create a new onCellVisit callback for the triggered wave to avoid infinite loops
            //             // const nestedCallback = (nx, ny, nd) => {
            //             //     console.log(`Nested cell visited: [${nx},${ny}] at distance ${nd}`);
            //             //     // No further cascading to prevent infinite loops
            //             // };

            //             // Use a different callback for the cascade to prevent infinite loops
            //             effectsManager.startNewEffect(clampedAbsX, clampedAbsY, Date.now(), {}, null);
            //             break;
            //         }
            //     }
            // };

            const onCellVisit = null;

            effectsManager.startNewEffect(charX, charY, Date.now(), {}, onCellVisit);

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
    const previousBackgroundColorBuffer = [...screenManager.backgroundColorBuffer];
    const previousForegroundColorBuffer = [...screenManager.foregroundColorBuffer];

    // Fill the screen with random background
    for (let i = 0; i < screenManager.charsWide * screenManager.charsHigh; i++) {
        screenManager.charBuffer[i] = randomCharProvider.getRandomCharAscii();
        screenManager.backgroundColorBuffer[i] = "transparent"; // Transparent background
        screenManager.foregroundColorBuffer[i] = "transparent"; // Transparent foreground (background characters)
    }

    const timeInSecondsSinceStart = (Date.now() - startTime) / 1000;

    nameAnimator.update(timeInSecondsSinceStart, previousBackgroundColorBuffer, previousForegroundColorBuffer);
    scrollSign.update(timeInSecondsSinceStart);
    effectsManager.update();

    screenManager.presentToScreen();
    requestAnimationFrame(mainLoop); // Schedule the next frame
}