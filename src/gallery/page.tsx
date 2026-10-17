import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, CheckCheck, Download, ImagePlus, LoaderCircle, RotateCcw, Square, StopCircle, X } from 'lucide-react';
import type { ExtractedImage, GalleryTask } from '../shared/types';
import { fetchPng, imageFileName } from '../utils/image';

type DownloadState = { done: number; total: number; failed: number; running: boolean; stopped: boolean };
const extensionRuntime = typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);

function previewTask(): GalleryTask {
  const samples = [
    ['雾蓝随行杯', '#c8d9d7', '#668b85'],
    ['日常帆布包', '#e8d9c9', '#bc8862'],
    ['简约桌面灯', '#e7e3d8', '#8d947f'],
  ];
  const images = samples.map(([name, background, foreground], index) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><rect width="640" height="640" fill="${background}"/><ellipse cx="320" cy="492" rx="150" ry="25" fill="#27352d" opacity=".12"/><rect x="180" y="128" width="280" height="340" rx="56" fill="${foreground}"/><rect x="198" y="102" width="244" height="55" rx="18" fill="#f6f5ef"/><path d="M430 208h32c53 0 53 150 0 150h-32" fill="none" stroke="#f6f5ef" stroke-width="22"/><text x="320" y="548" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#27352d">${name}</text></svg>`;
    return { id: `preview-${index + 1}`, url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, source: 'json' as const };
  });
  return { id: 'browser-preview', platform: '淘宝', pageUrl: '#', images, createdAt: Date.now() };
}

function messageTask(taskId: string): Promise<GalleryTask> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'GET_TASK', taskId }, (response) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!response?.ok || !response.task) return reject(new Error(response?.error ?? '无法读取图片任务'));
      resolve(response.task);
    });
  });
}

