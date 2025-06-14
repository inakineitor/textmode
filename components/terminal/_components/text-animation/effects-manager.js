// EffectsManager.js - Manages spreading wave effects

import { createSpreadingEffect } from './ripple.js';
import { randomBrightColor } from './utils.js';

/**
 * Manages wave effects that spread from points on the screen
 */
export class EffectsManager {
    constructor(screenManager, config) {
        this.screenManager = screenManager;
        this.config = config.EFFECT_DEFAULTS;
        this.activeEffects = [];
    }

    startNewEffect(x, y, startTime = Date.now(), customConfig = {}, onCellVisit = null) {
        const effectConfig = { ...this.config, ...customConfig };
        this.activeEffects.push({
            x,
            y,
            startTime, 
            maxDistance: effectConfig.MAX_DISTANCE,
            speed: effectConfig.SPEED_CELLS_PER_SEC,
            fadeTime: effectConfig.FADE_TIME_SEC,
            originalColor: effectConfig.ORIGINAL_COLOR,
            colorHoldMs: effectConfig.COLOR_HOLD_MS,   
            onCellVisit, // Store the callback function
            // Create a single state object with both color states and visited cells
            state: {
                cellColorStates: new Map(), // Stores color information
                visitedCells: new Set()     // Tracks visited cells for callbacks
            }
        });
    }

    update() {
        this.activeEffects = this.activeEffects.filter(effect => {
            const isComplete = createSpreadingEffect(
                this.screenManager,
                effect.x,
                effect.y,
                effect.maxDistance,
                randomBrightColor, // Pass the color function directly (now returns color tuples)
                effect.startTime,
                effect.speed,       // Assuming speed is on effect or default in ripple.js
                effect.fadeTime,    // Assuming fadeTime is on effect or default in ripple.js
                effect.originalColor, // Assuming originalColor is on effect or default in ripple.js
                effect.colorHoldMs,   // Pass the hold duration
                effect.state,          // Pass the state object with both cellColorStates and visitedCells
                effect.onCellVisit     // Pass the callback function
            );
            return !isComplete; 
        });
    }
} 