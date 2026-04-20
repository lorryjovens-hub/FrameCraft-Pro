import type { ImageModelDefinition } from '../../types';
import { createGrsaiPointsPricing } from '@/features/canvas/pricing';

export const GRSAI_NANO_BANANA_2_MODEL_ID = 'grsai/nano-banana-2';

const NANO_BANANA_ASPECT_RATIOS = [
  '1:1',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '3:2',
  '2:3',
  '5:4',
  '4:5',
  '21:9',
] as const;

export const imageModel: ImageModelDefinition = {
  id: GRSAI_NANO_BANANA_2_MODEL_ID,
  mediaType: 'image',
  displayName: 'Nano Banana 2',
  providerId: 'grsai',
  description: 'Nano Banana 2 图像生成与编辑',
  eta: '1min',
  expectedDurationMs: 60000,
  defaultAspectRatio: '1:1',
  defaultResolution: '1K',
  aspectRatios: NANO_BANANA_ASPECT_RATIOS.map((value) => ({ value, label: value })),
  resolutions: [
    { value: '1K', label: '1K' },
    { value: '2K', label: '2K' },
    { value: '4K', label: '4K' },
  ],
  pricing: createGrsaiPointsPricing(() => 1300),
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: GRSAI_NANO_BANANA_2_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '编辑模式' : '生成模式',
  }),
};
