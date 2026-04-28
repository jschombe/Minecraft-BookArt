// High-contrast ASCII set
const ASCII_CHARS = "@%#*+=-:. ";
const S = String.fromCharCode(0xA7);
const ZW = "\u200C"; // U+200C Zero-Width Non-Joiner

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

// Safe 3-cluster
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

      // Palette influence: B&W vs Color
      if (palette === "Black & White") {
        const gray = 0.299*r + 0.587*g + 0.114*b;
        r = g = b = gray;
      }

      const gray = 0.299*r + 0.587*g + 0.114*b;
      chars.push(pixelToChar(gray));
      rowPixels.push({ r, g, b, x });
    }

    // JAVA MODE — per-character color, no ZW
    if (mode === "java") {
      let row = "", last = null;
      for (let i = 0; i < width; i++) {
        const { r, g, b } = rowPixels[i];
        const code = nearestMinecraftColor(r, g, b);
        if (code !== last) { row += S + code; last = code; }
        row += chars[i];
      }
      lines.push(row);
      continue;
    }

    // BEDROCK MODE — 3 clusters → 2 colors, width-safe

    // 1) Cluster into 3
    const centers = cluster3(rowPixels);

    // 2) Assign each pixel to nearest center
    const assignments = rowPixels.map(p => {
      let best = 0, bestDist = Infinity;
      for (let i = 0; i < 3; i++) {
        const d = (p.r - centers[i].r)**2 +
                  (p.g - centers[i].g)**2 +
                  (p.b - centers[i].b)**2;
        if (d < bestDist) { bestDist = d; best = i; }
      }
      return best;
    });

    // 3) Keep the two most different clusters (K4)
    function dist2(a, b) {
      return (a.r-b.r)**2 + (a.g-b.g)**2 + (a.b-b.b)**2;
    }
    const d01 = dist2(centers[0], centers[1]);
    const d02 = dist2(centers[0], centers[2]);
    const d12 = dist2(centers[1], centers[2]);

    let keepA = 0, keepB = 1, drop = 2;
    let maxD = d01;
    if (d02 > maxD) { maxD = d02; keepA = 0; keepB = 2; drop = 1; }
    if (d12 > maxD) { maxD = d12; keepA = 1; keepB = 2; drop = 0; }

    // 4) Map dropped cluster to farthest remaining color (D2)
    const labels = assignments.map(a => {
      if (a === drop) {
        const dA = dist2(centers[a], centers[keepA]);
        const dB = dist2(centers[a], centers[keepB]);
        return dA > dB ? keepA : keepB;
      }
      return a;
    });

    // 5) Recompute colors for keepA/keepB
    function avgColorFor(label) {
      const pts = rowPixels.filter((_, idx) => labels[idx] === label);
      if (pts.length === 0) return { r:255, g:255, b:255 };
      const sum = pts.reduce((a, p) => ({
        r: a.r + p.r, g: a.g + p.g, b: a.b + p.b
      }), {r:0,g:0,b:0});
      return {
        r: sum.r / pts.length,
        g: sum.g / pts.length,
        b: sum.b / pts.length
      };
    }

    const colA = avgColorFor(keepA);
    const colB = avgColorFor(keepB);
    const codeA = nearestMinecraftColor(colA.r, colA.g, colA.b);
    const codeB = nearestMinecraftColor(colB.r, colB.g, colB.b);

    // 6) Find best split index: left = A, right = B (2 regions, 2 codes)
    // split is number of chars in left region (0..width)
    let bestSplit = 0;
    let bestCost = Infinity;
    for (let split = 0; split <= width; split++) {
      let cost = 0;
      for (let i = 0; i < split; i++) {
        if (labels[i] !== keepA) cost++;
      }
      for (let i = split; i < width; i++) {
        if (labels[i] !== keepB) cost++;
      }
      if (cost < bestCost) {
        bestCost = cost;
        bestSplit = split;
      }
    }

    // 7) Build Bedrock row: 2 color codes, ZW between every visible char
    let row = "";

    // Left region (A)
    row += S + codeA;
    for (let i = 0; i < bestSplit; i++) {
      row += chars[i];
      if (i < bestSplit - 1) row += ZW;
    }

    // Right region (B)
    if (bestSplit < width) {
      row += S + codeB;
      for (let i = bestSplit; i < width; i++) {
        row += chars[i];
        if (i < width - 1) row += ZW;
      }
    }

    lines.push(row);
  }

  return lines;
}

// Color preview for both Java and Bedrock (ignores ZW)
function renderPreview(lines) {
  let html = "";
  for (const line of lines) {
    let color = "#FFFFFF";
    let out = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === ZW) {
        // skip zero-width
        continue;
      }
      if (ch === S && i+1 < line.length) {
        const code = line[i+1].toLowerCase();
        const rgb = MC_RGB[code] || [255,255,255];
        color = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        i++;
      } else {
        out += `<span style="color:${color}">${ch}</span>`;
      }
    }
    html += out + "<br>";
  }
  return html;
}

document.getElementById("convertBtn").onclick = async () => {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return;

  const palette = document.getElementById("palette").value;
  const mode = document.getElementById("mode").value;
  const { width, height, stretchHeight } = getDimensions(mode);

  const ascii = await imageToAscii(file, width, height, stretchHeight, palette, mode);
  document.getElementById("output").textContent = ascii.join("\n");
  document.getElementById("preview").innerHTML = renderPreview(ascii);
};
