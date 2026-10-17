import { extractImages } from './extract';
import { isSupportedProductPage } from '../shared/platforms';

const ROOT_ID = 'commerce-image-grabber-root';

function mountButton(): void {
  if (!isSupportedProductPage(location.href)) return;
  if (document.getElementById(ROOT_ID)) return;
  const host = document.createElement('div');
  host.id = ROOT_ID;
  host.style.cssText = 'all:initial;position:fixed;right:24px;bottom:24px;z-index:2147483647;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host{all:initial}.button{font:600 14px/1.2 system-ui,sans-serif;color:#fff;background:#147d68;border:0;border-radius:6px;padding:13px 18px;box-shadow:0 5px 18px #102b2838;cursor:pointer;transition:background .15s,transform .15s}
    .button:hover{background:#0f6857;transform:translateY(-1px)}.button:focus-visible{outline:3px solid #9ce5d3;outline-offset:3px}.button[disabled]{opacity:.7;cursor:wait}
  `;
  const button = document.createElement('button');
  button.className = 'button';
  button.type = 'button';
  button.textContent = '获取图片';
  button.setAttribute('aria-label', '获取当前商品页面图片');
  button.addEventListener('click', () => {
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = '正在提取…';
    try {
      const { platform, images } = extractImages(document, location.href);
      chrome.runtime.sendMessage({ type: 'OPEN_GALLERY', platform, pageUrl: location.href, images }, (response) => {
        if (chrome.runtime.lastError || !response?.ok) {
          button.textContent = '提取失败，重试';
          button.disabled = false;
          return;
        }
        button.textContent = `已获取 ${images.length} 张`;
        window.setTimeout(() => { button.textContent = '获取图片'; button.disabled = false; }, 1800);
      });
    } catch {
      button.textContent = '提取失败，重试';
      button.disabled = false;
    }
  });
  shadow.append(style, button);
  document.documentElement.append(host);
}

mountButton();
// SPA 页面会在不重新加载的情况下切换商品，按钮由观察器重新挂载。
new MutationObserver(() => {
  const existing = document.getElementById(ROOT_ID);
  if (!isSupportedProductPage(location.href)) { existing?.remove(); return; }
  if (!existing && document.documentElement) mountButton();
}).observe(document.documentElement, { childList: true });
