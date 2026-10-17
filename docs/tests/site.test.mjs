import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { createRequire } from 'node:module';
import { setImmediate as flushTasks } from 'node:timers/promises';
import test from 'node:test';
import { JSDOM } from 'jsdom';

// 复用项目已有依赖，不给静态官网增加运行时依赖。
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const projectRequire = createRequire(import.meta.url);
const viteRequire = createRequire(projectRequire.resolve('vite'));
const postcss = viteRequire('postcss');

function setup(options = {}) {
  const dom = new JSDOM(html, {
    url: 'file:///imagegrab/docs/index.html',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const { document } = window;
  const media = new Map();
  window.matchMedia = (query) => {
    if (!media.has(query)) {
      const listeners = [];
      media.set(query, {
        matches: query.includes('reduced-motion') ? Boolean(options.reducedMotion) : false,
        addEventListener: (_type, listener) => listeners.push(listener),
        change() { listeners.forEach((listener) => listener()); },
      });
    }
    return media.get(query);
  };
  window.requestAnimationFrame = (callback) => { callback(); return 1; };
  document.querySelector('.site-header').getBoundingClientRect = () => ({ height: 80 });
  const tops = [500, 1000, 1500, 2000];
  ['about', 'features', 'install', 'download'].forEach((id, index) => {
    document.getElementById(id).getBoundingClientRect = () => ({ top: tops[index] });
  });
  let observer;
  if (options.observer) {
    window.IntersectionObserver = class {
      constructor(callback) { this.callback = callback; this.observed = new Set(); observer = this; }
      observe(element) { this.observed.add(element); }
      unobserve(element) { this.observed.delete(element); }
    };
  }
  const dialog = document.querySelector('dialog');
  if (options.dialog !== false) {
    dialog.showModal = () => { dialog.open = true; };
    dialog.close = () => { dialog.open = false; };
  }
  window.eval(options.script || script);
  return { dom, window, document, media, tops, getObserver: () => observer };
}

test('语义结构、内部锚点、本地资源、SVG 引用均完整', () => {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  assert.equal(doc.documentElement.lang, 'zh-CN');
  assert.equal(doc.querySelectorAll('h1').length, 1);
  assert.equal(doc.querySelectorAll('.feature-card').length, 6);
  assert.equal(doc.querySelectorAll('.steps li').length, 4);
  assert.ok(doc.querySelector('header nav') && doc.querySelector('main') && doc.querySelector('footer'));
  const ids = [...doc.querySelectorAll('[id]')].map((element) => element.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const anchor of doc.querySelectorAll('a[href^="#"], use[href^="#"]')) {
    assert.ok(doc.getElementById(anchor.getAttribute('href').slice(1)), anchor.outerHTML);
  }
  for (const resource of doc.querySelectorAll('link[href], script[src]')) {
    const path = resource.getAttribute('href') || resource.getAttribute('src');
    assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), path);
  }
  assert.equal(doc.querySelectorAll('[src^="http"], link[href^="http"]').length, 0);
  assert.equal(doc.querySelector('.nav-links .button').getAttribute('href'), 'assets/ImageGrab.zip');
  assert.ok(doc.querySelector('.nav-links .button').hasAttribute('download'));
  assert.equal(doc.querySelector('[data-download]').getAttribute('href'), 'assets/ImageGrab.zip');
  assert.ok(doc.querySelector('[data-download]').hasAttribute('download'));
  assert.equal(script.includes("const DOWNLOAD_URL = 'assets/ImageGrab.zip';"), true);
  dom.window.close();
});

test('CSS 可解析，包含手机默认布局、两档断点与减少动态效果适配', () => {
  const ast = postcss.parse(css, { from: fileURLToPath(new URL('../css/style.css', import.meta.url)) });
  const media = [];
  ast.walkAtRules('media', (rule) => media.push(rule.params));
  assert.ok(media.includes('(min-width: 768px)'));
  assert.ok(media.includes('(min-width: 1024px)'));
  assert.ok(media.includes('(prefers-reduced-motion: reduce)'));
  assert.ok(!css.includes('@import') && !css.includes('url(http'));
});

test('无脚本或无 IntersectionObserver 时内容不会被隐藏', () => {
  const plain = new JSDOM(html);
  assert.equal(plain.window.document.documentElement.className, '');
  plain.window.close();
  const app = setup();
  assert.equal(app.document.documentElement.classList.contains('reveal-ready'), false);
  app.dom.window.close();
});

test('菜单展开、Escape 恢复焦点、链接收起、外部点击、断点切换', () => {
  const app = setup();
  const { document: doc, window } = app;
  const toggle = doc.querySelector('.menu-toggle');
  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  toggle.click();
  assert.equal(isOpen(), true);
  assert.ok(doc.querySelector('#nav-links').classList.contains('is-open'));
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(isOpen(), false);
  assert.equal(doc.activeElement, toggle);
  toggle.click();
  doc.querySelector('#nav-links a').click();
  assert.equal(isOpen(), false);
  toggle.click();
  doc.querySelector('h1').click();
  assert.equal(isOpen(), false);
  toggle.click();
  app.media.get('(min-width: 768px)').change();
  assert.equal(isOpen(), false);
  app.dom.window.close();
});

