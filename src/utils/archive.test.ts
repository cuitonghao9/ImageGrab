import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { createImageArchive } from './archive';

describe('PNG 图片 ZIP 打包', () => {
  it('将多张 PNG 以指定文件名放入压缩包', async () => {
    const bytes = await createImageArchive([
      { name: '淘宝_商品图片_001.png', png: new Blob(['first-png'], { type: 'image/png' }) },
      { name: '淘宝_商品图片_002.png', png: new Blob(['second-png'], { type: 'image/png' }) },
    ]);
    const zip = await JSZip.loadAsync(bytes);
    expect(Object.keys(zip.files).sort()).toEqual(['淘宝_商品图片_001.png', '淘宝_商品图片_002.png']);
    expect(await zip.file('淘宝_商品图片_001.png')?.async('string')).toBe('first-png');
  });
});
