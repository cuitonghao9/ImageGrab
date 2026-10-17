import type { ExtractedImage } from '../shared/types';

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|bmp|avif)(?:$|[?#])/i;
const EXCLUDED = /(logo|avatar|sprite|icon|favicon|qrcode|qr-code)/i;

export function normalizeImageUrl(raw: string, baseUrl: string): string | undefined {
  const candidate = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!candidate || /^(data:|blob:|javascript:)/i.test(candidate)) return undefined;
  try {
    const url = new URL(candidate, baseUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    url.hash = '';
    return url.href;
  } catch {
    return undefined;
  }
}

export function isLikelyProductImage(url: string, minDimension = 80): boolean {
  if (EXCLUDED.test(url)) return false;
  const dimension = url.match(/(?:^|[_-])(\d{2,4})x(\d{2,4})(?:[_\-.?]|$)/i);
  if (dimension && (Number(dimension[1]) < minDimension || Number(dimension[2]) < minDimension)) return false;
  return IMAGE_EXTENSIONS.test(url) || /[?&](?:img|image|w|width|size)=/i.test(url) || /\.(?:alicdn|360buyimg|pddpic)\.com/i.test(url) || /\/images?\//i.test(url);
}

export function collectSrcset(value: string): string[] {
  return value.split(',').map((entry) => entry.trim().split(/\s+/)[0]).filter(Boolean);
}

export function uniqueImages(items: Array<{ url: string; source: ExtractedImage['source'] }>): ExtractedImage[] {
  const seen = new Set<string>();
  const result: ExtractedImage[] = [];
  for (const item of items) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    result.push({ id: `img-${result.length + 1}`, url: item.url, source: item.source });
  }
  return result;
}

export function safeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\s+/g, '_').replace(/_+/g, '_').slice(0, 80) || '商品图片';
}

export function imageFileName(platform: string, index: number): string {
  return `${safeFileName(platform)}_商品图片_${String(index).padStart(3, '0')}.png`;
}

export async function convertToPng(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('浏览器无法创建图片画布');
    context.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('PNG 编码失败')), 'image/png');
    });
  } finally {
    bitmap.close();
  }
}

export async function fetchPng(url: string): Promise<Blob> {
  const response = await fetch(url, { credentials: 'include', cache: 'no-cache' });
  if (!response.ok) throw new Error(`图片请求失败（HTTP ${response.status}）`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('服务器返回的内容不是图片');
  return convertToPng(blob);
}
