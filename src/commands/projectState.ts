import { invoke, isTauri } from '@tauri-apps/api/core';

export interface ProjectSummaryRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  nodeCount: number;
}

export interface ProjectRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  nodeCount: number;
  nodesJson: string;
  edgesJson: string;
  viewportJson: string;
  historyJson: string;
}

export async function listProjectSummaries(): Promise<ProjectSummaryRecord[]> {
  if (!isTauri()) {
    return [];
  }
  return await invoke<ProjectSummaryRecord[]>('list_project_summaries');
}

export async function getProjectRecord(projectId: string): Promise<ProjectRecord | null> {
  if (!isTauri()) {
    return null;
  }
  return await invoke<ProjectRecord | null>('get_project_record', { projectId });
}

export async function upsertProjectRecord(record: ProjectRecord): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invoke('upsert_project_record', { record });
}

export async function updateProjectViewportRecord(
  projectId: string,
  viewportJson: string
): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invoke('update_project_viewport_record', { projectId, viewportJson });
}

export async function renameProjectRecord(
  projectId: string,
  name: string,
  updatedAt: number
): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invoke('rename_project_record', { projectId, name, updatedAt });
}

export async function deleteProjectRecord(projectId: string): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invoke('delete_project_record', { projectId });
}
