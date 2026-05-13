import type { VideoModelDefinition } from '../../types';

export const KIE_KLING_30_MODEL_ID = 'kie/kling-3.0';

const KIE_KLING_30_ASPECT_RATIOS = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
] as const;

const KIE_KLING_30_DURATIONS = [
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
  { value: '15', label: '15秒' },
] as const;

export const videoModel: VideoModelDefinition = {
  id: KIE_KLING_30_MODEL_ID,
  mediaType: 'video',
  displayName: 'Kling 3.0 (KIE)',
  providerId: 'kie',
  description: 'KIE · 可灵 Kling 3.0 视频生成 - 高质量视频生成',
  eta: '2-4min',
  expectedDurationMs: 180000,
  defaultAspectRatio: '16:9',
  defaultDuration: '10',
  aspectRatios: KIE_KLING_30_ASPECT_RATIOS.map((r) => ({ value: r.value, label: r.label })),
  durations: KIE_KLING_30_DURATIONS.map((d) => ({ value: d.value, label: d.label })),
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: 'kling-3.0/video',
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
};
