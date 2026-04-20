import type { VideoModelDefinition } from '../../types';
import type { AspectRatioOption } from '../../types';

export const HAILUO_23_MODEL_ID = 'hailuo/hailuo-2.3';

const HAILUO_23_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
];

const HAILUO_23_DURATIONS = [
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
  { value: '15', label: '15秒' },
];

export const videoModel: VideoModelDefinition = {
  id: HAILUO_23_MODEL_ID,
  mediaType: 'video',
  displayName: 'Hailuo 2.3',
  providerId: 'hailuo',
  description: 'Hailuo 2.3 视频生成模型 - 二次元风格',
  eta: '2-4min',
  expectedDurationMs: 180000,
  defaultAspectRatio: '16:9',
  defaultDuration: '10',
  aspectRatios: HAILUO_23_ASPECT_RATIOS,
  durations: HAILUO_23_DURATIONS,
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: HAILUO_23_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
};
