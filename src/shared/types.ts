export type Platform = '淘宝' | '京东' | '拼多多';

export interface ExtractedImage {
  id: string;
  url: string;
  source: 'dom' | 'background' | 'json';
}

export interface GalleryTask {
  id: string;
  platform: Platform;
  pageUrl: string;
  images: ExtractedImage[];
  createdAt: number;
}

export type ExtensionMessage =
  | { type: 'OPEN_GALLERY'; platform: Platform; pageUrl: string; images: ExtractedImage[] }
  | { type: 'GET_TASK'; taskId: string };

export type ExtensionResponse =
  | { ok: true; taskId?: string; task?: GalleryTask }
  | { ok: false; error: string };
