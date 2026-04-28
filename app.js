const ASCII_CHARS = "@%#*+=-:. ";

// Minecraft color palettes (dark → light)
const PALETTES = {
  bw:   ["§0", "§f"],
  gray: ["§0","§8","§7","§f"],
  vivid:["§4","§6","§e","§a","§b","§9","§d","§f"],
  warm: ["§4","§6","§c","§e","§f"],
  cool: ["§1","§3","§9","§b","§f"]
};

function pixelToChar(v) {
  const idx = Math.round((v / 255) * (ASCII_CHARS.length - 1));
  return ASCII_CHARS[Math.max(0, Math.min(idx, ASCII_CHARS.length - 1))];
}

function pixelToColor(v, paletteKey) {
  const colors = PALETTES[paletteKey] || PALETTES.bw;
  const idx = Math.round((v / 255) * (colors.length - 1));
  return colors[Math.max(0, Math.min(idx, colors.length - 1))];
}

async function imageToAscii(file, width = 113, height = 14, palette = "bw") {
  const img = new Image();
  img.src = URL.createObjectURL(file);

  // More compatible than img.decode() alone
  await new Promise((resolve, reject) => {
    img.onload = () => resolve();
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
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      const char = pixelToChar(gray);
      const color = pixelToColor(gray, palette);

      row += color + char;
    }
    lines.push(row);
  }
  return lines;
}

document.getElementById("convertBtn").onclick = async () => {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return;

  const palette = document.getElementById("palette").value;

  try {
    const ascii = await imageToAscii(file, 113, 14, palette);
    document.getElementById("output").textContent = ascii.join("\n");
  } catch (e) {
    document.getElementById("output").textContent = "Error processing image.";
    console.error(e);
  }
};
