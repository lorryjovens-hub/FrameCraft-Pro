import type { VideoModelDefinition } from '../../types';
import type { AspectRatioOption } from '../../types';

export const KING_Q_MODEL_ID = 'kling/king-q';

const KING_Q_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '21:9', label: '21:9' },
];

const KING_Q_DURATIONS = [
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
  { value: '15', label: '15秒' },
  { value: '20', label: '20秒' },
];

export const videoModel: VideoModelDefinition = {
  id: KING_Q_MODEL_ID,
  mediaType: 'video',
  displayName: 'King Q',
  providerId: 'kling',
  description: 'King Q 视频生成模型 - 专注主体一致性，适合固定模特/角色视频生成',
  eta: '2-5min',
  expectedDurationMs: 240000,
  defaultAspectRatio: '16:9',
  defaultDuration: '15',
  aspectRatios: KING_Q_ASPECT_RATIOS,
  durations: KING_Q_DURATIONS,
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: KING_Q_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '图生视频（主体一致）' : '文生视频',
  }),
  capabilities: {
    subjectConsistency: true,
    faceIdentity: true,
    multiSubject: false,
  },
};
