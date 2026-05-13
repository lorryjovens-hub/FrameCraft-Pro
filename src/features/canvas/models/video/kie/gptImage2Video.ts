import type { VideoModelDefinition } from '../../types';

export const KIE_GPT_IMAGE_2_VIDEO_MODEL_ID = 'kie/gpt-image-2-video';

const KIE_GPT_IMAGE_2_VIDEO_ASPECT_RATIOS = [
  '1:1',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
] as const;

const KIE_GPT_IMAGE_2_VIDEO_DURATIONS = [
  { value: '5', label: '5秒' },
  { value: '10', label: '10秒' },
] as const;

export const videoModel: VideoModelDefinition = {
  id: KIE_GPT_IMAGE_2_VIDEO_MODEL_ID,
  mediaType: 'video',
  displayName: 'GPT Image-2 Video (KIE)',
  providerId: 'kie',
  description: 'KIE · GPT Image-2 图生视频生成',
  eta: '2-5min',
  expectedDurationMs: 180000,
  defaultAspectRatio: '16:9',
  defaultDuration: '5',
  aspectRatios: KIE_GPT_IMAGE_2_VIDEO_ASPECT_RATIOS.map((value) => ({ value, label: value })),
  durations: KIE_GPT_IMAGE_2_VIDEO_DURATIONS.map((d) => ({ value: d.value, label: d.label })),
  resolveRequest: ({ referenceImageCount }) => ({
    requestModel: 'gpt-image-2-text-to-video',
    modeLabel: referenceImageCount > 0 ? '图生视频' : '文生视频',
  }),
};
