import { describe, it, expect } from 'vitest';
import {
  CANVAS_NODE_TYPES,
  isUploadNode,
  isImageEditNode,
  isVideoGenNode,
  nodeHasImage,
} from '@/features/canvas/domain/canvasNodes';
import type { CanvasNode } from '@/features/canvas/domain/canvasNodes';

describe('CANVAS_NODE_TYPES', () => {
  it('should define all expected node types', () => {
    expect(CANVAS_NODE_TYPES.upload).toBe('uploadNode');
    expect(CANVAS_NODE_TYPES.imageEdit).toBe('imageNode');
    expect(CANVAS_NODE_TYPES.exportImage).toBe('exportImageNode');
    expect(CANVAS_NODE_TYPES.textAnnotation).toBe('textAnnotationNode');
    expect(CANVAS_NODE_TYPES.group).toBe('groupNode');
    expect(CANVAS_NODE_TYPES.storyboardSplit).toBe('storyboardNode');
    expect(CANVAS_NODE_TYPES.storyboardGen).toBe('storyboardGenNode');
    expect(CANVAS_NODE_TYPES.videoGen).toBe('videoGenNode');
    expect(CANVAS_NODE_TYPES.exportVideo).toBe('exportVideoNode');
  });
});

describe('node type guards', () => {
  const createMockNode = (type: string, data: Record<string, unknown> = {}): CanvasNode => ({
    id: 'test-node-1',
    type: type as CanvasNode['type'],
    position: { x: 0, y: 0 },
    data: data as CanvasNode['data'],
  });

  describe('isUploadNode', () => {
    it('should return true for upload nodes', () => {
      const node = createMockNode('uploadNode');
      expect(isUploadNode(node)).toBe(true);
    });

    it('should return false for non-upload nodes', () => {
      const node = createMockNode('imageNode');
      expect(isUploadNode(node)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isUploadNode(null)).toBe(false);
      expect(isUploadNode(undefined)).toBe(false);
    });
  });

  describe('isImageEditNode', () => {
    it('should return true for image edit nodes', () => {
      const node = createMockNode('imageNode');
      expect(isImageEditNode(node)).toBe(true);
    });

    it('should return false for other nodes', () => {
      const node = createMockNode('uploadNode');
      expect(isImageEditNode(node)).toBe(false);
    });
  });

  describe('isVideoGenNode', () => {
    it('should return true for video generation nodes', () => {
      const node = createMockNode('videoGenNode');
      expect(isVideoGenNode(node)).toBe(true);
    });

    it('should return false for other nodes', () => {
      const node = createMockNode('imageNode');
      expect(isVideoGenNode(node)).toBe(false);
    });
  });
});

describe('nodeHasImage', () => {
  const createMockNode = (type: string, data: Record<string, unknown> = {}): CanvasNode => ({
    id: 'test-node-1',
    type: type as CanvasNode['type'],
    position: { x: 0, y: 0 },
    data: data as CanvasNode['data'],
  });

  it('should return false for null/undefined', () => {
    expect(nodeHasImage(null)).toBe(false);
    expect(nodeHasImage(undefined)).toBe(false);
  });

  it('should return true when upload node has imageUrl', () => {
    const node = createMockNode('uploadNode', { imageUrl: 'https://example.com/image.png' });
    expect(nodeHasImage(node)).toBe(true);
  });

  it('should return false when upload node has no imageUrl', () => {
    const node = createMockNode('uploadNode', { imageUrl: null });
    expect(nodeHasImage(node)).toBe(false);
  });

  it('should return true when image edit node has imageUrl', () => {
    const node = createMockNode('imageNode', { imageUrl: 'data:image/png;base64,abc' });
    expect(nodeHasImage(node)).toBe(true);
  });

  it('should return true when storyboard split node has frames with images', () => {
    const node = createMockNode('storyboardNode', {
      frames: [
        { id: 'f1', imageUrl: 'https://example.com/1.png', note: '', order: 0 },
        { id: 'f2', imageUrl: null, note: '', order: 1 },
      ],
    });
    expect(nodeHasImage(node)).toBe(true);
  });

  it('should return false when storyboard split node has no frames with images', () => {
    const node = createMockNode('storyboardNode', {
      frames: [
        { id: 'f1', imageUrl: null, note: '', order: 0 },
        { id: 'f2', imageUrl: null, note: '', order: 1 },
      ],
    });
    expect(nodeHasImage(node)).toBe(false);
  });
});
