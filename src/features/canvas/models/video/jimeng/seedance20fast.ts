import type { VideoModelDefinition } from '../../types';
import type { AspectRatioOption } from '../../types';

export const JIMENG_SEEDANCE_20_FAST_MODEL_ID = 'jimeng/seedance-2.0-fast';

const JIMENG_SEEDANCE_20_FAST_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
];

const JIMENG_SEEDANCE_20_FAST_DURATIONS = [
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
];

export const videoModel: VideoModelDefinition = {
  id: JIMENG_SEEDANCE_20_FAST_MODEL_ID,
  mediaType: 'video',
  displayName: '即梦 Seedance 2.0 Fast',
  providerId: 'jimeng',
  description: '即梦 · Seedance 2.0 Fast 快速版 - 多模态智能视频生成，更快生成速度',
  eta: '1-3min',
  expectedDurationMs: 180000,
  defaultAspectRatio: '16:9',
  defaultDuration: '5',
  aspectRatios: JIMENG_SEEDANCE_20_FAST_ASPECT_RATIOS,
  durations: JIMENG_SEEDANCE_20_FAST_DURATIONS,
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: JIMENG_SEEDANCE_20_FAST_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
};