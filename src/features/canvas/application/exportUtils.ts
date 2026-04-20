import { jsPDF } from 'jspdf';
import type { ExportFrame } from './exportTypes';
import { formatTimestamp } from './exportTypes';

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function canvasToDataURL(canvas: HTMLCanvasElement, format: 'png' | 'jpeg' = 'png', quality: number = 0.9): Promise<string> {
  return canvas.toDataURL(`image/${format}`, quality);
}

export async function renderFrameToCanvas(frame: ExportFrame, width: number = 1920): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const ratioParts = frame.aspectRatio.split(':');
  const w = Number(ratioParts[0]) || 16;
  const h = Number(ratioParts[1]) || 9;
  const aspectRatio = h / w;
  canvas.width = width;
  canvas.height = width * aspectRatio;

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (frame.imageUrl) {
    try {
      const img = await loadImage(frame.imageUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } catch {
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#666';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Image not available', canvas.width / 2, canvas.height / 2);
    }
  }

  return canvas;
}

export async function exportToPdf(
  frames: ExportFrame[],
  name: string,
  options: { fps?: number } = {}
): Promise<void> {
  const { fps = 24 } = options;

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 15;
  const headerHeight = 20;
  const footerHeight = 12;
  const gap = 8;

  const cols = 2;
  const rows = 2;
  const framesPerPage = cols * rows;
  const totalPages = Math.ceil(frames.length / framesPerPage);

  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2 - headerHeight - footerHeight;

  const frameWidth = (contentWidth - gap * (cols - 1)) / cols;
  const frameHeight = (contentHeight - gap * (rows - 1)) / rows;

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  pdf.setProperties({
    title: name,
    author: 'Storyboard Copilot',
    subject: 'Storyboard Export',
    creator: 'Storyboard Copilot',
  });

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    pdf.setFillColor(250, 250, 250);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    pdf.setFontSize(14);
    pdf.setTextColor(30, 30, 30);
    pdf.setFont('helvetica', 'bold');
    pdf.text(name, margin, margin + 8);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    pdf.text(
      `${pageIndex + 1} / ${totalPages}`,
      pageWidth - margin,
      margin + 8,
      { align: 'right' }
    );

    const pageFrames = frames.slice(
      pageIndex * framesPerPage,
      (pageIndex + 1) * framesPerPage
    );

    for (let i = 0; i < pageFrames.length; i++) {
      const frame = pageFrames[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = margin + col * (frameWidth + gap);
      const y = margin + headerHeight + row * (frameHeight + gap);
      const frameIndex = pageIndex * framesPerPage + i;

      pdf.setFillColor(40, 40, 40);
      pdf.rect(x, y, frameWidth, frameHeight, 'F');

      if (frame.imageUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = frame.imageUrl!;
          });

          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = canvas.toDataURL('image/jpeg', 0.85);

            const imgAspectRatio = img.height / img.width;
            const frameAspectRatio = frameHeight / frameWidth;

            let drawWidth: number;
            let drawHeight: number;
            let drawX: number;
            let drawY: number;

            if (imgAspectRatio > frameAspectRatio) {
              drawHeight = frameHeight;
              drawWidth = frameHeight / imgAspectRatio;
              drawX = x + (frameWidth - drawWidth) / 2;
              drawY = y;
            } else {
              drawWidth = frameWidth;
              drawHeight = frameWidth * imgAspectRatio;
              drawX = x;
              drawY = y + (frameHeight - drawHeight) / 2;
            }

            pdf.addImage(imgData, 'JPEG', drawX, drawY, drawWidth, drawHeight);
          }
        } catch {
          pdf.setFillColor(60, 60, 60);
          pdf.rect(x, y, frameWidth, frameHeight, 'F');
          pdf.setFontSize(10);
          pdf.setTextColor(150, 150, 150);
          pdf.setFont('helvetica', 'normal');
          pdf.text('Image unavailable', x + frameWidth / 2, y + frameHeight / 2, {
            align: 'center',
            baseline: 'middle',
          });
        }
      }

      const labelY = y + 5;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      const labelText = `#${frameIndex + 1}`;
      pdf.text(labelText, x + 3, labelY);

      const timestamp = formatTimestamp(frame.index, fps);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(200, 200, 200);
      pdf.text(timestamp, x + frameWidth - 3, labelY, { align: 'right' });

      if (frame.note) {
        const noteY = y + frameHeight - 3;
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(220, 220, 220);
        const noteLines = wrapText(frame.note, Math.floor(frameWidth / 2), 2);
        noteLines.forEach((line, idx) => {
          pdf.text(line, x + 3, noteY - idx * 3, { maxWidth: frameWidth - 6 });
        });
      }
    }

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(180, 180, 180);
    pdf.text(
      'Generated by Storyboard Copilot',
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  pdf.save(`${name || 'storyboard'}.pdf`);
}

function wrapText(text: string, maxCharsPerLine: number, maxLines?: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      if (maxLines && lines.length >= maxLines) break;
    }
  }

  if (currentLine && (!maxLines || lines.length < maxLines)) {
    lines.push(currentLine);
  }

  return lines;
}

export async function exportToFrames(
  frames: ExportFrame[],
  _name: string,
  options: { fps?: number; prefix?: string } = {}
): Promise<void> {
  const { fps = 24, prefix = 'frame' } = options;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frame.imageUrl) continue;

    try {
      const canvas = await renderFrameToCanvas(frame, 1920);
      const timestamp = formatTimestamp(i, fps);
      const filename = `${prefix}_${String(i + 1).padStart(4, '0')}_${timestamp}.png`;

      const data = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = data;
      link.download = filename;
      link.click();

      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (e) {
      console.warn('Failed to export frame:', i, e);
    }
  }
}

export async function exportToPng(
  frames: ExportFrame[],
  name: string,
  options: { scale?: number } = {}
): Promise<void> {
  const { scale = 2 } = options;

  if (frames.length === 0) return;

  const frame = frames[0];
  if (!frame.imageUrl) return;

  try {
    const canvas = await renderFrameToCanvas(frame, 1920 * scale);
    const data = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = data;
    link.download = `${name || 'frame'}.png`;
    link.click();
  } catch (e) {
    console.warn('Failed to export PNG:', e);
  }
}

export async function exportToJson(
  frames: ExportFrame[],
  name: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const exportData = {
    name,
    exportedAt: new Date().toISOString(),
    frames: frames.map((f, i) => ({
      index: i,
      note: f.note,
      aspectRatio: f.aspectRatio,
      timestamp: formatTimestamp(i),
    })),
    metadata,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name || 'storyboard'}.json`;
  link.click();
  URL.revokeObjectURL(url);
}