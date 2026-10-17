import type { ExtractedImage } from '../shared/types';
import { getAdapter } from '../shared/platforms';
import { collectSrcset, isLikelyProductImage, normalizeImageUrl, uniqueImages } from '../utils/image';

const IMAGE_ATTRIBUTES = ['currentSrc', 'src', 'data-src', 'data-original', 'data-lazy-src', 'data-ks-lazyload', 'data-zoom-image'];
const CSS_URL = /url\(["']?(.*?)["']?\)/g;

function jsonImageUrls(value: unknown, found: string[], depth = 0): void {
  if (depth > 12 || value == null) return;
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value) && (IMAGE_EXTENSIONS.test(value) || /\.(alicdn|360buyimg|pddpic)\.com/i.test(value))) found.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => jsonImageUrls(item, found, depth + 1));
    return;
  }
  if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (/image|pic|photo|gallery|sku/i.test(key)) jsonImageUrls(item, found, depth + 1);
    }
  }
}

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|bmp|avif)(?:$|[?#])/i;

export function extractImages(doc: Document, pageUrl: string): { platform: string; images: ExtractedImage[] } {
  const adapter = getAdapter(new URL(pageUrl).hostname);
  if (!adapter) return { platform: '未知平台', images: [] };
  const candidates: Array<{ url: string; source: ExtractedImage['source'] }> = [];
  const seenElements = new Set<Element>();
  const imageElements = Array.from(doc.querySelectorAll('img'));
  for (const selector of adapter.selectors) {
    try { doc.querySelectorAll(selector).forEach((element) => seenElements.add(element)); } catch { /* 兼容无效的站点选择器 */ }
  }
  doc.querySelectorAll<HTMLElement>('[style*="background"], [class*="pic"], [class*="image"], [class*="gallery"], [class*="carousel"]').forEach((element) => seenElements.add(element));
  // 除平台容器外也扫描页面 img，覆盖页面结构变动和延迟加载节点。
  for (const img of imageElements) seenElements.add(img);
  for (const element of seenElements) {
    const values = new Set<string>();
    if (element instanceof HTMLImageElement) {
      for (const attr of IMAGE_ATTRIBUTES) {
        const value = attr === 'currentSrc' ? element.currentSrc : element.getAttribute(attr);
        if (value) values.add(value);
      }
      const srcset = element.getAttribute('srcset') ?? element.getAttribute('data-srcset');
      if (srcset) collectSrcset(srcset).forEach((value) => values.add(value));
    }
    const inlineStyle = element instanceof HTMLElement ? element.getAttribute('style') ?? '' : '';
    const computedStyle = element instanceof HTMLElement ? doc.defaultView?.getComputedStyle(element).backgroundImage ?? '' : '';
    const style = `${inlineStyle} ${computedStyle}`;
    for (const match of style.matchAll(CSS_URL)) values.add(match[1]);
    for (const raw of values) {
      const url = normalizeImageUrl(raw, pageUrl);
      if (url && isLikelyProductImage(url)) candidates.push({ url, source: style.includes(raw) ? 'background' : 'dom' });
    }
  }

  const jsonUrls: string[] = [];
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try { jsonImageUrls(JSON.parse(script.textContent ?? ''), jsonUrls); } catch { /* 跳过不完整的结构化数据 */ }
  }
  for (const raw of jsonUrls) {
    const url = normalizeImageUrl(raw, pageUrl);
    if (url && isLikelyProductImage(url)) candidates.push({ url, source: 'json' });
  }
  return { platform: adapter.platform, images: uniqueImages(candidates) };
}
