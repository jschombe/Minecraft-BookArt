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

    // JAVA MODE — unchanged
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

    // BEDROCK MODE — S4 dynamic shrink (<16 total chars)

    // 1) Compute average color for whole row
    const avg = rowPixels.reduce((a,p)=>({
      r:a.r+p.r, g:a.g+p.g, b:a.b+p.b
    }),{r:0,g:0,b:0});
    avg.r/=rowPixels.length; avg.g/=rowPixels.length; avg.b/=rowPixels.length;

    const code = nearestMinecraftColor(avg.r, avg.g, avg.b);

    // 2) One color code = 2 characters ( § + code )
    const formattingChars = 2;

    // 3) Max visible ASCII allowed
    const maxVisible = 15 - formattingChars; // must keep total < 16

    // 4) Slice ASCII to fit
    const safeChars = chars.slice(0, maxVisible).join("");

    // 5) Build final Bedrock-safe line
    let row = S + code + safeChars;

    // Hard enforce <16 chars
    row = row.slice(0, 15);

    lines.push(row);
  }

  return lines;
}

// Preview (ignores formatting)
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

  const palette = document.getElementById("palette").value;
  const mode = document.getElementById("mode").value;
  const { width, height, stretchHeight } = getDimensions(mode);

  const ascii = await imageToAscii(file, width, height, stretchHeight, palette, mode);
  document.getElementById("output").textContent = ascii.join("\n");
  document.getElementById("preview").innerHTML = renderPreview(ascii);
};
