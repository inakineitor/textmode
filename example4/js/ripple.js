/**
 * Creates a single spreading color effect from a coordinate, coloring adjacent non-whitespace characters
 * Effect shoots out once from the origin point based on elapsed time,
 * and then gradually fades back to the original color
 *
 * @param {Object} screenManager - The text mode screen manager
 * @param {number} startX - The starting X coordinate
 * @param {number} startY - The starting Y coordinate
 * @param {number} maxSpreadDistance - Maximum distance the effect will spread
 * @param {Function} colorFunction - Function that returns a color based on distance and wave position
 * @param {number} startTime - Time when the effect started (milliseconds)
 * @param {number} speed - Speed of the spreading wave (cells per second)
 * @param {number} fadeTime - Time it takes for a cell to fade back to original color (seconds)
 * @param {number} originalColor - The color to fade back to (default 0x0F for white)
 * @returns {boolean} - Whether the effect is complete
 */
function createSpreadingEffect(
  screenManager,
  startX,
  startY,
  maxSpreadDistance,
  colorFunction,
  startTime,
  speed = 15,
  fadeTime = 1.5,
  originalColor = 0x0f,
) {
  // Ensure coordinates are within bounds
  if (
    startX < 0 ||
    startX >= screenManager.charsWide ||
    startY < 0 ||
    startY >= screenManager.charsHigh
  ) {
    return true; // Effect is complete if coordinates are invalid
  }

  // Calculate the current spread distance based on elapsed time
  const elapsedTime = (Date.now() - startTime) / 1000; // Convert to seconds
  const currentWaveFront = elapsedTime * speed;

  // If the wave has gone beyond our max distance and all colors have faded back, the effect is complete
  if (
    currentWaveFront > maxSpreadDistance + 2 &&
    elapsedTime > maxSpreadDistance / speed + fadeTime
  ) {
    return true;
  }

  // Track which cells we've already processed
  const processed = new Set();

  // Queue for breadth-first search, starting with the origin point and distance 0
  const queue = [[startX, startY, 0]];

  while (queue.length > 0) {
    const [x, y, distance] = queue.shift();

    // Skip if out of bounds
    if (
      x < 0 ||
      x >= screenManager.charsWide ||
      y < 0 ||
      y >= screenManager.charsHigh
    ) {
      continue;
    }

    // Skip if already processed or beyond max spread distance
    const key = `${x},${y}`;
    if (processed.has(key) || distance > maxSpreadDistance) {
      continue;
    }
    processed.add(key);

    // Get the character at this position
    const charIndex = x + y * screenManager.charsWide;
    const char = String.fromCharCode(screenManager.charBuffer[charIndex]);

    // Only process non-whitespace characters
    if (char !== " ") {
      // Calculate when the wave front reached this distance
      const timeWaveReachedDistance = distance / speed;

      // Calculate time since the wave front passed this cell
      const timeSinceWavePassed = elapsedTime - timeWaveReachedDistance;

      // Wave front thickness
      const waveFrontDistance = 1.0;

      // Determine if the cell is within the current wave front
      if (distance <= currentWaveFront && timeSinceWavePassed <= fadeTime) {
        let color;

        // If the wave just reached this cell (within the waveFrontDistance), apply wave front color
        if (timeSinceWavePassed < waveFrontDistance) {
          // Apply color based on position within the wave front
          const wavePosition =
            1.0 - (currentWaveFront - distance) / waveFrontDistance;
          color = colorFunction(distance, wavePosition);
        }
        // Otherwise, calculate fade between wave color and original color
        else {
          // Get the wave front color (using position 1.0 for the peak of the wave)
          const waveColor = colorFunction(distance, 1.0);

          // Calculate fade progress (0 = wave color, 1 = original color)
          const fadeProgress = Math.min(
            (timeSinceWavePassed - waveFrontDistance) /
              (fadeTime - waveFrontDistance),
            1.0,
          );

          // Linear interpolation between wave color and original color
          // This is a simple approach - you could implement a more sophisticated color fading if needed
          if (fadeProgress < 1.0) {
            // For simplicity, we'll just fade between the wave color and original color
            // A more advanced version might interpolate RGB values
            color = waveColor;
          } else {
            color = originalColor;
          }
        }

        // Apply the calculated color
        screenManager.colourBuffer[charIndex] = color;
      }

      // Add all 8 adjacent cells to the queue with increased distance
      if (distance < maxSpreadDistance) {
        // Cardinal directions (up, right, down, left)
        queue.push([x, y - 1, distance + 1]); // Up
        queue.push([x + 1, y, distance + 1]); // Right
        queue.push([x, y + 1, distance + 1]); // Down
        queue.push([x - 1, y, distance + 1]); // Left

        // Diagonal directions
        queue.push([x + 1, y - 1, distance + 1]); // Up-Right
        queue.push([x + 1, y + 1, distance + 1]); // Down-Right
        queue.push([x - 1, y + 1, distance + 1]); // Down-Left
        queue.push([x - 1, y - 1, distance + 1]); // Up-Left
      }
    }
  }

  // Effect is still running
  return false;
}

/**
 * Example color functions for the spreading effect
 */

// Bright color that stays visible at the wave front
function waveFrontBrightColor(distance, wavePosition) {
  // Use bright colors (9-15) for the wave front
  return 9 + Math.floor(wavePosition * 6);
}

