import type { VideoModelDefinition } from '../../types';
import type { AspectRatioOption } from '../../types';

export const PIKA_25_MODEL_ID = 'pika/pika-2.5';

const PIKA_25_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
];

const PIKA_25_DURATIONS = [
  { value: '3', label: '3秒' },
  { value: '5', label: '5秒' },
  { value: '8', label: '8秒' },
];

export const videoModel: VideoModelDefinition = {
  id: PIKA_25_MODEL_ID,
  mediaType: 'video',
  displayName: 'Pika 2.5',
  providerId: 'pika',
  description: 'Pika 2.5 视频生成模型 - 创意特效',
  eta: '1-3min',
  expectedDurationMs: 120000,
  defaultAspectRatio: '16:9',
  defaultDuration: '5',
  aspectRatios: PIKA_25_ASPECT_RATIOS,
  durations: PIKA_25_DURATIONS,
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: PIKA_25_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
};
