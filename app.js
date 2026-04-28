const ASCII_CHARS = "@%#*+=-:. ";

// Minecraft color palettes (dark → light)
const PALETTES = {
  bw: ["§0", "§f"],

  gray: ["§0","§8","§7","§f"],

  vivid: ["§4","§6","§e","§a","§b","§9","§d","§f"],

  warm: ["§4","§6","§c","§e","§f"],

  cool: ["§1","§3","§9","§b","§f"]
};

function pixelToChar(v) {
  const idx = Math.floor(v / 256 * ASCII_CHARS.length);
  return ASCII_CHARS[Math.min(idx, ASCII_CHARS.length - 1)];
}

function pixelToColor(v, palette) {
  const colors = PALETTES[palette];
  const idx = Math.floor(v / 256 * colors.length);
  return colors[Math.min(idx, colors.length - 1)];
}

async function imageToAscii(file, width = 113, height = 14, palette = "bw") {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();

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
      const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];

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

  const ascii = await imageToAscii(file, 113, 14, palette);
  document.getElementById("output").textContent = ascii.join("\n");
};
