import type { ModelProviderDefinition } from '../types';

export const GRSAI_NANO_BANANA_PRO_MODEL_OPTIONS = [
  'nano-banana-pro',
  'nano-banana-pro-vt',
  'nano-banana-pro-cl',
  'nano-banana-pro-vip',
  'nano-banana-pro-4k-vip',
] as const;

export const provider: ModelProviderDefinition = {
  id: 'grsai',
  name: 'GRSAI',
  label: 'GRSAI',
};

