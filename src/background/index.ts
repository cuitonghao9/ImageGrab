import type { ExtensionMessage, ExtensionResponse, GalleryTask } from '../shared/types';

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse: (response: ExtensionResponse) => void) => {
  if (message.type === 'OPEN_GALLERY') {
    const taskId = crypto.randomUUID();
    const task: GalleryTask = { id: taskId, platform: message.platform, pageUrl: message.pageUrl, images: message.images, createdAt: Date.now() };
    chrome.storage.session.set({ [`task:${taskId}`]: task }).then(() => {
      chrome.tabs.create({ url: chrome.runtime.getURL(`gallery.html?task=${encodeURIComponent(taskId)}`) })
        .then(() => sendResponse({ ok: true, taskId }))
        .catch((error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : '无法打开图库页面' }));
    }).catch((error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : '无法暂存图片列表' }));
    return true;
  }
  if (message.type === 'GET_TASK') {
    chrome.storage.session.get(`task:${message.taskId}`).then((result) => {
      const task = result[`task:${message.taskId}`] as GalleryTask | undefined;
      if (task) sendResponse({ ok: true, task });
      else sendResponse({ ok: false, error: '图片任务已过期，请返回商品页重新获取。' });
    }).catch(() => sendResponse({ ok: false, error: '读取图片任务失败' }));
    return true;
  }
  sendResponse({ ok: false, error: '不支持的消息' });
  return false;
});
