import {
  NODE_TOOL_TYPES,
  isExportImageNode,
  isImageEditNode,
  isUploadNode,
  type CanvasNode,
} from '../domain/canvasNodes';
import { stringifyAnnotationItems } from './annotation';
import type { CanvasToolPlugin } from './types';

function supportsImageSourceNode(node: CanvasNode): boolean {
  return isUploadNode(node) || isImageEditNode(node) || isExportImageNode(node);
}

export const cropToolPlugin: CanvasToolPlugin = {
  type: NODE_TOOL_TYPES.crop,
  label: '裁剪',
  icon: 'crop',
  editor: 'crop',
  supportsNode: (node) => supportsImageSourceNode(node) && Boolean(node.data.imageUrl),
  createInitialOptions: () => ({
    aspectRatio: 'free',
    customAspectRatio: '',
  }),
  fields: [
    {
      key: 'aspectRatio',
      label: '目标比例',
      type: 'select',
      options: [
        { label: '自由', value: 'free' },
        { label: '1:1', value: '1:1' },
        { label: '16:9', value: '16:9' },
        { label: '9:16', value: '9:16' },
        { label: '4:3', value: '4:3' },
        { label: '3:4', value: '3:4' },
      ],
    },
  ],
  execute: async (sourceImageUrl, options, context) =>
    await context.processTool(NODE_TOOL_TYPES.crop, sourceImageUrl, options),
};

export const annotateToolPlugin: CanvasToolPlugin = {
  type: NODE_TOOL_TYPES.annotate,
  label: '标注',
  icon: 'annotate',
  editor: 'annotate',
  supportsNode: (node) => supportsImageSourceNode(node) && Boolean(node.data.imageUrl),
  createInitialOptions: () => ({
    color: '#ff4d4f',
    lineWidthPercent: 0.4,
    fontSizePercent: 10,
    annotations: stringifyAnnotationItems([]),
  }),
  fields: [],
  execute: async (sourceImageUrl, options, context) =>
    await context.processTool(NODE_TOOL_TYPES.annotate, sourceImageUrl, options),
};

export const splitStoryboardToolPlugin: CanvasToolPlugin = {
  type: NODE_TOOL_TYPES.splitStoryboard,
  label: '切割',
  icon: 'split',
  editor: 'split',
  supportsNode: (node) => supportsImageSourceNode(node) && Boolean(node.data.imageUrl),
  createInitialOptions: () => ({
    rows: 3,
    cols: 3,
    lineThicknessPercent: 0.5,
  }),
  fields: [],
  execute: async (sourceImageUrl, options, context) =>
    await context.processTool(NODE_TOOL_TYPES.splitStoryboard, sourceImageUrl, options),
};

export const inpaintToolPlugin: CanvasToolPlugin = {
  type: NODE_TOOL_TYPES.inpaint,
  label: '局部重绘',
  icon: 'inpaint',
  editor: 'inpaint',
  supportsNode: (node) => supportsImageSourceNode(node) && Boolean(node.data.imageUrl),
  createInitialOptions: () => ({
    prompt: '',
    mask: '',
    aspectRatio: 'free',
    customAspectRatio: '',
  }),
  fields: [
    {
      key: 'prompt',
      label: '提示词',
      type: 'text',
      placeholder: '描述你想要的内容...',
    },
  ],
  execute: async (sourceImageUrl, options, context) =>
    await context.processTool(NODE_TOOL_TYPES.inpaint, sourceImageUrl, options),
};

export const brushInpaintToolPlugin: CanvasToolPlugin = {
  type: NODE_TOOL_TYPES.brushInpaint,
  label: '笔刷重绘',
  icon: 'brush',
  editor: 'brush',
  supportsNode: (node) => supportsImageSourceNode(node) && Boolean(node.data.imageUrl),
  createInitialOptions: () => ({
    prompt: '',
    maskImage: '',
    maskWidth: 0,
    maskHeight: 0,
    brushSize: 30,
  }),
  fields: [
    {
      key: 'prompt',
      label: '提示词',
      type: 'text',
      placeholder: '描述你想要的内容...',
    },
  ],
  execute: async (sourceImageUrl, options, context) =>
    await context.processTool(NODE_TOOL_TYPES.brushInpaint, sourceImageUrl, options),
};

export const multiAngleRenderToolPlugin: CanvasToolPlugin = {
  type: NODE_TOOL_TYPES.multiAngleRender,
  label: '多角度渲染',
  icon: 'split',
  editor: 'multi-angle-render',
  supportsNode: (node) => supportsImageSourceNode(node) && Boolean(node.data.imageUrl),
  createInitialOptions: () => ({
    prompt: '干净背景，产品多角度',
    angleCount: 4,
  }),
  fields: [
    {
      key: 'prompt',
      label: '提示词',
      type: 'text',
      placeholder: '描述你想要的渲染效果...',
    },
    {
      key: 'angleCount',
      label: '角度数量',
      type: 'number',
      min: 2,
      max: 8,
      step: 1,
    },
  ],
  execute: async (sourceImageUrl, options, context) =>
    await context.processTool(NODE_TOOL_TYPES.multiAngleRender, sourceImageUrl, options),
};

export const productPhotographyToolPlugin: CanvasToolPlugin = {
  type: NODE_TOOL_TYPES.productPhotography,
  label: '产品摄影',
  icon: 'crop',
  editor: 'product-photography',
  supportsNode: (node) => supportsImageSourceNode(node) && Boolean(node.data.imageUrl),
  createInitialOptions: () => ({
    prompt: '高级质感，黑底开灯，产品开启',
    style: 'professional',
  }),
  fields: [
    {
      key: 'prompt',
      label: '提示词',
      type: 'text',
      placeholder: '描述你想要的摄影风格...',
    },
    {
      key: 'style',
      label: '风格',
      type: 'select',
      options: [
        { label: '专业质感', value: 'professional' },
        { label: '时尚潮流', value: 'fashion' },
        { label: '简约清新', value: 'minimalist' },
        { label: '科技感', value: 'tech' },
      ],
    },
  ],
  execute: async (sourceImageUrl, options, context) =>
    await context.processTool(NODE_TOOL_TYPES.productPhotography, sourceImageUrl, options),
};

export const lightingAdjustmentToolPlugin: CanvasToolPlugin = {
  type: NODE_TOOL_TYPES.lightingAdjustment,
  label: '打光调整',
  icon: 'brush',
  editor: 'lighting-adjustment',
  supportsNode: (node) => supportsImageSourceNode(node) && Boolean(node.data.imageUrl),
  createInitialOptions: () => ({
    lightAngle: 45,
    lightColor: '#ffffff',
    lightIntensity: 100,
  }),
  fields: [
    {
      key: 'lightAngle',
      label: '打光角度',
      type: 'number',
      min: 0,
      max: 360,
      step: 15,
    },
    {
      key: 'lightColor',
      label: '光照颜色',
      type: 'color',
    },
    {
      key: 'lightIntensity',
      label: '光照强度',
      type: 'number',
      min: 10,
      max: 200,
      step: 10,
    },
  ],
  execute: async (sourceImageUrl, options, context) =>
    await context.processTool(NODE_TOOL_TYPES.lightingAdjustment, sourceImageUrl, options),
};

export const builtInToolPlugins: CanvasToolPlugin[] = [
  cropToolPlugin,
  annotateToolPlugin,
  splitStoryboardToolPlugin,
  inpaintToolPlugin,
  brushInpaintToolPlugin,
  multiAngleRenderToolPlugin,
  productPhotographyToolPlugin,
  lightingAdjustmentToolPlugin,
];
