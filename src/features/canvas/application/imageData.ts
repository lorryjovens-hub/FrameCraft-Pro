import { convertFileSrc, isTauri } from '@tauri-apps/api/core';

import {
  loadImage,
  prepareNodeImageBinary,
  persistImageSource,
  prepareNodeImageSource,
} from '@/commands/image';

export function parseAspectRatio(value: string): number {
  const [width, height] = value.split(':').map((item) => Number(item));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 1;
  }

  return width / height;
}

export function reduceAspectRatio(width: number, height: number): string {
  if (width <= 0 || height <= 0) {
    return '1:1';
  }

  const gcd = greatestCommonDivisor(Math.round(width), Math.round(height));
  return `${Math.round(width / gcd)}:${Math.round(height / gcd)}`;
}

function greatestCommonDivisor(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }

  return x || 1;
}

const DEFAULT_PREVIEW_MAX_DIMENSION = 512;
const LOCAL_PATH_PREFIX_PATTERN = /^(?:[A-Za-z]:[\\/]|\\\\|\/)/;

export interface PreparedNodeImage {
  imageUrl: string;
  previewImageUrl: string;
  placeholderImageUrl?: string;
  aspectRatio: string;
}

interface ErrorWithDetails extends Error {
  details?: string;
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function createImagePipelineError(message: string, details?: string, cause?: unknown): ErrorWithDetails {
  const error: ErrorWithDetails = new Error(message);
  const detailParts: string[] = [];
  if (details) {
    detailParts.push(details);
  }
  if (cause !== undefined) {
    detailParts.push(`cause: ${stringifyUnknown(cause)}`);
  }
  if (detailParts.length > 0) {
    error.details = detailParts.join('\n');
  }
  return error;
}

const ORIGINAL_IMAGE_ZOOM_THRESHOLD = 1.45;

export function shouldUseOriginalImageByZoom(zoom: number): boolean {
  return Number.isFinite(zoom) && zoom >= ORIGINAL_IMAGE_ZOOM_THRESHOLD;
}

export function isLikelyLocalImagePath(imageUrl: string): boolean {
  if (!imageUrl) {
    return false;
  }

  const lower = imageUrl.toLowerCase();
  if (
    lower.startsWith('data:') ||
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('blob:') ||
    lower.startsWith('asset:') ||
    lower.startsWith('tauri:') ||
    lower.startsWith('file://')
  ) {
    return false;
  }

  return LOCAL_PATH_PREFIX_PATTERN.test(imageUrl);
}

export function resolveImageDisplayUrl(imageUrl: string): string {
  const lower = imageUrl.toLowerCase();
  if (lower.startsWith('file://')) {
    if (!isTauri()) {
      return imageUrl;
    }

    try {
      const parsed = new URL(imageUrl);
      const decodedPathname = decodeURIComponent(parsed.pathname);
      const normalizedPath = decodedPathname.replace(/^\/([A-Za-z]:[\\/])/, '$1');
      if (!normalizedPath) {
        return imageUrl;
      }
      return convertFileSrc(normalizedPath);
    } catch {
      return imageUrl;
    }
  }

  if (isLikelyLocalImagePath(imageUrl)) {
    if (isTauri()) {
      return convertFileSrc(imageUrl);
    }
    return imageUrl;
  }

  return imageUrl;
}

export async function persistImageLocally(source: string): Promise<string> {
  if (isLikelyLocalImagePath(source)) {
    return source;
  }

  if (!isTauri()) {
    return source;
  }

  return await persistImageSource(source);
}

export async function loadImageElement(source: string): Promise<HTMLImageElement> {
  const image = new Image();
  const displaySource = resolveImageDisplayUrl(source);
  if (
    displaySource.startsWith('http://') ||
    displaySource.startsWith('https://') ||
    displaySource.startsWith('asset:')
  ) {
    image.crossOrigin = 'anonymous';
  }

  return await new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        createImagePipelineError('图片加载失败', `source=${source}\ndisplaySource=${displaySource}`)
      );
    image.src = displaySource;
  });
}

