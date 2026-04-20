import type { VideoModelDefinition } from '../../types';
import type { AspectRatioOption } from '../../types';

export const KLING_30_MODEL_ID = 'kling/kling-3.0';

const KLING_30_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
];

const KLING_30_DURATIONS = [
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
  { value: '15', label: '15秒' },
];

export const videoModel: VideoModelDefinition = {
  id: KLING_30_MODEL_ID,
  mediaType: 'video',
  displayName: 'Kling 3.0',
  providerId: 'kling',
  description: '可灵 Kling 3.0 视频生成模型 - 免费尝鲜',
  eta: '2-4min',
  expectedDurationMs: 180000,
  defaultAspectRatio: '16:9',
  defaultDuration: '10',
  aspectRatios: KLING_30_ASPECT_RATIOS,
  durations: KLING_30_DURATIONS,
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: KLING_30_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
};
