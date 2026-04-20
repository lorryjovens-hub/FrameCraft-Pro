import type { CanvasNode } from '@/stores/canvasStore';
import type { StoryboardFrameItem } from '../domain/canvasNodes';

export type ExportFormat = 'pdf' | 'pptx' | 'frames' | 'png' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  frameDelay?: number;
  filename?: string;
}

export interface ExportFrame {
  index: number;
  imageUrl: string | null;
  note: string;
  aspectRatio: string;
  timestamp?: string;
}

export interface ExportProject {
  name: string;
  exportedAt: Date;
  frames: ExportFrame[];
  metadata: {
    totalFrames: number;
    rows?: number;
    cols?: number;
    format: ExportFormat;
  };
}

export interface PptxSlide {
  title: string;
  imageUrl: string | null;
  note: string;
  timestamp?: string;
}

export function extractFramesFromNodes(nodes: CanvasNode[]): ExportFrame[] {
  const frames: ExportFrame[] = [];

  const sortedNodes = [...nodes].sort((a, b) => {
    const posA = a.position.y * 1000 + a.position.x;
    const posB = b.position.y * 1000 + b.position.x;
    return posA - posB;
  });

  for (const node of sortedNodes) {
    const data = node.data as Record<string, unknown>;

    if (node.type === 'storyboardNode' && Array.isArray(data.frames)) {
      for (const frame of data.frames as StoryboardFrameItem[]) {
        frames.push({
          index: frames.length,
          imageUrl: frame.imageUrl,
          note: frame.note || '',
          aspectRatio: frame.aspectRatio || '16:9',
        });
      }
    } else if (node.type === 'imageNode' && data.imageUrl) {
      frames.push({
        index: frames.length,
        imageUrl: data.imageUrl as string,
        note: (data.prompt as string) || '',
        aspectRatio: (data.aspectRatio as string) || '16:9',
      });
    }
  }

  return frames;
}

export function formatTimestamp(frameIndex: number, fps: number = 24): string {
  const totalSeconds = frameIndex / fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = frameIndex % fps;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}