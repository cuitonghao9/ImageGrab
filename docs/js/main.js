/* global document, window, navigator, URL */
(() => {
  'use strict';

  // 发布时填入真实 ZIP 地址（相对路径或 HTTPS）；保持空字符串时显示待发布提示。
  const DOWNLOAD_URL = '';
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#nav-links');
  const navLinks = [...menu.querySelectorAll('a')];
  const sections = navLinks.map((link) => document.querySelector(link.hash));
  const desktop = window.matchMedia('(min-width: 768px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toast = document.querySelector('#toast');
  let toastTimer;
  root.classList.add('js-ready');

  function notify(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 4500);
  }

  // 移动菜单：支持点击、Escape、外部点击与断点切换。
  function closeMenu(restoreFocus = false) {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', '展开导航菜单');
    menu.classList.remove('is-open');
    if (restoreFocus) menuButton.focus();
  }

  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '收起导航菜单' : '展开导航菜单');
    menu.classList.toggle('is-open', open);
  });
  navLinks.forEach((link) => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) closeMenu();
  });
  desktop.addEventListener('change', () => closeMenu());

  // 只在动画帧中读取滚动位置，并同步 aria-current。
  function updateNavigation() {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
    const offset = header.getBoundingClientRect().height + 100;
    let activeId = '';
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= offset) activeId = section.id;
    });
    navLinks.forEach((link) => {
      const active = link.hash === `#${activeId}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  let framePending = false;
  function queueNavigation() {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(() => {
      updateNavigation();
      framePending = false;
    });
  }
  window.addEventListener('scroll', queueNavigation, { passive: true });
  window.addEventListener('resize', queueNavigation);
  updateNavigation();

  // 元素进入视口后只播放一次；不支持观察器时直接显示内容。
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new window.IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    root.classList.add('reveal-ready');
    document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
  }

  // 首屏图库仅演示选图，不执行真实的页面提取或图片下载。
  const images = [...document.querySelectorAll('.demo-image')];
  const selectAll = document.querySelector('#select-all');
  function updateSelection() {
    const count = images.filter((image) => image.checked).length;
    const countText = document.querySelector('#selection-count');
    countText.replaceChildren('已选择 ');
    const strong = document.createElement('strong');
    strong.textContent = String(count);
    countText.append(strong, ' 张图片');
    document.querySelector('#download-count').textContent = `(${count})`;
    selectAll.textContent = count === images.length ? '取消全选' : '全选';
  }
  images.forEach((image) => image.addEventListener('change', updateSelection));
  selectAll.addEventListener('click', () => {
    const shouldSelect = !images.every((image) => image.checked);
    images.forEach((image) => { image.checked = shouldSelect; });
    updateSelection();
  });
  updateSelection();

  // file:// 或权限受限时，给出手动复制提示，地址始终可选择。
  document.querySelector('#copy-address').addEventListener('click', async () => {
    const address = 'chrome://extensions';
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(address);
      notify('地址已复制，请粘贴到 Chrome 地址栏。');
    } catch {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('.code-box code'));
      const selection = window.getSelection();
      if (selection) { selection.removeAllRanges(); selection.addRange(range); }
      notify('请手动复制 chrome://extensions，并粘贴到 Chrome 地址栏。');
    }
  });

  // 下载地址校验：仅允许本站相对资源或 HTTPS，防止误配置危险协议。
  const dialog = document.querySelector('#download-dialog');
  document.querySelectorAll('[data-download]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!DOWNLOAD_URL) {
        if (typeof dialog.showModal === 'function') {
          if (!dialog.open) dialog.showModal();
        } else notify('正式下载地址尚未公布，请稍后查看发布信息。');
        return;
      }
      const url = new URL(DOWNLOAD_URL, window.location.href);
      const relative = !/^(?:[a-z][a-z\d+.-]*:|\/\/|\\)/i.test(DOWNLOAD_URL);
      if (url.protocol !== 'https:' && !(relative && ['http:', 'file:'].includes(url.protocol))) {
        notify('下载地址暂不可用，请稍后重试。');
        return;
      }
      const link = document.createElement('a');
      link.href = url.href;
      link.download = 'ImageGrab.zip';
      document.body.append(link);
      link.click();
      link.remove();
    });
  });
  document.querySelector('#dialog-install').addEventListener('click', () => dialog.close());
  document.querySelector('#copyright-year').textContent = String(new Date().getFullYear());
})();
