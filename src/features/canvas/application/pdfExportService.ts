import { jsPDF } from 'jspdf';
import type { ExportFrame } from './exportTypes';
import { formatTimestamp } from './exportTypes';
import { loadImage } from './exportUtils';

export interface PdfExportOptions {
  title: string;
  author?: string;
  fps?: number;
  pageSize?: 'a4' | 'letter';
  layout?: '2x2' | '1x1' | '3x3';
  includeTimestamp?: boolean;
  includeNote?: boolean;
  noteMaxLines?: number;
}

const PAGE_SIZES = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
};

const LAYOUTS = {
  '2x2': { cols: 2, rows: 2, framesPerPage: 4 },
  '1x1': { cols: 1, rows: 1, framesPerPage: 1 },
  '3x3': { cols: 3, rows: 3, framesPerPage: 9 },
};

export async function exportToPdfWithJsPDF(
  frames: ExportFrame[],
  filename: string,
  options: PdfExportOptions
): Promise<void> {
  const {
    title,
    author = 'Storyboard Copilot',
    fps = 24,
    pageSize = 'a4',
    layout = '2x2',
    includeTimestamp = true,
    includeNote = true,
    noteMaxLines = 3,
  } = options;

  const pageDimensions = PAGE_SIZES[pageSize];
  const layoutConfig = LAYOUTS[layout];

  const margin = 15;
  const headerHeight = 20;
  const footerHeight = 15;
  const gap = 8;

  const contentWidth = pageDimensions.width - margin * 2;
  const contentHeight = pageDimensions.height - margin * 2 - headerHeight - footerHeight;

  const frameWidth = (contentWidth - gap * (layoutConfig.cols - 1)) / layoutConfig.cols;
  const frameHeight = (contentHeight - gap * (layoutConfig.rows - 1)) / layoutConfig.rows;

  const totalPages = Math.ceil(frames.length / layoutConfig.framesPerPage);

  const pdf = new jsPDF({
    orientation: frameWidth > frameHeight ? 'landscape' : 'portrait',
    unit: 'mm',
    format: pageSize === 'a4' ? 'a4' : 'letter',
  });

  pdf.setProperties({
    title,
    author,
    subject: 'Storyboard Export',
    creator: 'Storyboard Copilot',
  });

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    pdf.setFillColor(250, 250, 250);
    pdf.rect(0, 0, pageDimensions.width, pageDimensions.height, 'F');

    pdf.setFontSize(14);
    pdf.setTextColor(30, 30, 30);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, margin + 8);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    pdf.text(
      `${pageIndex + 1} / ${totalPages}`,
      pageDimensions.width - margin,
      margin + 8,
      { align: 'right' }
    );

    const pageFrames = frames.slice(
      pageIndex * layoutConfig.framesPerPage,
      (pageIndex + 1) * layoutConfig.framesPerPage
    );

    for (let i = 0; i < pageFrames.length; i++) {
      const frame = pageFrames[i];
      const col = i % layoutConfig.cols;
      const row = Math.floor(i / layoutConfig.cols);

      const x = margin + col * (frameWidth + gap);
      const y = margin + headerHeight + row * (frameHeight + gap);
      const frameIndex = pageIndex * layoutConfig.framesPerPage + i;

      pdf.setFillColor(40, 40, 40);
      pdf.rect(x, y, frameWidth, frameHeight, 'F');

      if (frame.imageUrl) {
        try {
          const img = await loadImage(frame.imageUrl);
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

      const labelY = y + 6;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      const labelText = `Frame ${frameIndex + 1}`;
      pdf.text(labelText, x + 4, labelY);

      if (includeTimestamp && frame.timestamp) {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(200, 200, 200);
        const timestampText = formatTimestamp(frame.index, fps);
        pdf.text(timestampText, x + frameWidth - 4, labelY, { align: 'right' });
      }

      if (includeNote && frame.note) {
        const noteY = y + frameHeight - 4;
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(220, 220, 220);

        const noteLines = wrapText(frame.note, Math.floor(frameWidth / 2.5), noteMaxLines);
        noteLines.forEach((line, idx) => {
          pdf.text(line, x + 4, noteY - idx * 3.5, {
            maxWidth: frameWidth - 8,
          });
        });
      }
    }

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(180, 180, 180);
    pdf.text(
      `Generated by Storyboard Copilot`,
      pageDimensions.width / 2,
      pageDimensions.height - 8,
      { align: 'center' }
    );
  }

  pdf.save(`${filename}.pdf`);
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

export async function exportStoryboardGridToPdf(
  frames: ExportFrame[],
  filename: string,
  options: {
    title?: string;
    cols?: number;
    rows?: number;
    includeNotes?: boolean;
  } = {}
): Promise<void> {
  const { title = 'Storyboard', cols = 2, rows = 2, includeNotes = true } = options;

  const framesPerPage = cols * rows;
  const totalPages = Math.ceil(frames.length / framesPerPage);

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  pdf.setProperties({ title, author: 'Storyboard Copilot' });

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    if (pageIndex > 0) pdf.addPage();

    pdf.setFillColor(26, 26, 26);
    pdf.rect(0, 0, 297, 210, 'F');

    pdf.setFontSize(16);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, 15, 15);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Page ${pageIndex + 1} of ${totalPages}`, 282, 15, { align: 'right' });

    const margin = 15;
    const headerY = 25;
    const footerY = 200;
    const gap = 5;

    const usableWidth = 297 - margin * 2;
    const usableHeight = footerY - headerY;

    const cellWidth = (usableWidth - gap * (cols - 1)) / cols;
    const cellHeight = (usableHeight - gap * (rows - 1)) / rows;

    const pageFrames = frames.slice(
      pageIndex * framesPerPage,
      (pageIndex + 1) * framesPerPage
    );

    for (let i = 0; i < pageFrames.length; i++) {
      const frame = pageFrames[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = margin + col * (cellWidth + gap);
      const y = headerY + row * (cellHeight + gap);

      pdf.setFillColor(45, 45, 45);
      pdf.rect(x, y, cellWidth, cellHeight, 'F');

      if (frame.imageUrl) {
        try {
          const img = await loadImage(frame.imageUrl);
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const imgRatio = img.height / img.width;
            const cellRatio = cellHeight / cellWidth;

            let dw: number;
            let dh: number;
            let dx: number;
            let dy: number;

            if (imgRatio > cellRatio) {
              dh = cellHeight;
              dw = cellHeight / imgRatio;
              dx = x + (cellWidth - dw) / 2;
              dy = y;
            } else {
              dw = cellWidth;
              dh = cellWidth * imgRatio;
              dx = x;
              dy = y + (cellHeight - dh) / 2;
            }

            pdf.addImage(imgData, 'JPEG', dx, dy, dw, dh);
          }
        } catch {
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text('No preview', x + cellWidth / 2, y + cellHeight / 2, {
            align: 'center',
            baseline: 'middle',
          });
        }
      }

      pdf.setFontSize(8);
      pdf.setTextColor(200, 200, 200);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`#${pageIndex * framesPerPage + i + 1}`, x + 3, y + cellHeight - 3);

      if (includeNotes && frame.note) {
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(180, 180, 180);
        const noteLines = wrapText(frame.note, Math.floor(cellWidth / 1.8), 2);
        noteLines.forEach((line, idx) => {
          pdf.text(line, x + 3, y + cellHeight - 8 - idx * 3);
        });
      }
    }
  }

  pdf.save(`${filename}.pdf`);
}
