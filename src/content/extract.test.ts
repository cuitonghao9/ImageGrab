import { describe, expect, it } from 'vitest';
import { extractImages } from './extract';

describe('电商平台图片提取', () => {
  it('兼容懒加载、srcset、JSON-LD 并去重', () => {
    document.body.innerHTML = `
      <div id="J_ImgBooth"><img data-src="//img.alicdn.com/item.jpg" srcset="//img.alicdn.com/item.jpg 1x, //img.alicdn.com/item-big.jpg 2x"></div>
      <script type="application/ld+json">{"@type":"Product","image":["https://img.alicdn.com/item.jpg","https://img.alicdn.com/second.png"]}</script>`;
    const result = extractImages(document, 'https://item.taobao.com/item.htm?id=1');
    expect(result.platform).toBe('淘宝');
    expect(result.images.map((image) => image.url)).toContain('https://img.alicdn.com/item.jpg');
    expect(result.images.map((image) => image.url)).toContain('https://img.alicdn.com/second.png');
    expect(new Set(result.images.map((image) => image.url)).size).toBe(result.images.length);
  });

  it('支持京东和拼多多的域名适配并处理空列表', () => {
    expect(extractImages(document, 'https://item.jd.com/1.html').platform).toBe('京东');
    expect(extractImages(document, 'https://mms.pinduoduo.com/goods').platform).toBe('拼多多');
    expect(extractImages(document, 'https://example.com/').images).toHaveLength(0);
  });
});