// Bright white color for the wave front
function brightWhiteWave(distance, wavePosition) {
  // Return white (0x0F) for the wave front
  return 0x0f;
}

// Color that changes based on the distance from origin
function distanceBasedColor(distance, wavePosition) {
  // Use different colors based on distance rings
  return 9 + (distance % 6);
}

// Color that pulses based on distance (creates ring-like waves)
function pulseWaveColor(distance, wavePosition) {
  // Create a "pulse" effect with brighter colors at the wave front
  if (wavePosition > 0.7) {
    return 0x0f; // White at the leading edge
  } else if (wavePosition > 0.4) {
    return 0x0b; // Light cyan
  } else {
    return 0x09; // Light blue
  }
}

// Blue to white gradient based on wave position
function blueToWhiteGradient(distance, wavePosition) {
  // Create a blue to white gradient based on wave position
  const colors = [0x01, 0x09, 0x0b, 0x0f]; // Dark blue, light blue, light cyan, white
  const index = Math.min(
    Math.floor(wavePosition * colors.length),
    colors.length - 1,
  );
  return colors[index];
}

/**
 * Example of how to use the spreading effect in mainLoop:
 *
 * // Track active effects
 * let activeEffects = [];
 *
 * // Handle a new effect (e.g., from mouse click or key press)
 * function startNewEffect(x, y) {
 *   activeEffects.push({
 *     x: x,
 *     y: y,
 *     startTime: Date.now(),
 *     maxDistance: 15,
 *     speed: 20, // cells per second
 *     fadeTime: 1.5, // seconds to fade back to original
 *     originalColor: 0x0F // white
 *   });
 * }
 *
 * // In your mainLoop function:
 * function mainLoop() {
 *   // Your existing code...
 *
 *   // Process all active spreading effects
 *   activeEffects = activeEffects.filter(effect => {
 *     const isComplete = createSpreadingEffect(
 *       screenManager,
 *       effect.x,
 *       effect.y,
 *       effect.maxDistance,
 *       blueToWhiteGradient, // Or any other color function
 *       effect.startTime,
 *       effect.speed,
 *       effect.fadeTime,
 *       effect.originalColor
 *     );
 *
 *     // Remove completed effects
 *     return !isComplete;
 *   });
 *
 *   // Your existing code to present to screen...
 * }
 *
 * // Example: Start a new effect when user clicks
 * canvas.addEventListener('click', (e) => {
 *   const rect = canvas.getBoundingClientRect();
 *   const scaleX = canvas.width / rect.width;
 *   const scaleY = canvas.height / rect.height;
 *
 *   const canvasX = (e.clientX - rect.left) * scaleX;
 *   const canvasY = (e.clientY - rect.top) * scaleY;
 *
 *   // Convert canvas coordinates to character grid coordinates
 *   const charX = Math.floor(canvasX / (canvas.width / screenManager.charsWide));
 *   const charY = Math.floor(canvasY / (canvas.height / screenManager.charsHigh));
 *
 *   startNewEffect(charX, charY);
 * });
 *
 * // Example: Integration with your existing mainLoop
 * function mainLoop() {
 *   // Fill the screen with characters and colors as you normally would
 *   for (let i = 0; i < screenManager.charsWide * screenManager.charsHigh; i++) {
 *     screenManager.charBuffer[i] = getRandomCharFromName();
 *     screenManager.colourBuffer[i] = 0x0F; // Default color
 *   }
 *
 *   // Your existing name rendering code...
 *
 *   // Apply any active spreading effects
 *   // This will color characters that are part of the wave
 *   activeEffects = activeEffects.filter(effect => {
 *     return !createSpreadingEffect(
 *       screenManager,
 *       effect.x,
 *       effect.y,
 *       effect.maxDistance,
 *       blueToWhiteGradient,
 *       effect.startTime,
 *       effect.speed,
 *       effect.fadeTime,
 *       effect.originalColor
 *     );
 *   });
 *
 *   // Periodically create a new effect at a random position within the ASCII art
 *   const timeInSecondsSinceStart = (Date.now() - startTime) / 1000;
 *   if (timeInSecondsSinceStart > 5 && Math.random() < 0.03 && activeEffects.length < 3) {
 *     const nameInRows = NAME.split("\n");
 *     const nameWidth = nameInRows[0].length;
 *     const nameHeight = nameInRows.length;
 *
 *     // Calculate the boundaries of the ASCII art
 *     const startRow = Math.floor((screenManager.charsHigh - nameHeight) / 2);
 *     const startCol = Math.floor((screenManager.charsWide - nameWidth) / 2);
 *
 *     // Pick a random position within the ASCII art
 *     const randRow = startRow + Math.floor(Math.random() * nameHeight);
 *     const randCol = startCol + Math.floor(Math.random() * nameWidth);
 *
 *     // Only start an effect if the character at this position is not a space
 *     const charIndex = randCol + randRow * screenManager.charsWide;
 *     const char = String.fromCharCode(screenManager.charBuffer[charIndex]);
 *     if (char !== ' ') {
 *       startNewEffect(randCol, randRow);
 *     }
 *   }
 *
 *   // Your existing code to present to screen...
 *   screenManager.presentToScreen();
 * }
 */
