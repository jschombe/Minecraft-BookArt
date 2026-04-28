const ASCII_CHARS = "@%#*+=-:. ";
const S = String.fromCharCode(0xA7); // section sign (Java only)

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
    return { width: 16, height: 13, stretchHeight: 13 };
  }
  return { width: 113, height: 14, stretchHeight: 14 };
}

function pixelToChar(v) {
  return ASCII_CHARS[Math.round((v / 255) * (ASCII_CHARS.length - 1))];
}

function pixelToColorCode(v, paletteKey) {
  const colors = PALETTES[paletteKey] || PALETTES.bw;
  return colors[Math.round((v / 255) * (colors.length - 1))];
}

// OPTION B — dominant-color-based 3-cluster compression
function dominantThree(colors) {
  const freq = {};
  colors.forEach(c => freq[c] = (freq[c] || 0) + 1);

  const top3 = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(e => e[0]);

  return colors.map(c => {
    let best = top3[0];
    let bestDist = Math.abs(parseInt(c, 16) - parseInt(best, 16));

    for (let t of top3) {
      const d = Math.abs(parseInt(c, 16) - parseInt(t, 16));
      if (d < bestDist) {
        best = t;
        bestDist = d;
      }
    }
    return best;
  });
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

    let chars = [];
    let colors = [];

    for (let x = 0; x < width; x++) {
      const i = (srcY * width + x) * 4;
      const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];

      chars.push(pixelToChar(gray));
      colors.push(pixelToColorCode(gray, palette));
    }

    // OPTION B: dominant 3-color clustering
    colors = dominantThree(colors);

    let row = "";
    let lastColor = null;

    for (let i = 0; i < width; i++) {
      if (mode === "java") {
        if (colors[i] !== lastColor) {
          row += S + colors[i];
          lastColor = colors[i];
        }
        row += chars[i];
      } else {
        // BEDROCK: pure ASCII only
        row += chars[i];
      }
    }

    lines.push(row);
  }

  return lines;
}

function renderPreview(lines, mode) {
  if (mode === "bedrock") {
    return lines.join("<br>");
  }

  // Java colored preview
  let html = "";
  for (const line of lines) {
    let currentColor = "#FFFFFF";
    let out = "";

    for (let i = 0; i < line.length; i++) {
      if (line[i] === S && i + 1 < line.length) {
        const code = line[i + 1].toLowerCase();
        currentColor = COLOR_MAP[code] || "#FFFFFF";
        i++;
      } else {
        out += `<span style="color:${currentColor}">${line[i]}</span>`;
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
  document.getElementById("preview").innerHTML = renderPreview(ascii, mode);
};
