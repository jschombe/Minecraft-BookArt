const ASCII_CHARS = "@%#*+=-:. ";
const S = String.fromCharCode(0xA7); // section sign

// Palettes (dark → light)
const PALETTES = {
  bw:   ["0", "f"],
  gray: ["0", "8", "7", "f"],
  vivid:["4", "6", "e", "a", "b", "9", "d", "f"],
  warm: ["4", "6", "c", "e", "f"],
  cool: ["1", "3", "9", "b", "f"]
};

// Browser preview colors
const COLOR_MAP = {
  "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA",
  "4": "#AA0000", "5": "#AA00AA", "6": "#FFAA00", "7": "#AAAAAA",
  "8": "#555555", "9": "#5555FF", "a": "#55FF55", "b": "#55FFFF",
  "c": "#FF5555", "d": "#FF55FF", "e": "#FFFF55", "f": "#FFFFFF"
};

function getDimensions(mode) {
  if (mode === "bedrock") {
    return { width: 16, height: 13, stretchHeight: 17 };
  }
  return { width: 113, height: 14, stretchHeight: 14 };
}

function pixelToChar(v) {
  return ASCII_CHARS[Math.round((v / 255) * (ASCII_CHARS.length - 1))];
}

function pixelToColorCode(v, paletteKey) {
  const colors = PALETTES[paletteKey];
  return colors[Math.round((v / 255) * (colors.length - 1))];
}

// HARD COMPRESSION + MAX 2 TRANSITIONS
function compressToThreeZones(colors) {
  const numeric = colors.map(c => parseInt(c, 16));

  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const mid = Math.round((min + max) / 2);

  return numeric.map(v => {
    if (v < mid - 1) return min.toString(16);
    if (v > mid + 1) return max.toString(16);
    return mid.toString(16);
  });
}

function enforceMaxTransitions(colors, maxTransitions = 2) {
  let transitions = 0;
  let last = colors[0];

  for (let i = 1; i < colors.length; i++) {
    if (colors[i] !== last) {
      transitions++;
      if (transitions > maxTransitions) {
        colors[i] = last;
      } else {
        last = colors[i];
      }
    }
  }

  return colors;
}

async function imageToAscii(file, width, height, stretchHeight, palette) {
  const img =
