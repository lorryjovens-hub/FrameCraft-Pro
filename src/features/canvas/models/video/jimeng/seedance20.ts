import type { VideoModelDefinition } from '../../types';
import type { AspectRatioOption } from '../../types';

export const JIMENG_SEEDANCE_20_MODEL_ID = 'jimeng/seedance-2.0';

const JIMENG_SEEDANCE_20_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '21:9', label: '21:9' },
];

const JIMENG_SEEDANCE_20_DURATIONS = [
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
  { value: '15', label: '15秒' },
];

export const videoModel: VideoModelDefinition = {
  id: JIMENG_SEEDANCE_20_MODEL_ID,
  mediaType: 'video',
  displayName: '即梦 Seedance 2.0',
  providerId: 'jimeng',
  description: '即梦 · Seedance 2.0 多模态智能视频生成 - 支持图片/视频/音频混合输入，物理引擎渲染',
  eta: '3-6min',
  expectedDurationMs: 300000,
  defaultAspectRatio: '16:9',
  defaultDuration: '10',
  aspectRatios: JIMENG_SEEDANCE_20_ASPECT_RATIOS,
  durations: JIMENG_SEEDANCE_20_DURATIONS,
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: JIMENG_SEEDANCE_20_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
};