import type { VideoModelDefinition } from '../../types';
import type { AspectRatioOption } from '../../types';

export const VIDEO_31_MODEL_ID = 'video/video-3.1';

const VIDEO_31_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '21:9', label: '21:9' },
];

const VIDEO_31_DURATIONS = [
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
  { value: '15', label: '15秒' },
  { value: '20', label: '20秒' },
  { value: '30', label: '30秒' },
];

export const videoModel: VideoModelDefinition = {
  id: VIDEO_31_MODEL_ID,
  mediaType: 'video',
  displayName: 'Video 3.1',
  providerId: 'video',
  description: 'Video 3.1 视频生成模型 - 高质量视频生成，支持复杂场景和动作',
  eta: '3-6min',
  expectedDurationMs: 300000,
  defaultAspectRatio: '16:9',
  defaultDuration: '15',
  aspectRatios: VIDEO_31_ASPECT_RATIOS,
  durations: VIDEO_31_DURATIONS,
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: VIDEO_31_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
  capabilities: {
    subjectConsistency: true,
    faceIdentity: true,
    multiSubject: true,
    complexMotion: true,
  },
};
