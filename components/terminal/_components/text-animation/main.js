// main.js - Main application module using ES modules

import { TextModeScreen } from './textmode/index.js';
import { CONFIG, NAME_ART } from './config.js';
import { calculateScreenDimensions, clamp, RandomCharProvider } from './utils.js';
import { NameAnimator } from './name-animator.js';
import { ScrollSign } from './scroll-sign.js';
import { EffectsManager } from './effects-manager.js';

export class TerminalAnimation {
    #canvas;
    #abort;
    #screenManager = null;
    #nameAnimator = null;
    #scrollSign = null;
    #effectsManager = null;
    #startTime = null;
    #randomCharProvider = null;
    #resizeObserver = null;

    constructor(canvas) {
        this.#canvas = canvas;
        this.#abort = new AbortController();
    }

    init() {
        const sourceFont = new Image();
        sourceFont.src = "static/images/computer-font.png";

        sourceFont.onload = () => {
            const { numRows, numCols } = calculateScreenDimensions(this.#canvas);

            CONFIG.CANVAS_WIDTH_CHARS = numCols;
            CONFIG.CANVAS_HEIGHT_CHARS = numRows;

            this.#screenManager = new TextModeScreen(CONFIG.CANVAS_WIDTH_CHARS, CONFIG.CANVAS_HEIGHT_CHARS, this.#canvas, sourceFont);

            this.#randomCharProvider = new RandomCharProvider(CONFIG.NAME_ART);

            this.#nameAnimator = new NameAnimator(this.#screenManager, CONFIG.NAME_ART, CONFIG);
            this.#scrollSign = new ScrollSign(this.#screenManager, CONFIG);
            this.#effectsManager = new EffectsManager(this.#screenManager, CONFIG);

            this.#resizeObserver = new ResizeObserver(([canvasEntry]) => {
                const { contentRect: { width, height } } = canvasEntry;
            });
            this.#resizeObserver.observe(this.#canvas);

            this.#startTime = Date.now();

            const nameArtActualHeight = this.#nameAnimator.nameHeight;
            const nameArtPaddedWidth = this.#nameAnimator.nameWidth;

            const nameDisplayBoxStartRow = Math.floor((this.#screenManager.charsHigh - nameArtActualHeight) * CONFIG.NAME_ANIM.START_ROW_FACTOR);
            const nameDisplayBoxStartCol = Math.floor((this.#screenManager.charsWide - nameArtPaddedWidth) / 2);

            const nameContentAbsoluteStartCol = nameDisplayBoxStartCol + 1;
            const nameContentAbsoluteStartRow = nameDisplayBoxStartRow + 1;

            const secondsFromStart = (secs) => this.#startTime + secs * 1000;

            const initialWaves = [
                [6, 4, secondsFromStart(5)],
                [17, 4, secondsFromStart(7), 15, 5],
                [31, 9, secondsFromStart(8.45), 29, 9],
                [43, 10, secondsFromStart(9.5), 41, 10],
                [57, 5, secondsFromStart(10.75), 57, 5],
            ];

            const getClampedAbsCoords = (relX, relY) => {
                const absX = nameContentAbsoluteStartCol + relX;
                const absY = nameContentAbsoluteStartRow + relY;
                const clampedAbsX = clamp(absX, 0, this.#screenManager.charsWide - 1);
                const clampedAbsY = clamp(absY, 0, this.#screenManager.charsHigh - 1);
                return [clampedAbsX, clampedAbsY];
            }

            for (const [relX, relY, time] of initialWaves) {
                const [clampedAbsX, clampedAbsY] = getClampedAbsCoords(relX, relY);

                this.#effectsManager.startNewEffect(
                    clampedAbsX,
                    clampedAbsY,
                    time - CONFIG.INITIAL_WAVES_DELAY_SEC * 1000,
                    {},
                );
            }

            this.#canvas.addEventListener("click", (e) => {
                const rect = this.#canvas.getBoundingClientRect();
                const scaleX = this.#canvas.width / rect.width;
                const scaleY = this.#canvas.height / rect.height;

                const canvasX = (e.clientX - rect.left) * scaleX;
                const canvasY = (e.clientY - rect.top) * scaleY;

                const charX = Math.floor(canvasX / (this.#canvas.width / this.#screenManager.charsWide));
                const charY = Math.floor(canvasY / (this.#canvas.height / this.#screenManager.charsHigh));

                console.log(`Click at (abs: ${charX},${charY}) (rel: ${charX - nameContentAbsoluteStartCol},${charY - nameContentAbsoluteStartRow})`);

                this.#effectsManager.startNewEffect(charX, charY, Date.now(), {}, null);

            }, { signal: this.#abort.signal });

            requestAnimationFrame(() => this.#mainLoop());
        };

        sourceFont.onerror = () => {
            console.error("Failed to load font.png");
        };
    }

    #mainLoop() {
        if (this.#abort.signal.aborted) return;

        const previousCharBuffer = new Uint8Array(this.#screenManager.charBuffer);
        const previousBackgroundColorBuffer = [...this.#screenManager.backgroundColorBuffer];
        const previousForegroundColorBuffer = [...this.#screenManager.foregroundColorBuffer];

        for (let i = 0; i < this.#screenManager.charsWide * this.#screenManager.charsHigh; i++) {
            this.#screenManager.charBuffer[i] = this.#randomCharProvider.getRandomCharAscii();
            this.#screenManager.backgroundColorBuffer[i] = "transparent";
            this.#screenManager.foregroundColorBuffer[i] = "transparent";
        }

        const timeInSecondsSinceStart = (Date.now() - this.#startTime) / 1000;

        this.#nameAnimator.update(timeInSecondsSinceStart, previousBackgroundColorBuffer, previousForegroundColorBuffer);
        this.#scrollSign.update(timeInSecondsSinceStart);
        this.#effectsManager.update();

        this.#screenManager.presentToScreen();
        requestAnimationFrame(() => this.#mainLoop());
    }

    destroy() {
        this.#abort.abort();
        this.#resizeObserver?.disconnect();
        this.#screenManager = null;
    }
}
