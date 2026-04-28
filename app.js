const ASCII_CHARS = "@%#*+=-:. ";

function pixelToChar(v) {
  const idx = Math.floor(v / 256 * ASCII_CHARS.length);
  return ASCII_CHARS[Math.min(idx, ASCII_CHARS.length - 1)];
}

async function imageToAscii(file, width = 113, height = 14) {
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
      row += pixelToChar(gray);
    }
    lines.push(row);
  }
  return lines;
}

document.getElementById("convertBtn").onclick = async () => {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return;

  const ascii = await imageToAscii(file);
  document.getElementById("output").textContent = ascii.join("\n");
};
