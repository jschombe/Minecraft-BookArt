const ASCII_CHARS = "@%#*+=-:. ";
const S = "\u00A7";

// Minecraft color palettes (dark → light)
const PALETTES = {
  bw:   ["0", "f"],
  gray: ["0", "8", "7", "f"],
  vivid:["4", "6", "e", "a", "b", "9", "d", "f"],
  warm: ["4", "6", "c", "e", "f"],
  cool: ["1", "3", "9", "b", "f"]
};

// Browser color equivalents for preview
const COLOR_MAP = {
  "0": "#000000",
  "1": "#0000AA",
  "2": "#00AA00",
  "3": "#00AAAA",
  "4": "#AA0000",
  "5": "#AA00AA",
  "6": "#FFAA00",
  "7": "#AAAAAA",
  "8": "#555555",
  "9": "#5555FF",
  "a": "#55FF55",
  "b": "#55FFFF",
  "c": "#FF5555",
  "d": "#FF55FF",
  "e": "#FFFF55",
  "f": "#FFFFFF"
};

function pixelToChar(v) {
  const idx = Math.round((v / 255) * (ASCII_CHARS.length - 1));
  return ASCII_CHARS[idx];
}

function pixelToColorCode(v, paletteKey) {
  const colors = PALETTES[paletteKey] || PALETTES.bw;
  const idx = Math.round((v / 255) * (colors.length - 1));
  return colors[idx];
}

async function imageToAscii(file, width = 113, height = 14, palette = "bw") {
  const img = new Image();
  img.src = URL.createObjectURL(file);

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(img, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;

  let lines = [];

  for (let y = 0; y < height; y++) {
    let row = "";
    let lastColor = null;

    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      const char = pixelToChar(gray);
      const colorCode = pixelToColorCode(gray, palette);

      if (colorCode !== lastColor) {
        row += S + colorCode;
        lastColor = colorCode;
      }

      row += char;
    }

    lines.push(row);
  }

  return lines;
}

// Convert § codes into HTML spans for preview
function renderPreview(asciiLines) {
  let html = "";

  asciiLines.forEach(line => {
    let currentColor = "#FFFFFF";
    let out = "";

    for (let i = 0; i < line.length; i++) {
      if (line[i] === S && i + 1 < line.length) {
        const code = line[i + 1].toLowerCase();
        currentColor = COLOR_MAP[code] || "#FFFFFF";
        i++; // skip color code
      } else {
        out += `<span style="color:${currentColor}">${line[i]}</span>`;
      }
    }

    html += out + "<br>";
  });

  return html;
}

document.getElementById("convertBtn").onclick = async () => {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return;

  const palette = document.getElementById("palette").value;

  try {
    const ascii = await imageToAscii(file, 113, 14, palette);

    // Raw Minecraft output
    document.getElementById("output").textContent = ascii.join("\n");

    // Live colored preview
    document.getElementById("preview").innerHTML = renderPreview(ascii);

  } catch (e) {
    document.getElementById("output").textContent = "Error processing image.";
    console.error(e);
  }
};
