# 电商商品图片提取器

Chrome Manifest V3 扩展 MVP：在淘宝、天猫、京东及拼多多商家版页面发现商品图片，在独立图库中预览、选择并将图片转换为 PNG 下载。所有图片处理均在本地进行。

## 项目结构

```text
public/manifest.json       扩展权限、匹配域名和后台配置
src/content/               右下角按钮与页面图片提取
src/background/            临时任务存储、图库标签页创建
src/gallery/               图片选择、预览和批量下载界面
src/shared/                平台适配器和消息类型
src/utils/                 URL 处理、去重、PNG 转换和命名
```

## 开发和构建

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

构建后在 Chrome 打开 `chrome://extensions`，启用“开发者模式”，点击“加载已解压的扩展程序”，选择项目的 `dist` 目录。可直接运行 `pnpm dev` 并打开 Vite 输出的图库地址预览界面；普通浏览器会进入预览模式，展示本地示例图片。扩展内的实际图片任务与下载需要在 Chrome 加载扩展后使用。

## 使用和测试

打开支持的商品详情页，点击页面右下角“获取图片”，在新打开的图库中全选、反选或勾选图片，再点击“下载选中”。当提取结果超过 1 张时，也可以点击“全部打包下载”，将全部发现的图片转为 PNG 后打入一个 ZIP；此操作不受当前勾选状态影响。支持 `item.taobao.com`、天猫商品页、`item.jd.com` 以及拼多多商家版 `mms.pinduoduo.com` 商品相关页面。测试也可在 `pnpm test` 执行的 jsdom 环境中验证平台域名适配和提取逻辑。`pnpm dev` 用于图库界面调试；Chrome 扩展完整流程请先执行 `pnpm build` 并加载 `dist`。

## 权限

- `activeTab`、`tabs`：打开图片图库标签页。
- `storage`：在扩展 session 存放临时图片 URL 列表。
- `downloads`：保存 PNG 图片。
- `host_permissions`：限于淘宝、天猫、京东、拼多多及其已知图片 CDN，供扩展页读取图片并完成 PNG 转换。

扩展不上传图片、不收集浏览历史、不包含广告或统计请求。

## 已知限制

- 平台 DOM 与商家版页面结构可能变化，提取选择器需要随页面迭代维护。
- 图片发现覆盖常见图片标签属性、srcset、行内背景图及 JSON-LD；任意脚本运行时状态并非都能可靠解析。
- CDN 防盗链、登录态、动态签名或未列入权限清单的图片域可能造成预览、转换或下载失败。可在 `public/manifest.json` 中谨慎添加实际 CDN 域名。
- 浏览器跨域策略、超大图片内存占用以及 Chrome 下载设置可能限制部分图片。
- MVP 暂未提供站点后台页面专属的非公开数据接口适配；只从当前可见页面和结构化数据提取。
