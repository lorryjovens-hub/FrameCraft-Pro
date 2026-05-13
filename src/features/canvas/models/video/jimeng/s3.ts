import type { VideoModelDefinition } from '../../types';
import type { AspectRatioOption } from '../../types';

export const JIMENG_S3_MODEL_ID = 'jimeng/s3';

const JIMENG_S3_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
];

const JIMENG_S3_DURATIONS = [
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
];

export const videoModel: VideoModelDefinition = {
  id: JIMENG_S3_MODEL_ID,
  mediaType: 'video',
  displayName: '即梦 S3',
  providerId: 'jimeng',
  description: '即梦 · S3 视频生成模型 - 更高质量视频生成',
  eta: '4-6min',
  expectedDurationMs: 360000,
  defaultAspectRatio: '16:9',
  defaultDuration: '5',
  aspectRatios: JIMENG_S3_ASPECT_RATIOS,
  durations: JIMENG_S3_DURATIONS,
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: JIMENG_S3_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
};