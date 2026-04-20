import type { VideoModelDefinition } from '../../types';
import type { AspectRatioOption } from '../../types';

export const SEEDANCE_20_MODEL_ID = 'seedance/seedance-2.0';

const SEEDANCE_20_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '21:9', label: '21:9' },
];

const SEEDANCE_20_DURATIONS = [
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
  { value: '15', label: '15秒' },
  { value: '20', label: '20秒' },
];

export const videoModel: VideoModelDefinition = {
  id: SEEDANCE_20_MODEL_ID,
  mediaType: 'video',
  displayName: 'Seedance 2.0',
  providerId: 'seedance',
  description: 'Seedance 2.0 视频生成模型 - 专业创作',
  eta: '3-5min',
  expectedDurationMs: 240000,
  defaultAspectRatio: '16:9',
  defaultDuration: '15',
  aspectRatios: SEEDANCE_20_ASPECT_RATIOS,
  durations: SEEDANCE_20_DURATIONS,
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: SEEDANCE_20_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
};
