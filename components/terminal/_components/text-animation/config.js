// config.js - Configuration settings for the text-mode demo

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
        COLOR: [0, 15], // [background=0 (transparent), foreground=15 (white)]
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
        PAUSE_FLAT: 4,    // Flat number of pause steps
        FLASH_TEXT_COLOR_HOLD_MS: 40 // Duration for each flashing char to hold its color (e.g., 150ms)
    },
    EFFECT_DEFAULTS: {
        MAX_DISTANCE: 100,
        SPEED_CELLS_PER_SEC: 10,
        FADE_TIME_SEC: 0.6,
        ORIGINAL_COLOR: [0, 15], // [background=0 (transparent), foreground=15 (white)]
        COLOR_HOLD_MS: 40, // Default duration to hold a wave color
    },
    INITIAL_WAVES_DELAY_SEC: 2.25,
};

export { CONFIG, NAME_ART }; 