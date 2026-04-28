// LIGHT BACKGROUND ASCII SET (inverted)
const ASCII_CHARS = ".:-=+*#%@";
const S = String.fromCharCode(0xA7);

const MC_RGB = {
  "0":[0,0,0],"1":[0,0,170],"2":[0,170,0],"3":[0,170,170],
  "4":[170,0,0],"5":[170,0,170],"6":[255,170,0],"7":[170,170,170],
  "8":[85,85,85],"9":[85,85,255],"a":[85,255,85],"b":[85,255,255],
  "c":[255,85,85],"d":[255,85,255],"e":[255,255,85],"f":[255,255,255]
};

function pixelToChar(v){
  return ASCII_CHARS[Math.round((v/255)*(ASCII_CHARS.length-1))];
}

function nearestMinecraftColor(r,g,b){
  let best="f",dist=Infinity;
  for(const c in MC_RGB){
    const [R,G,B]=MC_RGB[c];
    const d=(r-R)**2+(g-G)**2+(b-B)**2;
    if(d<dist){dist=d;best=c;}
  }
  return best;
}

async function imageToAscii(file,palette,mode){
  const img=new Image();
  img.src=URL.createObjectURL(file);
  await img.decode();

  const width = mode==="java" ? 113 : 16;
  const height = mode==="java" ? 14 : 13;

  const canvas=document.createElement("canvas");
  canvas.width=width;
  canvas.height=height;
  const ctx=canvas.getContext("2d");
  ctx.drawImage(img,0,0,width,height);

  const data=ctx.getImageData(0,0,width,height).data;
  const lines=[];

  for(let y=0;y<height;y++){
    const rowPixels=[];
    const chars=[];

    for(let x=0;x<width;x++){
      const i=(y*width+x)*4;
      let r=data[i],g=data[i+1],b=data[i+2];

      const brightness = 0.299*r + 0.587*g + 0.114*b;

      // BACKGROUND REMOVAL
      if(brightness > 200){
        chars.push(" "); // background = space
      } else {
        chars.push(pixelToChar(brightness)); // sword pixel
      }

      rowPixels.push({r,g,b});
    }

    // JAVA MODE (full color transitions)
    if(mode==="java"){
      let row="",last=null;
      for(let i=0;i<width;i++){
        const {r,g,b}=rowPixels[i];
        const code=nearestMinecraftColor(r,g,b);
        if(code!==last){row+=S+code;last=code;}
        row+=chars[i];
      }
      lines.push(row);
      continue;
    }

    // BEDROCK — compute average color
    const avg=rowPixels.reduce((a,p)=>({r:a.r+p.r,g:a.g+p.g,b:a.b+p.b}),
                               {r:0,g:0,b:0});
    avg.r/=rowPixels.length; avg.g/=rowPixels.length; avg.b/=rowPixels.length;
    const code=nearestMinecraftColor(avg.r,avg.g,avg.b);

    // BEDROCK S4 dynamic shrink
    const formatting=2;
    const maxVisible=15-formatting;

    let row=S+code+chars.slice(0,maxVisible).join("");
    row=row.replace(/\s+$/,""); // trim trailing spaces
    row=row.slice(0,15);

    lines.push(row);
  }

  return lines;
}

// PREVIEW — Bedrock uses ONE color per line
function renderPreview(lines,mode){
  let html="";
  for(const line of lines){
    let color="#fff",out="";

    if(mode!=="java"){
      const code=line[1];
      const rgb=MC_RGB[code]||[255,255,255];
      color=`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;

      const visible=line.replace(/§./g,"");
      out+=`<span style="color:${color}">${visible}</span>`;
      html+=out+"<br>";
      continue;
    }

    // JAVA preview
    for(let i=0;i<line.length;i++){
      if(line[i]===S && i+1<line.length){
        const code=line[i+1];
        const rgb=MC_RGB[code]||[255,255,255];
        color=`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        i++;
      } else {
        out+=`<span style="color:${color}">${line[i]}</span>`;
      }
    }
    html+=out+"<br>";
  }
  return html;
}

document.getElementById("convertBtn").onclick=async()=>{
  const file=document.getElementById("fileInput").files[0];
  if(!file) return;

  const palette=document.getElementById("palette").value;
  const mode=document.getElementById("mode").value;

  const ascii=await imageToAscii(file,palette,mode);

  document.getElementById("output").textContent=ascii.join("\n");
  document.getElementById("preview").innerHTML=renderPreview(ascii,mode);
};
