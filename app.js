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

async function imageToAscii(file, palette) {
  const img = new Image();
  img.src = URL.createObjectURL(file);

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  // Bedrock dimensions (fixed)
  const width = 16;
  const height = 13;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  const data = ctx.getImageData(0, 0, width, height).data;
  const lines = [];

  for (let y = 0; y < height; y++) {
    const rowPixels = [];
    const chars = [];

    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      let r = data[i], g = data[i+1], b = data[i+2];

      if (palette === "bw") {
        const gray = 0.299*r + 0.587*g + 0.114*b;
        r = g = b = gray;
      }

      const gray = 0.299*r + 0.587*g + 0.114*b;
      chars.push(pixelToChar(gray));
      rowPixels.push({ r, g, b });
    }

    // Compute average color for whole row
    const avg = rowPixels.reduce((a,p)=>({
      r:a.r+p.r, g:a.g+p.g, b:a.b+p.b
    }),{r:0,g:0,b:0});
    avg.r/=rowPixels.length; avg.g/=rowPixels.length; avg.b/=rowPixels.length;

    const code = nearestMinecraftColor(avg.r, avg.g, avg.b);

    // One color code = 2 chars
    const formattingChars = 2;

    // Max visible ASCII allowed
    const maxVisible = 15 - formattingChars;

    // Slice ASCII to fit
    let row = S + code + chars.slice(0, maxVisible).join("");

    // Hard enforce <16 chars
    row = row.slice(0, 15);

    lines.push(row);
  }

  return lines;
}

document.getElementById("convertBtn").onclick = async () => {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return;

  const palette = document.getElementById("palette").value;

  const ascii = await imageToAscii(file, palette);
  document.getElementById("output").textContent = ascii.join("\n");
};
