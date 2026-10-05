import type { Lang } from "@/data/i18n";

const COPY: Record<Lang, { eyebrow: string; title: string }> = {
  ru: { eyebrow: "Touché · Дневник желаний", title: "Для нас двоих" },
  en: { eyebrow: "Touché · Wish Diary", title: "For the two of us" },
  hi: { eyebrow: "Touché · इच्छा डायरी", title: "हम दोनों के लिए" },
  pt: { eyebrow: "Touché · Diário de Desejos", title: "Para nós dois" },
  es: { eyebrow: "Touché · Diario de Deseos", title: "Para los dos" },
};

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = "";

    if (context.measureText(word).width <= maxWidth) {
      line = word;
      continue;
    }
    let fragment = "";
    for (const character of word) {
      const next = `${fragment}${character}`;
      if (fragment && context.measureText(next).width > maxWidth) {
        lines.push(fragment);
        fragment = character;
      } else {
        fragment = next;
      }
    }
    line = fragment;
  }

  if (line) lines.push(line);
  return lines;
}

function drawStar(context: CanvasRenderingContext2D, x: number, y: number, radius: number, alpha: number) {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = "#edc49d";
  context.beginPath();
  for (let point = 0; point < 8; point += 1) {
    const angle = -Math.PI / 2 + point * Math.PI / 4;
    const distance = point % 2 === 0 ? radius : radius * 0.26;
    const px = x + Math.cos(angle) * distance;
    const py = y + Math.sin(angle) * distance;
    if (point === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
  context.fill();
  context.restore();
}

function loadCoverImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("wish_image_cover_unavailable"));
    image.src = "/images/wish-diary-cover.png";
  });
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const targetRatio = width / height;
  const imageRatio = image.width / image.height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.width;
  let sourceHeight = image.height;

  if (imageRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / targetRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  context.save();
  roundedRect(context, x, y, width, height, radius);
  context.clip();
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  context.restore();
}

export async function createWishShareImage(text: string, lang: Lang): Promise<string> {
  await document.fonts?.ready;
  const cover = await loadCoverImage();
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("wish_image_canvas_unavailable"));

  const copy = COPY[lang];
  const cleanText = text.replace(/\s+/gu, " ").trim();

  context.fillStyle = "#fffaf3";
  context.fillRect(0, 0, canvas.width, canvas.height);

  roundedRect(context, 32, 32, 1016, 1286, 42);
  context.fillStyle = "#fceacc";
  context.fill();
  context.strokeStyle = "#162238";
  context.lineWidth = 5;
  context.stroke();

  drawImageCover(context, cover, 56, 56, 968, 520, 30);
  roundedRect(context, 56, 56, 968, 520, 30);
  context.strokeStyle = "#162238";
  context.lineWidth = 5;
  context.stroke();
  drawStar(context, 91, 91, 14, 1);
  drawStar(context, 989, 540, 12, 0.95);

  context.textAlign = "center";
  context.textBaseline = "middle";
  roundedRect(context, 92, 612, 896, 77, 21);
  context.fillStyle = "#fff";
  context.fill();
  context.strokeStyle = "#162238";
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = "#78183d";
  context.font = "700 20px 'DM Sans', Arial, sans-serif";
  context.fillText(copy.eyebrow.toUpperCase(), 540, 650, 830);

  context.fillStyle = "#162238";
  context.font = "600 43px 'Space Grotesk', 'DM Sans', Arial, sans-serif";
  context.fillText(copy.title, 540, 735, 850);

  roundedRect(context, 76, 788, 928, 440, 32);
  context.fillStyle = "#fff";
  context.fill();
  context.strokeStyle = "#162238";
  context.lineWidth = 4;
  context.stroke();
  drawStar(context, 125, 836, 11, 0.95);
  drawStar(context, 955, 1181, 10, 0.95);

  const maxWidth = 800;
  let fontSize = 50;
  let lineHeight = 61;
  let lines: string[] = [];
  do {
    context.font = `${fontSize}px Georgia, 'Times New Roman', serif`;
    lines = wrapText(context, cleanText, maxWidth);
    lineHeight = Math.round(fontSize * 1.22);
    if (lines.length * lineHeight <= 330 || fontSize <= 30) break;
    fontSize -= 2;
  } while (fontSize > 28);

  const firstLineY = 1008 - ((lines.length - 1) * lineHeight) / 2;
  context.font = `${fontSize}px Georgia, 'Times New Roman', serif`;
  context.fillStyle = "#162238";
  context.textAlign = "center";
  context.textBaseline = "middle";
  lines.forEach((line, index) => {
    context.fillText(line, 540, firstLineY + index * lineHeight, maxWidth);
  });

  drawStar(context, 150, 1264, 13, 0.9);
  drawStar(context, 930, 1264, 13, 0.9);
  context.fillStyle = "#ff6f61";
  roundedRect(context, 485, 1245, 110, 36, 18);
  context.fill();
  context.fillStyle = "#162238";
  context.font = "700 16px 'Space Grotesk', 'DM Sans', Arial, sans-serif";
  context.fillText("TOUCHÉ", 540, 1263, 95);

  const image = canvas.toDataURL("image/jpeg", 0.91);
  if (!image.startsWith("data:image/jpeg;base64,") || image.length > 2_000_024) {
    return Promise.reject(new Error("wish_image_encoding_failed"));
  }
  return Promise.resolve(image);
}
