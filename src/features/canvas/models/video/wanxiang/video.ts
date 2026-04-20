import type { VideoModelDefinition } from '../../types';
import type { AspectRatioOption } from '../../types';

export const WANXIANG_VIDEO_MODEL_ID = 'wanxiang/video';

const WANXIANG_VIDEO_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
];

const WANXIANG_VIDEO_DURATIONS = [
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
  { value: '15', label: '15秒' },
];

export const videoModel: VideoModelDefinition = {
  id: WANXIANG_VIDEO_MODEL_ID,
  mediaType: 'video',
  displayName: '阿里万象',
  providerId: 'wanxiang',
  description: '阿里云 · 万象视频生成模型',
  eta: '3-5min',
  expectedDurationMs: 300000,
  defaultAspectRatio: '16:9',
  defaultDuration: '5',
  aspectRatios: WANXIANG_VIDEO_ASPECT_RATIOS,
  durations: WANXIANG_VIDEO_DURATIONS,
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: WANXIANG_VIDEO_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
};