export async function imageUrlToDataUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  if (isLikelyLocalImagePath(imageUrl)) {
    if (isTauri()) {
      try {
        return await loadImage(imageUrl);
      } catch (error) {
        throw createImagePipelineError('无法读取本地图片数据', `source=${imageUrl}`, error);
      }
    }
    const localResponse = await fetch(resolveImageDisplayUrl(imageUrl));
    if (!localResponse.ok) {
      throw createImagePipelineError(
        '无法读取本地图片数据',
        `source=${imageUrl}\nstatus=${localResponse.status}`
      );
    }
    const localBlob = await localResponse.blob();
    return await blobToDataUrl(localBlob);
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw createImagePipelineError('无法下载图片数据', `url=${imageUrl}\nstatus=${response.status}`);
  }

  const blob = await response.blob();
  return await blobToDataUrl(blob);
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const reader = new FileReader();

  return await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('图片转换失败'));
    reader.readAsDataURL(blob);
  });
}

export function extractBase64Payload(dataUrl: string): string {
  const [, payload = ''] = dataUrl.split(',');
  return payload;
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  const reader = new FileReader();

  return await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

function resolveFileExtension(file: File): string {
  const mime = file.type.toLowerCase();
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/bmp') return 'bmp';
  if (mime === 'image/tiff') return 'tiff';
  if (mime === 'image/avif') return 'avif';

  const name = file.name.trim();
  const dot = name.lastIndexOf('.');
  if (dot >= 0 && dot < name.length - 1) {
    return name.slice(dot + 1).toLowerCase();
  }
  return 'png';
}

export async function prepareNodeImageFromFile(
  file: File,
  maxPreviewDimension = DEFAULT_PREVIEW_MAX_DIMENSION
): Promise<PreparedNodeImage> {
  const started = performance.now();
  const tauriFilePath = (file as File & { path?: string }).path;
  const normalizedPath = typeof tauriFilePath === 'string' ? tauriFilePath.trim() : '';
  const canUseLocalPath =
    normalizedPath.length > 0
    && (isLikelyLocalImagePath(normalizedPath) || normalizedPath.toLowerCase().startsWith('file://'));
  if (canUseLocalPath) {
    const prepared = await prepareNodeImage(normalizedPath, maxPreviewDimension);
    console.info(
      `[upload-perf][imageData] prepareNodeImageFromFile path-mode name="${file.name}" size=${file.size}B elapsed=${Math.round(performance.now() - started)}ms`
    );
    return prepared;
  }

  if (isTauri()) {
    const safeMaxDimension = Math.max(64, Math.floor(maxPreviewDimension));
    const readStarted = performance.now();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const readElapsed = Math.round(performance.now() - readStarted);
    const extension = resolveFileExtension(file);
    const tauriStarted = performance.now();
    const prepared = await prepareNodeImageBinary(bytes, extension, safeMaxDimension);
    const tauriElapsed = Math.round(performance.now() - tauriStarted);
    console.info(
      `[upload-perf][imageData] prepareNodeImageFromFile binary-mode name="${file.name}" size=${file.size}B readArrayBuffer=${readElapsed}ms tauriPrepare=${tauriElapsed}ms total=${Math.round(performance.now() - started)}ms`
    );
    return {
      imageUrl: prepared.imagePath,
      previewImageUrl: prepared.previewImagePath,
      placeholderImageUrl: prepared.placeholderImagePath,
      aspectRatio: prepared.aspectRatio,
    };
  }

  const dataUrlStarted = performance.now();
  const source = await readFileAsDataUrl(file);
  const dataUrlElapsed = Math.round(performance.now() - dataUrlStarted);
  const prepared = await prepareNodeImage(source, maxPreviewDimension);
  console.info(
    `[upload-perf][imageData] prepareNodeImageFromFile dataurl-fallback name="${file.name}" size=${file.size}B readDataUrl=${dataUrlElapsed}ms total=${Math.round(performance.now() - started)}ms`
  );
  return prepared;
}

export async function detectAspectRatio(imageUrl: string): Promise<string> {
  const image = await loadImageElement(imageUrl);
  return reduceAspectRatio(image.naturalWidth, image.naturalHeight);
}

export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

function resolvePreviewMimeType(imageUrl: string): string {
  if (imageUrl.startsWith('data:image/png')) {
    return 'image/png';
  }
  if (imageUrl.startsWith('data:image/webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

function renderPreviewDataUrl(
  image: HTMLImageElement,
  sourceDataUrl: string,
  maxDimension: number
): string {
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  if (longestSide <= maxDimension) {
    return sourceDataUrl;
  }

  const scale = maxDimension / longestSide;
  const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    return sourceDataUrl;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const mimeType = resolvePreviewMimeType(sourceDataUrl);
  if (mimeType === 'image/jpeg') {
    return canvas.toDataURL(mimeType, 0.86);
  }
  return canvas.toDataURL(mimeType);
}

export async function createPreviewDataUrl(
  imageUrl: string,
  maxDimension = DEFAULT_PREVIEW_MAX_DIMENSION
): Promise<string> {
  const normalizedDataUrl = await imageUrlToDataUrl(imageUrl);
  const image = await loadImageElement(normalizedDataUrl);
  const safeMaxDimension = Math.max(64, Math.floor(maxDimension));
  return renderPreviewDataUrl(image, normalizedDataUrl, safeMaxDimension);
}

export async function prepareNodeImage(
  imageUrl: string,
  maxPreviewDimension = DEFAULT_PREVIEW_MAX_DIMENSION
): Promise<PreparedNodeImage> {
  const trimmedImageUrl = imageUrl.trim();
  if (!trimmedImageUrl) {
    throw createImagePipelineError('未获取到可用图片结果', 'imageUrl is empty');
  }

  const started = performance.now();
  if (isTauri()) {
    const safeMaxDimension = Math.max(64, Math.floor(maxPreviewDimension));
    try {
      const tauriStarted = performance.now();
      const prepared = await prepareNodeImageSource(trimmedImageUrl, safeMaxDimension);
      console.info(
        `[upload-perf][imageData] prepareNodeImage tauri-source elapsed=${Math.round(performance.now() - tauriStarted)}ms total=${Math.round(performance.now() - started)}ms`
      );
      return {
        imageUrl: prepared.imagePath,
        previewImageUrl: prepared.previewImagePath,
        placeholderImageUrl: prepared.placeholderImagePath,
        aspectRatio: prepared.aspectRatio,
      };
    } catch (error) {
      console.warn('[imageData] prepareNodeImage tauri-source failed, fallback to browser path', {
        source: trimmedImageUrl,
        error,
      });
      // fallback to browser path for compatibility
    }
  }

  try {
    const persistedImagePath = await persistImageLocally(trimmedImageUrl);
    const normalizedDataUrl = await imageUrlToDataUrl(persistedImagePath);
    const image = await loadImageElement(normalizedDataUrl);
    const safeMaxDimension = Math.max(64, Math.floor(maxPreviewDimension));
    const previewDataUrl = renderPreviewDataUrl(image, normalizedDataUrl, safeMaxDimension);
    const previewImagePath =
      previewDataUrl === normalizedDataUrl
        ? persistedImagePath
        : await persistImageLocally(previewDataUrl);

    console.info(
      `[upload-perf][imageData] prepareNodeImage browser-fallback total=${Math.round(performance.now() - started)}ms`
    );
    return {
      imageUrl: persistedImagePath,
      previewImageUrl: previewImagePath,
      aspectRatio: reduceAspectRatio(image.naturalWidth, image.naturalHeight),
    };
  } catch (error) {
    throw createImagePipelineError(
      '生成结果无法解析为图片',
      `source=${trimmedImageUrl}`,
      error
    );
  }
}
