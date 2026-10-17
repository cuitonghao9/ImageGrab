# 图提取 / ImageGrab 宣传官网

页面顺序：顶部导航 → 产品首屏与交互图库 → 产品介绍 → 六项核心功能 → 四步安装 → 下载 CTA → 页脚。

设计采用浅色背景、蓝紫色渐变、圆角卡片与本地 SVG 商品示意图。手机为单列，768px 起显示平板布局，1024px 起显示桌面布局。网站不请求外部字体、图片或脚本。

## 直接预览

双击本目录中的 `index.html` 即可，无需安装依赖、启动服务或构建。图库支持勾选与全选，作为界面演示，不执行真实商品页提取。

## 修改内容

- 主色：修改 `css/style.css` 顶部 `:root` 中的 `--primary`、`--primary-deep`、`--primary-light` 和 `--primary-soft`。
- 文案：直接编辑 `index.html` 中对应区块，保留导航关联的 `id`。
- 下载：将真实安装包放入 `assets/`，再修改 `js/main.js` 的 `DOWNLOAD_URL`，例如 `assets/ImageGrab.zip`；也支持 HTTPS 下载地址。目前留空，点击后显示待发布提示。
- GitHub：将页脚 GitHub 链接的 `href` 替换为真实项目地址，再更新「项目地址待公布」文字。
- 本地复制：部分浏览器限制 `file://` 下的剪贴板，页面会选中地址并给出手动复制提示。

## 开发校验

仅开发测试复用上层插件项目已经安装的 `jsdom` 和 `postcss`，静态官网运行不需要这些依赖。从项目根目录执行：

```bash
node --check docs/js/main.js
node --test docs/tests/site.test.mjs
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

测试覆盖内部锚点、本地资源、CSS 解析、菜单、图库选择、导航高亮、滚动动画、减少动态效果偏好、复制降级与下载地址校验。jsdom 不执行真实布局，不能替代浏览器视觉检查。
