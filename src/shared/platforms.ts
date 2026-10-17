import type { Platform } from './types';

export interface PlatformAdapter {
  platform: Platform;
  matches(hostname: string): boolean;
  isDetailPage(url: URL): boolean;
  selectors: string[];
  ignoredPathHints: string[];
}

// 各平台的图片容器选择器集中维护，页面改版时可单独调整。
export const adapters: PlatformAdapter[] = [
  {
    platform: '淘宝',
    matches: (host) => host === 'taobao.com' || host.endsWith('.taobao.com') || host === 'tmall.com' || host.endsWith('.tmall.com'),
    isDetailPage: (url) => /\/item\.htm$/i.test(url.pathname) || /\/detail\.html$/i.test(url.pathname),
    selectors: ['#J_ImgBooth', '.tb-thumb img', '.tb-gallery img', '.detail-gallery img', '[class*="pic"] img', '[class*="image"] img'],
    ignoredPathHints: ['avatar', 'logo', 'icon', 'banner'],
  },
  {
    platform: '京东',
    matches: (host) => host === 'jd.com' || host.endsWith('.jd.com'),
    isDetailPage: (url) => url.hostname === 'item.jd.com' || /\/(?:goods|product|item)(?:\/|\.|$)/i.test(url.pathname),
    selectors: ['#spec-img', '#spec-list img', '.spec-items img', '.detail-content img', '[class*="preview"] img'],
    ignoredPathHints: ['avatar', 'logo', 'icon', 'sprite'],
  },
  {
    platform: '拼多多',
    matches: (host) => host === 'pinduoduo.com' || host.endsWith('.pinduoduo.com') || host === 'yangkeduo.com' || host.endsWith('.yangkeduo.com'),
    isDetailPage: (url) => /(?:goods|product|item|preview|detail)/i.test(url.pathname),
    selectors: ['[class*="goods"] img', '[class*="product"] img', '[class*="carousel"] img', '[class*="detail"] img', '[class*="preview"] img'],
    ignoredPathHints: ['avatar', 'logo', 'icon', 'shop'],
  },
];

export function getAdapter(hostname: string): PlatformAdapter | undefined {
  return adapters.find((adapter) => adapter.matches(hostname.toLowerCase()));
}

export function isSupportedProductPage(href: string): boolean {
  try {
    const url = new URL(href);
    const adapter = getAdapter(url.hostname);
    return Boolean(adapter?.isDetailPage(url));
  } catch {
    return false;
  }
}
