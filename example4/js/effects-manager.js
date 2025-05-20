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
            colorHoldMs: effectConfig.COLOR_HOLD_MS,   
            cellColorStates: new Map() // Owned by EffectsManager, passed to ripple.js
        });
    }

    update() {
        this.activeEffects = this.activeEffects.filter(effect => {
            const isComplete = createSpreadingEffect(
                this.screenManager,
                effect.x,
                effect.y,
                effect.maxDistance,
                () => randomBrightColor(), // Pass the simple base color function
                effect.startTime,
                effect.speed,       // Assuming speed is on effect or default in ripple.js
                effect.fadeTime,    // Assuming fadeTime is on effect or default in ripple.js
                effect.originalColor, // Assuming originalColor is on effect or default in ripple.js
                effect.colorHoldMs,   // Pass the hold duration
                effect.cellColorStates // Pass the state map for this effect
            );
            return !isComplete; 
        });
    }
} 