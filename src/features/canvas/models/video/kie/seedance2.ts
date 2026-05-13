import type { VideoModelDefinition } from '../../types';

export const KIE_SEEDANCE_2_MODEL_ID = 'kie/seedance-2';

const KIE_SEEDANCE_2_ASPECT_RATIOS = [
  { value: '16:9', label: '16:9' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1' },
  { value: '3:4', label: '3:4' },
  { value: '9:16', label: '9:16' },
  { value: '21:9', label: '21:9' },
] as const;

const KIE_SEEDANCE_2_DURATIONS = [
  { value: '4', label: '4秒' },
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
  { value: '15', label: '15秒' },
] as const;

export const videoModel: VideoModelDefinition = {
  id: KIE_SEEDANCE_2_MODEL_ID,
  mediaType: 'video',
  displayName: 'Seedance 2.0 (KIE)',
  providerId: 'kie',
  description: 'KIE · Seedance 2.0 视频生成 - 支持多模态参考（图片/视频/音频）',
  eta: '3-6min',
  expectedDurationMs: 300000,
  defaultAspectRatio: '16:9',
  defaultDuration: '15',
  aspectRatios: KIE_SEEDANCE_2_ASPECT_RATIOS.map((r) => ({ value: r.value, label: r.label })),
  durations: KIE_SEEDANCE_2_DURATIONS.map((d) => ({ value: d.value, label: d.label })),
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: 'bytedance/seedance-2',
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
};
