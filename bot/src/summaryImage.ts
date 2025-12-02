import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { Task } from '@cimenta/dtos';

type Cat = 'pintura' | 'construccion' | 'electricidad';
type Status = 'changes' | 'pending' | 'in_progress' | 'completed' | 'blocked';

const CAT_ORDER: Cat[] = ['electricidad', 'construccion', 'pintura'];
const STATUS_COLOR: Record<Status, string> = {
  completed: '#10B981',
  pending: '#EAB308',
  blocked: '#EF4444',
  in_progress: '#3B82F6',
  changes: '#8B5CF6'
};

function wrap(ctx: any, text: string, maxWidth: number, font: string) {
  ctx.font = font;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxWidth) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = t;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderSummaryPNG(params: {
  siteLabel: string;
  startLabel: string;
  endLabel: string;
  tasks: Task[];
}): Promise<Buffer> {
  // Fuentes opcionales (si las tenés en assets/fonts)
  try {
    GlobalFonts.registerFromPath('assets/fonts/Nunito-Regular.ttf', 'Nunito');
    GlobalFonts.registerFromPath('assets/fonts/Nunito-Bold.ttf', 'NunitoBold');
  } catch {}

  const W = 1080, H = 1500, M = 40;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d') as any;

  // Fondo
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0,0,W,H);

  // Header
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0,0,W,180);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 64px NunitoBold, sans-serif';
  ctx.fillText('RESUMEN DE TAREAS', M, 85);
  ctx.font = '28px Nunito, sans-serif';
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText(`${params.siteLabel}  •  ${params.startLabel} → ${params.endLabel}`, M, 135);

  // Card
  const cardX = M, cardY = 200, cardW = W - 2*M, cardH = H - (cardY + M);
  ctx.fillStyle = '#FFFFFF';
  (ctx as any).roundRect(cardX, cardY, cardW, cardH, 24);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  (ctx as any).roundRect(cardX, cardY, cardW, cardH, 24);
  ctx.stroke();

  // KPIs
  const total = params.tasks.length;
  const byStatus = {
    completed: params.tasks.filter(t => t.status === 'completed').length,
    in_progress: params.tasks.filter(t => t.status === 'in_progress').length,
    pending: params.tasks.filter(t => t.status === 'pending').length,
    blocked: params.tasks.filter(t => t.status === 'blocked').length,
    changes: params.tasks.filter(t => t.status === 'changes').length
  };

  const kpiY = cardY + 30, kpiX = cardX + 28, kpiGap = 220, kpiW = 200, kpiH = 96;
  const kpis: Array<[string, number, string]> = [
    ['Total', total, '#0F172A'],
    ['Completadas', byStatus.completed, STATUS_COLOR.completed],
    ['En curso', byStatus.in_progress, STATUS_COLOR.in_progress],
    ['Pendientes', byStatus.pending, STATUS_COLOR.pending],
    ['Bloqueadas', byStatus.blocked, STATUS_COLOR.blocked],
  ];
  ctx.font = '26px Nunito, sans-serif';
  kpis.forEach(([label, value, color], i) => {
    const x = kpiX + i*(kpiW + 20);
    // card
    ctx.fillStyle = '#FFFFFF';
    (ctx as any).roundRect(x, kpiY, kpiW, kpiH, 16);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    (ctx as any).roundRect(x, kpiY, kpiW, kpiH, 16);
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.font = '22px Nunito, sans-serif';
    ctx.fillText(label, x+16, kpiY+32);

    ctx.fillStyle = color;
    ctx.font = 'bold 44px NunitoBold, sans-serif';
    ctx.fillText(String(value), x+16, kpiY+76);
  });

  // Barras por categoría
  const cats: Cat[] = CAT_ORDER;
  const counts: Record<Cat, number> = {
    electricidad: params.tasks.filter(t => t.category === 'electricidad').length,
    construccion: params.tasks.filter(t => t.category === 'construccion').length,
    pintura:      params.tasks.filter(t => t.category === 'pintura').length
  };
  const maxCat = Math.max(1, ...Object.values(counts));
  let y = kpiY + kpiH + 60;
  const barX = cardX + 28, barW = cardW - 56, barH = 22, gap = 46;
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 28px NunitoBold, sans-serif';
  ctx.fillText('Tareas por categoría', barX, y);
  y += 26;

  cats.forEach((c, i) => {
    const ratio = counts[c] / maxCat;
    const rowY = y + i*gap + 30;
    // track
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(barX, rowY, barW, barH);
    // fill
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(barX, rowY, Math.round(barW * ratio), barH);
    // label
    ctx.fillStyle = '#475569';
    ctx.font = '22px Nunito, sans-serif';
    ctx.fillText(`${c[0].toUpperCase()}${c.slice(1)} (${counts[c]})`, barX, rowY - 10);
  });

  // Pie chart
  const pieCx = cardX + 240, pieCy = y + cats.length*gap + 140, pieR = 120;
  const totalForPie = Math.max(1, cats.reduce((acc,c)=>acc+counts[c], 0));
  let startDeg = 0;
  const CAT_COLOR: Record<Cat, string> = {
    electricidad: '#3B82F6',
    construccion: '#EAB308',
    pintura: '#EF4444'
  };
  cats.forEach((c) => {
    const v = counts[c];
    const angle = (v/totalForPie)*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(pieCx, pieCy);
    ctx.arc(pieCx, pieCy, pieR, startDeg, startDeg + angle);
    ctx.closePath();
    ctx.fillStyle = CAT_COLOR[c];
    ctx.fill();
    startDeg += angle;
  });
  // leyenda
  let lx = pieCx + pieR + 40, ly = pieCy - 60;
  ctx.font = '22px Nunito, sans-serif';
  Object.entries(CAT_COLOR).forEach(([c, col]) => {
    ctx.fillStyle = col;
    ctx.fillRect(lx, ly, 20, 20);
    ctx.fillStyle = '#0F172A';
    ctx.fillText(`${c[0].toUpperCase()}${c.slice(1)} (${counts[c as Cat]})`, lx + 28, ly + 18);
    ly += 28;
  });

  // Lista de tareas (primeras 8)
  let listTop = pieCy + pieR + 90;
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 28px NunitoBold, sans-serif';
  ctx.fillText('Tareas', barX, listTop);
  listTop += 12;

  const listWidth = cardW - 56;
  let cursorY = listTop + 22;
  const maxItems = 8;
  const items = params.tasks.slice(0, maxItems);

  items.forEach((t) => {
    cursorY += 48;
    // bullet
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(barX + 8, cursorY - 16, 6, 0, Math.PI*2);
    ctx.fill();

    // título + chip
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 24px NunitoBold, sans-serif';
    const titleLines = wrap(ctx, t.title || t.id, listWidth, 'bold 24px NunitoBold, sans-serif');
    ctx.fillText(titleLines[0], barX + 24, cursorY - 18);

    const st = (t.status || 'pending') as Status;
    const chip = st.replace('_',' ');
    const chipW = Math.ceil(ctx.measureText(chip).width) + 18;
    ctx.fillStyle = STATUS_COLOR[st] || '#64748B';
    (ctx as any).roundRect(barX + 24, cursorY - 8, chipW, 26, 8);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '18px Nunito, sans-serif';
    ctx.fillText(chip, barX + 24 + 9, cursorY + 10);

    // subtítulo
    ctx.fillStyle = '#475569';
    ctx.font = '20px Nunito, sans-serif';
    const sub = `[${t.category}] ${t.description || ''}`.trim();
    const subLines = wrap(ctx, sub, listWidth, '20px Nunito, sans-serif');
    subLines.slice(0,2).forEach((ln, i) => {
      ctx.fillText(ln, barX + 24, cursorY + 30 + i*22);
    });
    cursorY += 20;
  });

  // footer
  ctx.fillStyle = '#94A3B8';
  ctx.font = '18px Nunito, sans-serif';
  ctx.fillText('Cimenta • Bot', cardX + 28, cardY + cardH - 24);

  return canvas.toBuffer('image/png');
}
