import { describe, expect, it, vi } from 'vitest';
import { collectSrcset, convertToPng, imageFileName, isLikelyProductImage, normalizeImageUrl, safeFileName, uniqueImages } from './image';

describe('图片 URL 与文件名工具', () => {
  it('规范化相对 URL 并去掉 hash', () => {
    expect(normalizeImageUrl('//img.example.com/a.jpg#x', 'https://shop.example.com/item')).toBe('https://img.example.com/a.jpg');
    expect(normalizeImageUrl('/a.png', 'https://shop.example.com/item')).toBe('https://shop.example.com/a.png');
  });

  it('拒绝非网络 URL 和常见无关图片', () => {
    expect(normalizeImageUrl('data:image/png;base64,aa', 'https://shop.example.com')).toBeUndefined();
    expect(isLikelyProductImage('https://img.example.com/logo.png')).toBe(false);
    expect(isLikelyProductImage('https://img.example.com/item_40x40.jpg')).toBe(false);
  });

  it('解析 srcset 并按 URL 去重且保持顺序', () => {
    expect(collectSrcset('a.jpg 1x, b.jpg 2x')).toEqual(['a.jpg', 'b.jpg']);
    expect(uniqueImages([{ url: 'a', source: 'dom' }, { url: 'a', source: 'json' }, { url: 'b', source: 'background' }]).map((image) => image.url)).toEqual(['a', 'b']);
  });

  it('生成安全的 PNG 文件名', () => {
    expect(safeFileName('a/b:c')).toBe('a_b_c');
    expect(imageFileName('京东', 3)).toBe('京东_商品图片_003.png');
  });

  it('将图片 Blob 画入 Canvas 并编码为 PNG', async () => {
    const bitmap = { width: 2, height: 3, close: vi.fn() };
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, type) => callback(new Blob(['png'], { type: type ?? 'image/png' })));

    const result = await convertToPng(new Blob(['source'], { type: 'image/jpeg' }));
    expect(result.type).toBe('image/png');
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0);
    expect(bitmap.close).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
