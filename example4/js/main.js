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

// Track active effects
let activeEffects = [];
// Handle a new effect (e.g., from mouse click or key press)
function startNewEffect(x, y, startTime = Date.now()) {
  activeEffects.push({
    x: x,
    y: y,
    startTime,
    maxDistance: 100,
    speed: 10, // cells per second
    fadeTime: 0.6, // seconds to fade back to original
    originalColor: 0x0f, // white
  });
}

function init() {
  // Initialise the textmode library
  const canvas = document.getElementById("mainCanvas");
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

  const secondsFromStart = (secs) => startTime + secs * 1000;
  const waves = [
    [23, 16, secondsFromStart(5)],
    [34, 16, secondsFromStart(7)],
    [48, 21, secondsFromStart(8.45)],
    [60, 22, secondsFromStart(9.5)],
    [74, 17, secondsFromStart(10.75)],
  ];
  for (const [charX, charY, time] of waves) {
    startNewEffect(charX, charY, time - 2.25 * 1000);
  }

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    // Convert canvas coordinates to character grid coordinates
    const charX = Math.floor(
      canvasX / (canvas.width / screenManager.charsWide),
    );
    const charY = Math.floor(
      canvasY / (canvas.height / screenManager.charsHigh),
    );

    startNewEffect(charX, charY);
  });
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

function scrollDownSign(screenManager, numChars) {
  const instructionText = "Scroll down to learn more";

  const startRow = Math.floor((screenManager.charsHigh / 6) * 5);
  const startCol = Math.floor(
    (screenManager.charsWide - instructionText.length) / 2,
  );

  const coordinates = [];

  const x = startCol - 2;
  const y = startRow - 1;
  const width = instructionText.length + 4;
  const height = 3;
  const color = 0x0f;

  const topLeft = String.fromCharCode(201);
  const top = String.fromCharCode(205);
  const topRight = String.fromCharCode(187);
  const left = String.fromCharCode(186);
  const right = String.fromCharCode(186);
  const bottomLeft = String.fromCharCode(200);
  const bottom = String.fromCharCode(205);
  const bottomRight = String.fromCharCode(188);

  // Top edge
  for (let i = 0; i < width; i++) {
    coordinates.push([x + i, y, " "]);
  }

  // Right edge
  for (let i = 1; i < height - 1; i++) {
    coordinates.push([x + width - 1, y + i, " "]);
  }

  // Bottom edge
  for (let i = width - 1; i >= 0; i--) {
    coordinates.push([x + i, y + height - 1, " "]);
  }

  // Left edge
  for (let i = height - 2; i > 0; i--) {
    coordinates.push([x, y + i, " "]);
  }

  // Fill inner space
  for (let j = y + 1; j < y + height - 1; j++) {
    for (let i = 1; i < width - 1; i++) {
      coordinates.push([x + i, j, " "]);
    }
  }

  //***************************************

  // Top edge
  for (let i = 0; i < width; i++) {
    coordinates.push([
      x + i,
      y,
      i === 0 ? topLeft : i === width - 1 ? topRight : top,
    ]);
  }

  // Right edge
  for (let i = 1; i < height - 1; i++) {
    coordinates.push([x + width - 1, y + i, right]);
  }

  // Bottom edge
  for (let i = width - 1; i >= 0; i--) {
    coordinates.push([
      x + i,
      y + height - 1,
      i === 0 ? bottomLeft : i === width - 1 ? bottomRight : bottom,
    ]);
  }

  // Left edge
  for (let i = height - 2; i > 0; i--) {
    coordinates.push([x, y + i, left]);
  }

  // Fill inner space
  for (let j = y + 1; j < y + height - 1; j++) {
    for (let i = 1; i < width - 1; i++) {
      coordinates.push([x + i, j, " "]);
    }
  }

  // Fill inner space
  for (let j = y + 1; j < y + height - 1; j++) {
    for (let i = 1; i < width - 1; i++) {
      coordinates.push([x + i, j, " "]);
    }
  }

  // Add instruction text
  for (let i = 0; i < instructionText.length; i++) {
    coordinates.push([startCol + i, startRow, instructionText[i]]);
  }

  const totalDrawnChars = Math.min(numChars, coordinates.length);
  for (let i = 0; i < totalDrawnChars; i++) {
    const [x, y, char] = coordinates[i];
    screenManager.print(
      x,
      y,
      char,
      150 < i && numChars - 15 < i ? randomBrightColor() : color,
      // i > numChars - 15 < i ? randomBrightColor() : color,
    );
  }
}

function randomBrightColor() {
  // const colors = [2, 3, 4, 5, 6, 7, 8];
  // return colors[Math.floor(Math.random() * colors.length)];
  return Math.floor(10 + Math.random() * 5);
  return 0x0f;
}

function mainLoop() {
  const previousCharBuffer = new Uint8Array(screenManager.charBuffer);
  const previousColorBuffer = new Uint8Array(screenManager.colourBuffer);

  // Fill the screen with random characters and colours
  for (let i = 0; i < screenManager.charsWide * screenManager.charsHigh; i++) {
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
  const laggedRevealedMask = generateRandomMask(
    mergedName.length,
    clamp(
      Math.floor((timeInSecondsSinceStart - 0.3) * 500) - 150,
      0,
      mergedName.length,
    ),
  );
  const veryLaggedRevealedMask = generateRandomMask(
    mergedName.length,
    clamp(
      Math.floor((timeInSecondsSinceStart - 0.3) * 500) - 250,
      0,
      mergedName.length,
    ),
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

    const charPos = startCol + col + (startRow + row) * screenManager.charsWide;
    const prevColor = previousColorBuffer[charPos];
    const displayedLongAgo = laggedRevealedMask[i];
    const setWhite = veryLaggedRevealedMask[i];
    screenManager.print(
      startCol + col,
      startRow + row,
      char,
      setWhite ? 0x0f : displayedLongAgo ? prevColor : randomBrightColor(),
      // 0x0f,
    );
  }

  scrollDownSign(
    screenManager,
    Math.floor((timeInSecondsSinceStart - 3.1 - 6.25) * 70, 0),
  );

  activeEffects = activeEffects.filter((effect) => {
    const isComplete = createSpreadingEffect(
      screenManager,
      effect.x,
      effect.y,
      effect.maxDistance,
      () => randomBrightColor(), // Or any other color function
      effect.startTime,
      effect.speed,
      effect.fadeTime,
      effect.originalColor,
    );

    // Remove completed effects
    return !isComplete;
  });
  // Render the textmode screen to our canvas
  screenManager.presentToScreen();
}