test('图库初始计数、全选、取消全选、单图变更均同步', () => {
  const app = setup();
  const { document: doc, window } = app;
  const all = doc.querySelector('#select-all');
  assert.equal(doc.querySelector('#download-count').textContent, '(4)');
  all.click();
  assert.equal(doc.querySelectorAll('.demo-image:checked').length, 6);
  assert.equal(all.textContent, '取消全选');
  all.click();
  assert.equal(doc.querySelectorAll('.demo-image:checked').length, 0);
  assert.equal(doc.querySelector('#download-count').textContent, '(0)');
  const first = doc.querySelector('.demo-image');
  first.checked = true;
  first.dispatchEvent(new window.Event('change'));
  assert.equal(doc.querySelector('#selection-count strong').textContent, '1');
  app.dom.window.close();
});

test('滚动导航只有一个当前区块，返回顶部后清除高亮', () => {
  const app = setup();
  app.tops[0] = -600;
  app.tops[1] = 80;
  Object.defineProperty(app.window, 'scrollY', { value: 1000, configurable: true });
  app.window.dispatchEvent(new app.window.Event('scroll'));
  assert.equal(app.document.querySelector('[aria-current]').hash, '#features');
  assert.equal(app.document.querySelectorAll('[aria-current]').length, 1);
  assert.ok(app.document.querySelector('.site-header').classList.contains('is-scrolled'));
  app.tops[0] = 500;
  app.tops[1] = 1000;
  app.window.dispatchEvent(new app.window.Event('scroll'));
  assert.equal(app.document.querySelectorAll('[aria-current]').length, 0);
  app.dom.window.close();
});

test('进入视口后显现并取消观察，不相交时保持原状态', () => {
  const app = setup({ observer: true });
  const observer = app.getObserver();
  const element = app.document.querySelector('[data-reveal]');
  observer.callback([{ target: element, isIntersecting: false }]);
  assert.equal(element.classList.contains('is-visible'), false);
  observer.callback([{ target: element, isIntersecting: true }]);
  assert.equal(element.classList.contains('is-visible'), true);
  assert.equal(observer.observed.has(element), false);
  app.dom.window.close();
});

test('减少动态效果偏好下不创建隐藏动画', () => {
  const app = setup({ observer: true, reducedMotion: true });
  assert.equal(app.getObserver(), undefined);
  assert.equal(app.document.documentElement.classList.contains('reveal-ready'), false);
  app.dom.window.close();
});

test('本地剪贴板不可用时选中地址并说明手动复制', async () => {
  const app = setup();
  app.document.querySelector('#copy-address').click();
  await flushTasks();
  assert.equal(app.window.getSelection().toString(), 'chrome://extensions');
  assert.match(app.document.querySelector('#toast').textContent, /手动复制/);
  app.dom.window.close();
});

test('获得剪贴板权限时可复制地址；拒绝权限后降级提示', async () => {
  const app = setup();
  let copied;
  Object.defineProperty(app.window, 'isSecureContext', { value: true });
  Object.defineProperty(app.window.navigator, 'clipboard', {
    value: { writeText: async (value) => { copied = value; } }, configurable: true,
  });
  app.document.querySelector('#copy-address').click();
  await flushTasks();
  assert.equal(copied, 'chrome://extensions');
  assert.match(app.document.querySelector('#toast').textContent, /已复制/);
  app.window.navigator.clipboard.writeText = async () => { throw new Error('Denied'); };
  app.document.querySelector('#copy-address').click();
  await flushTasks();
  assert.match(app.document.querySelector('#toast').textContent, /手动复制/);
  app.dom.window.close();
});

test('危险下载协议被阻止，不创建下载链接', () => {
  const app = setup({ script: script.replace("const DOWNLOAD_URL = 'assets/ImageGrab.zip';", "const DOWNLOAD_URL = 'javascript:alert(1)';") });
  app.document.querySelector('[data-download]').click();
  assert.match(app.document.querySelector('#toast').textContent, /暂不可用/);
  assert.equal(app.document.querySelectorAll('a[download]').length, 0);
  app.dom.window.close();
});

test('同源 ZIP 地址触发下载后移除临时链接', () => {
  for (const address of ['assets/ImageGrab.zip']) {
    const app = setup({ script: script.replace("const DOWNLOAD_URL = 'assets/ImageGrab.zip';", `const DOWNLOAD_URL = '${address}';`) });
    let download;
    app.window.HTMLAnchorElement.prototype.click = function () {
      download = { href: this.href, name: this.download };
    };
    app.document.querySelector('[data-download]').click();
    assert.equal(download.name, 'ImageGrab.zip');
    assert.ok(download.href.endsWith('/ImageGrab.zip'));
    assert.equal(app.document.querySelectorAll('a[download]').length, 0);
    app.dom.window.close();
  }
});
