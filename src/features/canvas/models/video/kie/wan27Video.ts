import type { VideoModelDefinition } from '../../types';

export const KIE_WAN_27_VIDEO_MODEL_ID = 'kie/wan-2.7-video';

const KIE_WAN_27_VIDEO_ASPECT_RATIOS = [
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
] as const;

const KIE_WAN_27_VIDEO_DURATIONS = [
  { value: '2', label: '2秒' },
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
  { value: '15', label: '15秒' },
] as const;

export const videoModel: VideoModelDefinition = {
  id: KIE_WAN_27_VIDEO_MODEL_ID,
  mediaType: 'video',
  displayName: 'Wan 2.7 Video (KIE)',
  providerId: 'kie',
  description: 'KIE · Wan 2.7 视频生成 - 高质量视频生成，支持音频同步',
  eta: '3-6min',
  expectedDurationMs: 300000,
  defaultAspectRatio: '16:9',
  defaultDuration: '5',
  aspectRatios: KIE_WAN_27_VIDEO_ASPECT_RATIOS.map((r) => ({ value: r.value, label: r.label })),
  durations: KIE_WAN_27_VIDEO_DURATIONS.map((d) => ({ value: d.value, label: d.label })),
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: 'wan/2-7-text-to-video',
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
};
