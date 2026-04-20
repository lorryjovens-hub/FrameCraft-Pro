import type { ImageModelDefinition } from '../../types';
import { createFixedResolutionPricing } from '@/features/canvas/pricing';

export const KIE_NANO_BANANA_2_MODEL_ID = 'kie/nano-banana-2';

const KIE_NANO_BANANA_2_ASPECT_RATIOS = [
  '1:1',
  '1:4',
  '1:8',
  '9:16',
  '16:9',
  '3:4',
  '4:3',
  '4:1',
  '8:1',
  '2:3',
  '3:2',
  '5:4',
  '4:5',
  '21:9',
] as const;

export const imageModel: ImageModelDefinition = {
  id: KIE_NANO_BANANA_2_MODEL_ID,
  mediaType: 'image',
  displayName: 'Nano Banana 2 (KIE)',
  providerId: 'kie',
  description: 'KIE · Nano Banana 2 图像生成与编辑',
  eta: '1min',
  expectedDurationMs: 60000,
  defaultAspectRatio: '1:1',
  defaultResolution: '1K',
  aspectRatios: KIE_NANO_BANANA_2_ASPECT_RATIOS.map((value) => ({ value, label: value })),
  resolutions: [
    { value: '1K', label: '1K' },
    { value: '2K', label: '2K' },
    { value: '4K', label: '4K' },
  ],
  pricing: createFixedResolutionPricing({
    currency: 'USD',
    standardRates: {
      '1K': 0.04,
      '2K': 0.06,
      '4K': 0.09,
    },
    discountedRates: {
      '1K': 0.025,
      '2K': 0.04,
      '4K': 0.06,
    },
  }),
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: KIE_NANO_BANANA_2_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '编辑模式' : '生成模式',
  }),
};
