import JSZip from 'jszip';

export interface ArchiveImage {
  name: string;
  png: Blob;
}

// 图片先逐张转为 PNG，再写入同一个 ZIP，避免把源格式混在压缩包里。
export async function createImageArchive(images: ArchiveImage[]): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const image of images) zip.file(image.name, image.png);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
