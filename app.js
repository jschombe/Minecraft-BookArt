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

// K-means-like clustering into 3 clusters
function cluster3(pixels) {
  if (pixels.length === 0) return [
    { r:255, g:255, b:255 },
    { r:255, g:255, b:255 },
    { r:255, g:255, b:255 }
  ];

  let centers = [
    pixels[0],
    pixels[Math.min(5, pixels.length - 1)],
    pixels[Math.min(10, pixels.length - 1)]
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
      const r = data[i], g = data[i+1], b = data[i+2];
      const gray = 0.299*r + 0.587*g + 0.114*b;
      chars.push(pixelToChar(gray));
      rowPixels.push({ r, g, b, x });
    }

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

    // BEDROCK MODE — adaptive 3-color segmentation
    const centers = cluster3(rowPixels);
    const mcColors = centers.map(c => nearestMinecraftColor(c.r, c.g, c.b));

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

    // Build adaptive regions
    const regions = [];
    let start = 0;
    for (let i = 1; i < width; i++) {
      if (assignments[i] !== assignments[i-1]) {
        regions.push({ start, end: i-1, cluster: assignments[i-1] });
        start = i;
      }
    }
    regions.push({ start, end: width-1, cluster: assignments[width-1] });

    // Merge to max 3 regions
    while (regions.length > 3) {
      let smallest = 0;
      for (let i = 1; i < regions.length; i++) {
        if ((regions[i].end - regions[i].start) <
            (regions[smallest].end - regions[smallest].start)) smallest = i;
      }
      if (smallest > 0) regions[smallest-1].end = regions[smallest].end;
      else regions[1].start = regions[0].start;
      regions.splice(smallest, 1);
    }

    // Build Bedrock row with § codes
    let row = "";
    for (const reg of regions) {
      row += S + mcColors[reg.cluster];
      for (let i = reg.start; i <= reg.end; i++) row += chars[i];
    }
    lines.push(row);
  }

  return lines;
}

// Color preview for both Java and Bedrock
function renderPreview(lines) {
  let html = "";
  for (const line of lines) {
    let color = "#FFFFFF";
    let out = "";
    for (let i = 0; i < line.length; i++) {
      if (line[i] === S && i+1 < line.length) {
        const code = line[i+1].toLowerCase();
        const rgb = MC_RGB[code] || [255,255,255];
        color = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        i++;
      } else {
        out += `<span style="color:${color}">${line[i]}</span>`;
      }
    }
    html += out + "<br>";
  }
  return html;
}

document.getElementById("convertBtn").onclick = async () => {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return;

  const palette = document.getElementById("palette").value; // kept for future use
  const mode = document.getElementById("mode").value;
  const { width, height, stretchHeight } = getDimensions(mode);

  const ascii = await imageToAscii(file, width, height, stretchHeight, palette, mode);
  document.getElementById("output").textContent = ascii.join("\n");
  document.getElementById("preview").innerHTML = renderPreview(ascii);
};
