// main.js - Main application module using ES modules

import { TextModeScreen } from './textmode.js';
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
    sourceFont.src = "static/fonts/font.png"; // Assuming font.png is in the same directory or accessible

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

        for (const [relX, relY, time] of initialWaves) {
            const [clampedAbsX, clampedAbsY] = getClampedAbsCoords(relX, relY);
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

            console.log(`Click at (abs: ${charX},${charY}) (rel: ${charX - nameContentAbsoluteStartCol},${charY - nameContentAbsoluteStartRow})`);

            // Define recursive onCellVisit callback function to create chain reactions
            // const onCellVisit = (x, y) => {
            //     // Check if this coordinate matches any trigger point from initialWaves
            //     for (const [relX, relY, time, triggerRelX, triggerRelY] of initialWaves) {
            //         if (triggerRelX === undefined || triggerRelY === undefined) continue;

            //         // Convert trigger coordinates from name-relative to absolute
            //         const triggerAbsX = nameContentAbsoluteStartCol + triggerRelX;
            //         const triggerAbsY = nameContentAbsoluteStartRow + triggerRelY;

            //         // If the wave hits a trigger point, start a new effect there
            //         if (x === triggerAbsX && y === triggerAbsY) {
            //             const [clampedAbsX, clampedAbsY] = getClampedAbsCoords(relX, relY);
            //             console.log('Wave triggered:');
            //             console.log(`- at [${x},${y}]`);
            //             console.log(`- start at [${clampedAbsX},${clampedAbsY}]`);
            //             // Use the same callback for cascading effects

            //             effectsManager.startNewEffect(clampedAbsX, clampedAbsY, Date.now() + 10000, {});
            //             console.log('New effect started');
            //             break;
            //         }
            //     }
            // };
            const onCellVisit = null;
            // effectsManager.startNewEffect(charX, charY, Date.now(), {}, onCellVisit);
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