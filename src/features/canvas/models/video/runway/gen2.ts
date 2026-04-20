import type { VideoModelDefinition } from '../../types';
import type { AspectRatioOption } from '../../types';

export const GEN2_MODEL_ID = 'runway/gen-2';

const GEN2_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
];

const GEN2_DURATIONS = [
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
  { value: '15', label: '15秒' },
];

export const videoModel: VideoModelDefinition = {
  id: GEN2_MODEL_ID,
  mediaType: 'video',
  displayName: 'Gen2',
  providerId: 'runway',
  description: 'Runway Gen2 视频生成模型',
  eta: '2-5min',
  expectedDurationMs: 240000,
  defaultAspectRatio: '16:9',
  defaultDuration: '10',
  aspectRatios: GEN2_ASPECT_RATIOS,
  durations: GEN2_DURATIONS,
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: GEN2_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
};
