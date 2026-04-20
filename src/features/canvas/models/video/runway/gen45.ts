import type { VideoModelDefinition } from '../../types';
import type { AspectRatioOption } from '../../types';

export const RUNWAY_GEN45_MODEL_ID = 'runway/gen-4.5';

const RUNWAY_GEN45_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '21:9', label: '21:9' },
];

const RUNWAY_GEN45_DURATIONS = [
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
  { value: '15', label: '15秒' },
];

export const videoModel: VideoModelDefinition = {
  id: RUNWAY_GEN45_MODEL_ID,
  mediaType: 'video',
  displayName: 'Runway Gen-4.5',
  providerId: 'runway',
  description: 'Runway Gen-4.5 视频生成模型 - 专业创作',
  eta: '3-6min',
  expectedDurationMs: 300000,
  defaultAspectRatio: '16:9',
  defaultDuration: '10',
  aspectRatios: RUNWAY_GEN45_ASPECT_RATIOS,
  durations: RUNWAY_GEN45_DURATIONS,
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: RUNWAY_GEN45_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
};
