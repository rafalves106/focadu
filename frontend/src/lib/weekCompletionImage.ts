import type { PublicationImageDto } from '../api/types';
import logoWordmark from '../assets/pixel/logo-wordmark.png';
import focadaComemorando from '../assets/pixel/focada-comemorando.png';

/**
 * Fase 107: imagem de conclusao da semana que acompanha o post do LinkedIn (Figma "Focadu — Pixel Art", pagina
 * "Imagem de conclusao da semana — v1", componente "Quadrado 1080x1080", node 323:4912). Desenhada em canvas com as
 * medidas do modelo; os textos vem da Focada (PublicationImageDto) e o nome/data do aluno. Texto longo quebra linha
 * (no maximo 2), nunca corta no meio - os limites de caracteres ja vem garantidos pelo backend.
 */

const SIZE = 1080;
const MARGIN = 60;
const CONTENT = SIZE - MARGIN * 2;

const COLOR = {
  base: '#0a0a0a',
  surfaceAlt: '#1e1e1e',
  stroke: '#2a2a2a',
  accent: '#39ff6a',
  project: '#ffb800',
  primary: '#f5f5f5',
  secondary: '#9a9a9a',
  muted: '#5c5c5c',
};

const FONT = {
  label: (px: number) => `${px}px Silkscreen`,
  sans: (px: number, weight = 400) => `${weight} ${px}px Inter`,
  pixel: (px: number) => `${px}px VT323`,
};

const seloUrls = import.meta.glob<string>('../assets/pixel/selos/selo-semana-*.png', { eager: true, import: 'default' });

