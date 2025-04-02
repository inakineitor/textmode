const NAME = `    .....     .    ,68b.   ,                     ..         .    
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

const RANDOM_SEED = 360;

/**
 * Returns a boolean mask where `true` means the character is revealed and `false` means it is masked.
 * This mask has exactly `charsRevealedNum` characters revealed. There should be a difference of only 1
 * in the mask between `generateRandomMask(str, n)` and `generateRandomMask(str, n + 1)`. The function
 * output should be deterministic given the random seed.
 * @param {number} length
 * @param {number} revealedNum
 */
const generateRandomMask = (length, revealedNum) => {
  const mask = new Array(length).fill(false);
  let random = RANDOM_SEED;

  // Generate a list of indices
  const indices = Array.from({ length }, (_, i) => i);

  // Shuffle the indices deterministically using the random seed
  for (let i = indices.length - 1; i > 0; i--) {
    random = (random * 9301 + 49297) % 233280;
    const j = random % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Set the first `revealedNum` indices to true in the mask
  for (let i = 0; i < revealedNum; i++) {
    mask[indices[i]] = true;
  }

  return mask;
};

///////////////////////////////////////////////////////////////////////////////////////////////////
// Globals
///////////////////////////////////////////////////////////////////////////////////////////////////

// This is our global textmode manager
var screenManager;

// The font that we will use
var sourceFont = new Image();
sourceFont.src = "font.png";

let startTime = 0;

///////////////////////////////////////////////////////////////////////////////////////////////////
// Initialisation
///////////////////////////////////////////////////////////////////////////////////////////////////

function init() {
  // Initialise the textmode library
  const canvas = document.getElementById("mainCanvas");
  console.log(canvas);
  screenManager = new TextModeScreen(100, 35, canvas, sourceFont);

  const resizeObserver = new ResizeObserver(([canvasEntry]) => {
    const {
      contentRect: { width, height },
    } = canvasEntry;
    console.log(width);
    console.log(height);
    console.log("Size changed");
  });
  resizeObserver.observe(canvas);

  startTime = Date.now();
  // Call our main loop at 25fps
  setInterval(mainLoop, 1000 / 25);
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// The main loop
///////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Returns a random character from the NAME string, excluding whitespace
 * @returns {number} ASCII code of a random character from NAME
 */
function getRandomCharFromName() {
  // Extract all non-whitespace characters from NAME
  const charactersArray = NAME.replace(/\s/g, "").split("");
  const uniqueCharactersArray = [...new Set(charactersArray)];
  // const uniqueCharactersArray = charactersArray;

  // If there are no characters, return a default value
  if (charactersArray.length === 0) return 0;

  // Pick a random character from the array
  const randomChar =
    uniqueCharactersArray[
      Math.floor(Math.random() * uniqueCharactersArray.length)
    ];

  // Return the ASCII code of the character
  return randomChar.charCodeAt(0);
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function mainLoop() {
  // Fill the screen with random characters and colours
  for (i = 0; i < screenManager.charsWide * screenManager.charsHigh; i++) {
    screenManager.charBuffer[i] = getRandomCharFromName();
    screenManager.colourBuffer[i] = 0x0f;
  }

  const timeInSecondsSinceStart = (Date.now() - startTime) / 1000;

  const nameInRows = NAME.split("\n").map((row) => ` ${row} `);
  const nameWidth = nameInRows[0].length;
  const nameHeight = nameInRows.length;
  const mergedName = [
    " ".repeat(nameWidth),
    ...nameInRows,
    " ".repeat(nameWidth),
  ].join("");
  const numberOfCharsRevealed = clamp(
    Math.floor((timeInSecondsSinceStart - 0.3) * 500),
    0,
    mergedName.length,
  );
  const revealedMask = generateRandomMask(
    mergedName.length,
    numberOfCharsRevealed,
  );

  // Calculate the startRow and startCol such that the name is centered on the grid
  const startRow = Math.floor((screenManager.charsHigh - nameHeight) / 2);
  const startCol = Math.floor((screenManager.charsWide - nameWidth) / 2);

  for (let i = 0; i < mergedName.length; i++) {
    if (!revealedMask[i]) continue;

    const char = mergedName[i];

    const row = Math.floor(i / nameWidth);
    const col = i % nameWidth;

    // If `char`is a white space, only render it if one of the 8 adjacente squares contains a non space character.
    // If one or more of the adjacent tiles goes out of bounds it should be ignored.
    if (char === " ") {
      const adjacentChars = [
        mergedName[i - nameWidth - 1],
        mergedName[i - nameWidth],
        mergedName[i - nameWidth + 1],
        mergedName[i - 1],
        mergedName[i + 1],
        mergedName[i + nameWidth - 1],
        mergedName[i + nameWidth],
        mergedName[i + nameWidth + 1],
      ];
      if (!adjacentChars.some((c) => c !== " " && c !== undefined)) continue;
    }
    screenManager.print(startCol + col, startRow + row, char, 0x0f);
  }

  // Render the textmode screen to our canvas
  screenManager.presentToScreen();
}
