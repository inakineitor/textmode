// ripple.js - Spreading wave effects

/**
 * Creates a single spreading color effect from a coordinate, coloring adjacent non-whitespace characters
 * Effect shoots out once from the origin point based on elapsed time,
 * and then gradually fades back to the original color
 *
 * @param {Object} screenManager - The text mode screen manager
 * @param {number} startX - The starting X coordinate
 * @param {number} startY - The starting Y coordinate
 * @param {number} maxSpreadDistance - Maximum distance the effect will spread
 * @param {Function} baseColorFn - Function that returns a color based on distance and wave position
 * @param {number} startTime - Time when the effect started (milliseconds)
 * @param {number} speed - Speed of the spreading wave (cells per second)
 * @param {number} fadeTime - Time it takes for a cell to fade back to original color (seconds)
 * @param {number} originalColor - The color to fade back to (default 0x0F for white)
 * @param {number} colorHoldMs - Time to hold color for a cell
 * @param {Map} cellColorStatesMap - Map to store { color, lastChangeTime } for cells
 * @returns {boolean} - Whether the effect is complete
 */
export function createSpreadingEffect(
  screenManager,
  startX,
  startY,
  maxSpreadDistance,
  baseColorFn,
  startTime,
  speed = 15,
  fadeTime = 1.5,
  originalColor = 0x0f,
  colorHoldMs,
  cellColorStatesMap
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
        const currentTime = Date.now();
        let cellState = cellColorStatesMap.get(key);

        if (!cellState || (currentTime - cellState.lastChangeTime > colorHoldMs)) {
            const newColor = baseColorFn();
            cellState = { color: newColor, lastChangeTime: currentTime };
            cellColorStatesMap.set(key, cellState);
        }
        
        const currentColorForCell = cellState.color;
        let finalColorToDraw;

        // If the wave just reached this cell (within the waveFrontDistance), apply wave front color
        if (timeSinceWavePassed < waveFrontDistance) {
          finalColorToDraw = currentColorForCell; 
        }
        // Otherwise, calculate fade between wave color and original color
        else {
          const waveColor = currentColorForCell; // The color determined by hold logic is the wave's peak color for this cell

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
            finalColorToDraw = waveColor;
          } else {
            finalColorToDraw = originalColor;
          }
        }

        // Apply the calculated color
        screenManager.colourBuffer[charIndex] = finalColorToDraw;
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
export function waveFrontBrightColor(distance, wavePosition) {
  // Use bright colors (9-15) for the wave front
  return 9 + Math.floor(wavePosition * 6);
}

// Bright white color for the wave front
export function brightWhiteWave(distance, wavePosition) {
  // Return white (0x0F) for the wave front
  return 0x0f;
}

// Color that changes based on the distance from origin
export function distanceBasedColor(distance, wavePosition) {
  // Use different colors based on distance rings
  return 9 + (distance % 6);
}

// Color that pulses based on distance (creates ring-like waves)
export function pulseWaveColor(distance, wavePosition) {
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
export function blueToWhiteGradient(distance, wavePosition) {
  // Create a blue to white gradient based on wave position
  const colors = [0x01, 0x09, 0x0b, 0x0f]; // Dark blue, light blue, light cyan, white
  const index = Math.min(
    Math.floor(wavePosition * colors.length),
    colors.length - 1,
  );
  return colors[index];
}
