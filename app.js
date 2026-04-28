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
  return mode === "bedrock"
    ? { width: 16, height: 13 }
    : { width: 113, height: 14 };
}

function pixelToChar(v) {
  return ASCII_CHARS[Math.round((v / 255) * (ASCII_CHARS.length - 1))];
}

function pixelToColorCode(v, paletteKey) {
  const colors = PALETTES[paletteKey];
  return colors[Math.round((v / 255) * (colors.length - 1))];
}

async function imageToAscii(file, width, height, palette) {
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
      const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];

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

function renderPreview(lines) {
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
  const { width, height } = getDimensions(mode);

  const ascii = await imageToAscii(file, width, height, palette);

  document.getElementById("output").textContent = ascii.join("\n");
  document.getElementById("preview").innerHTML = renderPreview(ascii);
};