export default function Gallery() {
  const taskId = new URLSearchParams(location.search).get('task');
  const [task, setTask] = useState<GalleryTask>();
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [download, setDownload] = useState<DownloadState>({ done: 0, total: 0, failed: 0, running: false, stopped: false });
  const [failedImages, setFailedImages] = useState<Map<string, string>>(new Map());
  const [preview, setPreview] = useState<ExtractedImage>();
  const stopRequested = useRef(false);

  useEffect(() => {
    if (!extensionRuntime) {
      const value = previewTask();
      setTask(value);
      setSelected(new Set(value.images.map((image) => image.id)));
      return;
    }
    if (!taskId) { setError('缺少图片任务编号，请返回商品页重新获取。'); return; }
    messageTask(taskId).then((value) => {
      setTask(value);
      setSelected(new Set(value.images.map((image) => image.id)));
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '读取图片任务失败'));
  }, [taskId]);

  const toggle = useCallback((id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }), []);

  const selectedImages = useMemo(() => task?.images.filter((image) => selected.has(image.id)) ?? [], [task, selected]);

  const downloadImages = useCallback(async (images: ExtractedImage[]) => {
    if (!extensionRuntime || !task || download.running || images.length === 0) return;
    stopRequested.current = false;
    setDownload({ done: 0, total: images.length, failed: 0, running: true, stopped: false });
    setFailedImages(new Map());
    let done = 0;
    let failed = 0;
    let cursor = 0;
    const worker = async () => {
      while (true) {
        if (stopRequested.current) return;
        const index = cursor++;
        if (index >= images.length) return;
        const image = images[index];
        try {
          const png = await fetchPng(image.url);
          const objectUrl = URL.createObjectURL(png);
          try {
            await chrome.downloads.download({ url: objectUrl, filename: imageFileName(task.platform, task.images.findIndex((entry) => entry.id === image.id) + 1), saveAs: false, conflictAction: 'uniquify' });
          } finally {
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
          }
          done++;
        } catch (reason) {
          failed++;
          setFailedImages((current) => new Map(current).set(image.id, reason instanceof Error ? reason.message : '下载失败'));
        }
        setDownload((current) => ({ ...current, done: done + failed, failed }));
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, images.length) }, () => worker()));
    setDownload((current) => ({ ...current, running: false, stopped: stopRequested.current, done, failed }));
  }, [download.running, task]);

  const stopDownloads = () => {
    // 正在处理的图片会完成，停止标志阻止 worker 领取后续图片。
    stopRequested.current = true;
    setDownload((current) => ({ ...current, stopped: true }));
  };

  const retryFailed = () => {
    const failed = task?.images.filter((image) => failedImages.has(image.id)) ?? [];
    void downloadImages(failed);
  };

  if (error) return <main className="page"><div className="message"><AlertCircle size={24} /><h1>无法显示图片</h1><p>{error}</p></div></main>;
  if (!task) return <main className="page"><div className="message"><LoaderCircle className="spin" size={24} /><p>正在读取图片…</p></div></main>;

  return <main className="page">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><ImagePlus size={19} /></div><div><h1>商品图片</h1><p>{task.platform} · 共 {task.images.length} 张{!extensionRuntime && <span className="preview-badge">浏览器预览</span>}</p></div></div>
      <div className="actions">
        <button className="quiet" onClick={() => setSelected(new Set(task.images.map((image) => image.id)))}><CheckCheck size={16} />全选</button>
        <button className="quiet" onClick={() => setSelected(new Set())}><Square size={16} />清空</button>
        <button className="quiet" onClick={() => setSelected((current) => new Set(task.images.filter((image) => !current.has(image.id)).map((image) => image.id)))}><RotateCcw size={16} />反选</button>
        {extensionRuntime && <button className="quiet" onClick={() => void chrome.tabs.create({ url: task.pageUrl })}><ImagePlus size={16} />打开商品页</button>}
        <button className="primary" disabled={!extensionRuntime || download.running || selectedImages.length === 0} onClick={() => void downloadImages(selectedImages)}><Download size={16} />{extensionRuntime ? `下载选中 (${selectedImages.length})` : '扩展中可下载'}</button>
      </div>
    </header>

    {task.images.length === 0 ? <section className="empty"><ImagePlus size={32} /><h2>没有发现商品图片</h2><p>请确认当前页面已经加载商品图片，或返回商品页再次获取。</p><a href={task.pageUrl} target="_blank" rel="noreferrer">打开商品页面</a></section> : <>
      {download.total > 0 && <section className="download-status" aria-live="polite">
        <div className="status-copy"><strong>{download.running ? '正在转换并下载' : '下载任务'}</strong><span>{download.done}/{download.total} 完成 · {download.failed} 失败</span></div>
        <progress max={download.total} value={download.done + download.failed} />
        <div className="status-actions">{download.running && <button className="icon-button" title="停止后续下载" aria-label="停止后续下载" onClick={stopDownloads}><StopCircle size={17} /></button>}{!download.running && download.failed > 0 && <button className="quiet" onClick={retryFailed}>重试失败项</button>}</div>
      </section>}
      <section className="grid" aria-label="商品图片">
        {task.images.map((image, index) => <article className={`image-card ${selected.has(image.id) ? 'is-selected' : ''}`} key={image.id}>
          <button className="image-preview" onClick={() => setPreview(image)} aria-label={`预览第 ${index + 1} 张图片`}>
            <img src={image.url} loading="lazy" alt={`商品图片 ${index + 1}`} onError={() => setFailedImages((current) => new Map(current).set(image.id, '预览加载失败'))} />
          </button>
          <div className="card-footer"><label><input type="checkbox" checked={selected.has(image.id)} onChange={() => toggle(image.id)} /><span>图片 {String(index + 1).padStart(2, '0')}</span></label>{failedImages.has(image.id) && <span className="failed-tag" title={failedImages.get(image.id)}><X size={13} />失败</span>}{!failedImages.has(image.id) && <Check className="check-icon" size={15} />}</div>
        </article>)}
      </section>
    </>}

    {preview && <div className="lightbox" role="dialog" aria-modal="true" aria-label="图片预览" onClick={() => setPreview(undefined)}><button className="close-preview" aria-label="关闭预览" onClick={() => setPreview(undefined)}><X size={21} /></button><img src={preview.url} alt="商品图片大图" onClick={(event) => event.stopPropagation()} /></div>}
  </main>;
}
