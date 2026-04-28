const ASCII_CHARS = "@%#*+=-:. ";
const S = String.fromCharCode(0xA7);

// Minecraft chat color RGB values
const MC_RGB = {
  "0": [0,0,0],       "1": [0,0,170],     "2": [0,170,0],
  "3": [0,170,170],   "4": [170,0,0],     "5": [170,0,170],
  "6": [255,170,0],   "7": [170,170,170], "8": [85,85,85],
  "9": [85,85,255],   "a": [85,255,85],   "b": [85,255,255],
  "c": [255,85,85],   "d": [255,85,255],  "e": [255,255,85],
  "f": [255,255,255]
};

function getDimensions(mode) {
  return mode === "bedrock"
    ? { width: 16, height: 13, stretchHeight: 13 }
    : { width: 113, height: 14, stretchHeight: 14 };
}

function pixelToChar(v) {
  return ASCII_CHARS[Math.round((v / 255) * (ASCII_CHARS.length - 1))];
}

function nearestMinecraftColor(r, g, b) {
  let best = "f";
  let bestDist = Infinity;

  for (const code in MC_RGB) {
    const [R, G, B] = MC_RGB[code];
    const d = (r-R)**2 + (g-G)**2 + (b-B)**2;
    if (d < bestDist) {
      bestDist = d;
      best = code;
    }
  }
  return best;
}

// K-means-like clustering into 3 clusters
function cluster3(pixels) {
  let centers = [pixels[0], pixels[5] || pixels[0], pixels[10] || pixels[0]];

  for (let iter = 0; iter < 4; iter++) {
    const groups = [[], [], []];

    for (const p of pixels) {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < 3; i++) {
        const d = (p.r - centers[i].r)**2 +
                  (p.g - centers[i].g)**2 +
                  (p.b - centers[i].b)**2;
        if (d < bestDist) {
          bestDist
