import type { VideoModelDefinition } from '../../types';
import type { AspectRatioOption } from '../../types';

export const WAN_26_MODEL_ID = 'wan/wan-2.6';

const WAN_26_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
];

const WAN_26_DURATIONS = [
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
  { value: '15', label: '15秒' },
];

export const videoModel: VideoModelDefinition = {
  id: WAN_26_MODEL_ID,
  mediaType: 'video',
  displayName: 'Wan 2.6',
  providerId: 'wan',
  description: 'Wan 2.6 视频生成模型 - 开源定制',
  eta: '2-5min',
  expectedDurationMs: 240000,
  defaultAspectRatio: '16:9',
  defaultDuration: '10',
  aspectRatios: WAN_26_ASPECT_RATIOS,
  durations: WAN_26_DURATIONS,
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: WAN_26_MODEL_ID,
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
};