function seloFor(week: number): string | null {
  const n = String(Math.min(Math.max(week, 1), 12)).padStart(2, '0');
  return seloUrls[`../assets/pixel/selos/selo-semana-${n}.png`] ?? null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Imagem nao carregou: ${src}`));
    img.src = src;
  });
}

/** Quebra o texto em linhas que cabem na largura (por palavra), no maximo `maxLines`. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= width || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  return lines.slice(0, maxLines);
}

/** Texto com espacamento entre letras (rotulos em Silkscreen do modelo). */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number): number {
  let cursor = x;
  for (const ch of text) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
  return cursor - tracking - x;
}

function measureSpaced(ctx: CanvasRenderingContext2D, text: string, tracking: number): number {
  return [...text].reduce((w, ch) => w + ctx.measureText(ch).width + tracking, 0) - tracking;
}

function chip(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, alignRight = false): number {
  ctx.font = FONT.label(16);
  const width = measureSpaced(ctx, text, 2) + 28;
  const left = alignRight ? x - width : x;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(left + 1, y + 1, width - 2, 41);
  ctx.fillStyle = color;
  spaced(ctx, text, left + 14, y + 13, 2);
  return width;
}

export function formatImageDate(date: Date): string {
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/** Nome do aluno no limite do modelo (32): se passar, primeiro e ultimo nome. */
export function imageStudentName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 32) return trimmed;
  const parts = trimmed.split(/\s+/);
  const short = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : trimmed;
  return short.slice(0, 32);
}

export async function renderWeekCompletionImage(
  image: PublicationImageDto,
  studentName: string,
  date: Date = new Date(),
): Promise<Blob> {
  await Promise.all([
    document.fonts.load(FONT.label(16)),
    document.fonts.load(FONT.sans(26)),
    document.fonts.load(FONT.sans(52, 700)),
    document.fonts.load(FONT.sans(30, 600)),
    document.fonts.load(FONT.pixel(32)),
  ]).catch(() => {});

  const seloSrc = seloFor(image.weekNumber);
  const [logo, focada, selo] = await Promise.all([
    loadImage(logoWordmark),
    loadImage(focadaComemorando),
    seloSrc ? loadImage(seloSrc) : Promise.resolve(null),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponivel neste navegador.');
  ctx.imageSmoothingEnabled = false;
  ctx.textBaseline = 'top';

  // Fundo e moldura de 4px (o LinkedIn reduz a imagem no feed; 2px sumiria).
  ctx.fillStyle = COLOR.base;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = COLOR.stroke;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, SIZE - 4, SIZE - 4);

  // Topo: marca e curso.
  ctx.drawImage(logo, MARGIN, 60.5, 210, 42);
  if (image.courseName) chip(ctx, image.courseName.toUpperCase().slice(0, 24), MARGIN + CONTENT, 60, COLOR.accent, true);

  // Destaque: selo da semana, "Semana N de 12 concluida", titulo e barra de progresso.
  const top = 182;
  if (selo) ctx.drawImage(selo, MARGIN, top, 240, 240);
  const textX = MARGIN + 280;
  const textW = CONTENT - 280;
  ctx.fillStyle = COLOR.accent;
  ctx.font = FONT.label(22);
  spaced(ctx, `SEMANA ${image.weekNumber} DE ${image.totalWeeks} CONCLUÍDA`, textX, top + 9, 3);

  ctx.fillStyle = COLOR.primary;
  ctx.font = FONT.sans(52, 700);
  const titleLines = wrap(ctx, image.weekTitle, textW, 2);
  titleLines.forEach((line, i) => ctx.fillText(line, textX, top + 54 + i * 60));

  const progressY = top + 54 + titleLines.length * 60 + 16;
  ctx.fillStyle = COLOR.secondary;
  ctx.font = FONT.label(13);
  spaced(ctx, 'PROGRESSO NO CURSO', textX, progressY, 2);
  for (let i = 0; i < image.totalWeeks; i++) {
    const x = textX + i * 20;
    const done = i < image.weekNumber;
    ctx.fillStyle = done ? COLOR.accent : COLOR.surfaceAlt;
    ctx.fillRect(x, progressY + 28, 16, 16);
    if (!done) {
      ctx.strokeStyle = COLOR.stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, progressY + 29, 14, 14);
    }
  }

  // O que eu levo daqui (3 aprendizados, ate 2 linhas cada) e o projeto entregue. Texto no limite e com letra larga
  // pode nao caber em 26px antes da divisoria (y=874): a fonte desce ate caber, nunca corta nem sobrepoe.
  const listTop = Math.max(501, top + 240 + 79) + 39;
  const projectGap = 40;
  let fit = { size: 26, lead: 36, title: 30, titleLead: 38 };
  let highlightLines: string[][] = [];
  let projectLines: string[] = [];
  let chipW = 0;
  for (const candidate of [
    { size: 26, lead: 36, title: 30, titleLead: 38 },
    { size: 23, lead: 31, title: 27, titleLead: 34 },
    { size: 20, lead: 27, title: 24, titleLead: 30 },
  ]) {
    fit = candidate;
    ctx.font = FONT.sans(fit.size);
    highlightLines = image.highlights.map((h) => wrap(ctx, h, CONTENT - 28, 2));
    const listEnd = listTop + highlightLines.reduce((sum, lines) => sum + lines.length * fit.lead + 12, 0);
    ctx.font = FONT.label(16);
    chipW = measureSpaced(ctx, 'PROJETO ENTREGUE', 2) + 28;
    ctx.font = FONT.sans(fit.title, 600);
    projectLines = image.projectTitle ? wrap(ctx, image.projectTitle, CONTENT - chipW - 12, 2) : [];
    const projectY = Math.max(751, listEnd + projectGap);
    const bottom = image.projectTitle ? projectY + Math.max(43, projectLines.length * fit.titleLead) : listEnd;
    if (bottom <= 850) break;
  }

  let y = listTop - 39;
  ctx.fillStyle = COLOR.secondary;
  ctx.font = FONT.label(16);
  spaced(ctx, 'O QUE EU LEVO DAQUI', MARGIN, y, 3);
  y = listTop;
  ctx.font = FONT.sans(fit.size);
  for (const lines of highlightLines) {
    ctx.fillStyle = COLOR.accent;
    ctx.fillRect(MARGIN, y + Math.round(fit.lead / 3), 12, 12);
    ctx.fillStyle = COLOR.primary;
    lines.forEach((line, i) => ctx.fillText(line, MARGIN + 28, y + 4 + i * fit.lead));
    y += lines.length * fit.lead + 12;
  }

  // Projeto entregue (some em semana sem projeto).
  if (image.projectTitle) {
    const projectY = Math.max(751, y + projectGap);
    chip(ctx, 'PROJETO ENTREGUE', MARGIN, projectY, COLOR.project);
    ctx.fillStyle = COLOR.primary;
    ctx.font = FONT.sans(fit.title, 600);
    projectLines.forEach((line, i) => ctx.fillText(line, MARGIN + chipW + 12, projectY + 4 + i * fit.titleLead));
  }

  // Rodape: divisoria, aluno e data, a Focada comemorando.
  ctx.fillStyle = COLOR.stroke;
  ctx.fillRect(MARGIN, 874, CONTENT, 2);
  ctx.fillStyle = COLOR.primary;
  ctx.font = FONT.sans(30, 700);
  ctx.fillText(imageStudentName(studentName), MARGIN, 955);
  ctx.fillStyle = COLOR.secondary;
  ctx.font = FONT.label(16);
  spaced(ctx, formatImageDate(date).toUpperCase(), MARGIN, 1001, 3);

  const falaX = MARGIN + 599;
  ctx.strokeStyle = COLOR.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(falaX + 1, 969, 219, 50);
  ctx.fillStyle = COLOR.accent;
  ctx.font = FONT.pixel(32);
  ctx.fillText('Semana fechada!', falaX + 14, 978);
  ctx.drawImage(focada, falaX + 233, 892, 128, 128);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Nao foi possivel gerar a imagem.'))), 'image/png');
  });
}
