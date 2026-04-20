import type { ImageModelDefinition, ResolutionOption } from '../../types';
import { createGrsaiPointsPricing } from '@/features/canvas/pricing';

export const GRSAI_NANO_BANANA_PRO_MODEL_ID = 'grsai/nano-banana-pro';
const DEFAULT_GRSAI_PRO_VARIANT = 'nano-banana-pro';

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

const ALL_RESOLUTION_OPTIONS: ResolutionOption[] = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];
const VIP_RESOLUTION_OPTIONS = ALL_RESOLUTION_OPTIONS.filter((item) => item.value !== '4K');
const VIP_4K_RESOLUTION_OPTIONS = ALL_RESOLUTION_OPTIONS.filter((item) => item.value === '4K');

const GRSAI_PRO_POINTS_BY_MODEL: Record<string, number> = {
  'nano-banana-pro': 1800,
  'nano-banana-pro-vt': 1800,
  'nano-banana-pro-cl': 3400,
  'nano-banana-pro-vip': 7000,
  'nano-banana-pro-4k-vip': 8600,
};

export function resolveGrsaiNanoBananaProVariant(
  extraParams?: Record<string, unknown>
): string {
  const variant = typeof extraParams?.grsai_pro_model === 'string'
    ? extraParams.grsai_pro_model.trim().toLowerCase()
    : DEFAULT_GRSAI_PRO_VARIANT;

  return GRSAI_PRO_POINTS_BY_MODEL[variant] ? variant : DEFAULT_GRSAI_PRO_VARIANT;
}

function resolveGrsaiNanoBananaProResolutions(
  extraParams?: Record<string, unknown>
): ResolutionOption[] {
  const variant = resolveGrsaiNanoBananaProVariant(extraParams);
  if (variant === 'nano-banana-pro-vip') {
    return VIP_RESOLUTION_OPTIONS;
  }

  if (variant === 'nano-banana-pro-4k-vip') {
    return VIP_4K_RESOLUTION_OPTIONS;
  }

  return ALL_RESOLUTION_OPTIONS;
}

export const imageModel: ImageModelDefinition = {
  id: GRSAI_NANO_BANANA_PRO_MODEL_ID,
  mediaType: 'image',
  displayName: 'Nano Banana Pro',
  providerId: 'grsai',
  description: 'Nano Banana Pro 图像生成与编辑',
  eta: '1min',
  expectedDurationMs: 60000,
  defaultAspectRatio: '1:1',
  defaultResolution: '1K',
  aspectRatios: NANO_BANANA_ASPECT_RATIOS.map((value) => ({ value, label: value })),
  resolutions: ALL_RESOLUTION_OPTIONS,
  resolveResolutions: ({ extraParams }) => resolveGrsaiNanoBananaProResolutions(extraParams),
  pricing: createGrsaiPointsPricing(({ extraParams }) => {
    const variant = resolveGrsaiNanoBananaProVariant(extraParams);
    return GRSAI_PRO_POINTS_BY_MODEL[variant] ?? GRSAI_PRO_POINTS_BY_MODEL[DEFAULT_GRSAI_PRO_VARIANT];
  }),
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: GRSAI_NANO_BANANA_PRO_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '编辑模式' : '生成模式',
  }),
};
