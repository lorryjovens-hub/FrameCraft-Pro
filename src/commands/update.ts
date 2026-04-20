import { invoke, isTauri } from '@tauri-apps/api/core';

export async function checkLatestReleaseTag(): Promise<string | null> {
  if (!isTauri()) {
    return null;
  }
  const tag = await invoke<string | null>('check_latest_release_tag');
  return tag ? tag.trim() : null;
}
