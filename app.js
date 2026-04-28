// High-contrast ASCII set
const ASCII_CHARS = "@%#*+=-:. ";
const S = String.fromCharCode(0xA7);

// Minecraft chat color RGB values
const MC_RGB = {
  "0": [0,0,0], "1": [0,0,170], "2": [0,170,0], "3": [0,170,170],
  "4": [170,0,0], "5": [170,0,170], "6": [255,170,0], "7": [170,170,170],
  "8": [85,85,85], "9": [85,85,255], "a": [85,255,85], "b": [85,255,255],
  "c": [255,85,85], "d": [255,85,255], "e": [255,255,85], "f": [255,255,255]
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
    if (d < bestDist) { bestDist = d; best = code; }
  }
  return best;
}

// Simple 3-cluster
function cluster3(pixels) {
  if (pixels.length < 3) {
    const p = pixels[0] || {r:255,g:255,b:255};
    return [p, p, p];
  }

  let centers = [
    pixels[0],
    pixels[Math.floor(pixels.length/2)],
    pixels[pixels.length-1]
  ];

  for (let iter = 0; iter < 4; iter++) {
    const groups = [[], [], []];

    for (const p of pixels) {
      let best = 0, bestDist = Infinity;
      for (let i = 0; i < 3; i++) {
        const d = (p.r - centers[i].r)**2 +
                  (p.g - centers[i].g)**2 +
                  (p.b - centers[i].b)**2;
        if (d < bestDist) { bestDist = d; best = i; }
      }
      groups[best].push(p);
    }

    for (let i = 0; i < 3; i++) {
      if (groups[i].length === 0) continue;
      const avg = groups[i].reduce((a, p) => ({
        r: a.r + p.r, g: a.g + p.g, b: a.b + p.b
      }), {r:0,g:0,b:0});
      centers[i] = {
        r: avg.r / groups[i].length,
        g: avg.g / groups[i].length,
        b: avg.b / groups[i].length
      };
    }
  }

  return centers;
}

async function imageToAscii(file, width, height, stretchHeight, palette, mode) {
  const img = new Image();
  img.src = URL.createObjectURL(file);

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = stretchHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, stretchHeight);

  const data = ctx.getImageData(0, 0, width, stretchHeight).data;
  const lines = [];

  for (let y = 0; y < height; y++) {
    const srcY = Math.floor((y / height) * stretchHeight);
    const rowPixels = [];
    const chars = [];

    for (let x = 0; x < width; x++) {
      const i = (srcY * width + x) * 4;
      let r = data[i], g = data[i+1], b = data[i+2];

      if (palette === "Black & White") {
        const gray = 0.299*r + 0.587*g + 0.114*b;
        r = g = b = gray;
      }

      const gray = 0.299*r + 0.587*g + 0.114*b;
      chars.push(pixelToChar(gray));
      rowPixels.push({ r, g, b });
    }

    // JAVA MODE
    if (mode === "java") {
      let row = "", last = null;
      for (let i = 0; i < width; i++) {
        const { r, g, b } = rowPixels[i];
        const code = nearestMinecraftColor(r, g, b);
// High-contrast ASCII set
const ASCII_CHARS = "@%#*+=-:. ";
const S = String.fromCharCode(0xA7);

// Minecraft chat color RGB values
const MC_RGB = {
  "0": [0,0,0], "1": [0,0,170], "2": [0,170,0], "3": [0,170,170],
  "4": [170,0,0], "5": [170,0,170], "6": [255,170,0], "7": [170,170,170],
  "8": [85,85,85], "9": [85,85,255], "a": [85,255,85], "b": [85,255,255],
  "c": [255,85,85], "d": [255,85,255], "e": [255,255,85], "f": [255,255,255]
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
    if (d < bestDist) { bestDist = d; best = code; }
  }
  return best;
}

// Simple 3-cluster
function cluster3(pixels) {
  if (pixels.length < 3) {
    const p = pixels[0] || {r:255,g:255,b:255};
    return [p, p, p];
  }

  let centers = [
    pixels[0],
    pixels[Math.floor(pixels.length/2)],
    pixels[pixels.length-1]
  ];

  for (let iter = 0; iter < 4; iter++) {
    const groups = [[], [], []];

    for (const p of pixels) {
      let best = 0, bestDist = Infinity;
      for (let i = 0; i < 3; i++) {
        const d = (p.r - centers[i].r)**2 +
                  (p.g - centers[i].g)**2 +
                  (p.b - centers[i].b)**2;
        if (d < bestDist) { bestDist = d; best = i; }
      }
      groups[best].push(p);
    }

    for (let i = 0; i < 3; i++) {
      if (groups[i].length === 0) continue;
      const avg = groups[i].reduce((a, p) => ({
        r: a.r + p.r, g: a.g + p.g, b: a.b + p.b
      }), {r:0,g:0,b:0});
      centers[i] = {
        r: avg.r / groups[i].length,
        g: avg.g / groups[i].length,
        b: avg.b / groups[i].length
      };
    }
  }

  return centers;
}

async function imageToAscii(file, width, height, stretchHeight, palette, mode) {
  const img = new Image();
  img.src = URL.createObjectURL(file);

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = stretchHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, stretchHeight);

  const data = ctx.getImageData(0, 0, width, stretchHeight).data;
  const lines = [];

  for (let y = 0; y < height; y++) {
    const srcY = Math.floor((y / height) * stretchHeight);
    const rowPixels = [];
    const chars = [];

    for (let x = 0; x < width; x++) {
      const i = (srcY * width + x) * 4;
      let r = data[i], g = data[i+1], b = data[i+2];

      if (palette === "Black & White") {
        const gray = 0.299*r + 0.587*g + 0.114*b;
        r = g = b = gray;
      }

      const gray = 0.299*r + 0.587*g + 0.114*b;
      chars.push(pixelToChar(gray));
      rowPixels.push({ r, g, b });
    }

    // JAVA MODE
    if (mode === "java") {
      let row = "", last = null;
      for (let i = 0; i < width; i++) {
        const { r, g, b } = rowPixels[i];
        const code = nearestMinecraftColor(r, g, b);
