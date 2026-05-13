import type { VideoModelDefinition } from '../../types';

export const KIE_HAPPYHORSE_MODEL_ID = 'kie/happyhorse-1.0';

const KIE_HAPPYHORSE_ASPECT_RATIOS = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
] as const;

const KIE_HAPPYHORSE_DURATIONS = [
  { value: '3', label: '3秒' },
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
  { value: '15', label: '15秒' },
] as const;

export const videoModel: VideoModelDefinition = {
  id: KIE_HAPPYHORSE_MODEL_ID,
  mediaType: 'video',
  displayName: 'HappyHorse 1.0 (KIE)',
  providerId: 'kie',
  description: 'KIE · HappyHorse 1.0 视频生成 - Pixar 风格动画视频',
  eta: '2-5min',
  expectedDurationMs: 240000,
  defaultAspectRatio: '16:9',
  defaultDuration: '5',
  aspectRatios: KIE_HAPPYHORSE_ASPECT_RATIOS.map((r) => ({ value: r.value, label: r.label })),
  durations: KIE_HAPPYHORSE_DURATIONS.map((d) => ({ value: d.value, label: d.label })),
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: 'happyhorse/text-to-video',
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
};
