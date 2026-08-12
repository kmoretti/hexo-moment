# Paper Moments / 纸间日常

一个中文 Hexo 站点与独立主题，使用纸张/手账风格展示来自 Telegram 频道的日常说说。

## 已有功能

- 纸张手账视觉、浅色/深色/跟随系统主题与响应式导航
- `/shuoshuo/`：Telegram 说说流、搜索/标签筛选、reaction、媒体灯箱与引用评论
- `/gallery/`：相册目录、公开/密码提示门相册、图片/视频灯箱
- `/comment/`：独立留言板、可展开纸笺与桌面端 Twikoo 留言弹幕
- `/link/`、`/fcircle/`、`/about/` 等页面
- 本地 Lucide/Font Awesome Brands SVG sprite、PJAX 与 PWA 页面壳缓存

## 开发

```bash
pnpm install
pnpm run dev
```

构建静态站点：

```bash
pnpm run build
```

## 部署到 Cloudflare Pages

本项目是纯静态 Hexo 站点，可通过 Cloudflare Pages 的 Git 集成自动构建和发布。先将 `tg-pyq` 目录推送到 GitHub 或 GitLab 仓库；若它位于仓库子目录，部署时需要把该子目录设为 **Root directory**。

1. 在 Cloudflare 控制台打开 **Workers & Pages**，选择 **Create application** > **Pages** > **Import an existing Git repository**，然后连接站点仓库。
2. 在构建设置中填写以下值：

   | 设置项 | 值 |
   | --- | --- |
   | Production branch | 存放生产站点的分支，例如 `main` |
   | Build command | `pnpm run build` |
   | Build output directory | `public` |
   | Root directory | `tg-pyq`（仅当它是仓库子目录时填写） |

3. 在项目的 **Settings** > **Environment variables** 中设置 `NODE_VERSION` 为本地实际使用且受 Hexo 7 支持的 Node.js LTS 版本。`package.json` 已锁定 `pnpm@10.30.3`，Pages 会依据该字段安装对应的包管理器。
4. 点击 **Save and Deploy**。后续推送到生产分支会自动重新构建并发布；拉取请求或其他分支可生成预览部署。

首次部署后，先在 Pages 的 **Custom domains** 中绑定自己的域名，然后将 [`_config.yml`](./_config.yml) 的 `url` 改为该域名的完整 HTTPS 地址，例如 `https://blog.example.com`，并保持 `root: /`。提交配置后等待下一次构建完成。这个设置影响站点 canonical URL、RSS、PWA manifest 与 Service Worker 的资源地址。

部署完成后应检查首页、`/shuoshuo/`、`/gallery/`、`/comment/` 是否能正常打开，并确认浏览器已在 HTTPS 下注册 Service Worker。Pages 只发布 `public/` 生成结果；Telegram 说说、朋友圈、评论与远程媒体仍由浏览器在运行时请求，因此相关 API 必须允许你的 Pages 域名跨域访问。

## 主题配置

站点个性化配置位于根目录 [`_config.paper-moments.yml`](./_config.paper-moments.yml)。站点级 Hexo、Twikoo 地址和插件配置在 [`_config.yml`](./_config.yml)。

### 图标

主题使用本地 SVG icon registry：**通用界面图标默认使用 [Lucide](https://lucide.dev)**；GitHub、Telegram、Bilibili 等品牌图标兼容 **Font Awesome Free 6 Brands**。构建时仅把模板与配置中实际用到的 symbol 输出到站点根目录的 `/icons.svg`，因此不依赖外部图标 CDN，也兼容 PJAX、PWA 和离线访问。

导航或配置中的普通图标直接写 Lucide 名称，例如：

```yaml
navigation:
  - name: 留言板
    path: /comment/
    icon: message-circle
```

品牌图标可写 `github`、`telegram` 等别名，或显式写 `fa-brands:github`。

### Twikoo 1.7.15

当前示例使用 Twikoo 云函数：

```yaml
twikoo:
  env_id: https://tg-pyq.081531.xyz/
  version: 1.7.15
  lang: zh-CN
```

主题会固定加载对应版本的官方资源：

```text
https://cdn.jsdelivr.net/npm/twikoo@1.7.15/dist/twikoo.css
https://cdn.jsdelivr.net/npm/twikoo@1.7.15/dist/twikoo.all.min.js
```

若要切换自己的服务，只需修改 `twikoo.env_id`；`version` 应保持明确的三段版本号，不要使用 `latest`。评论客户端由 `source/js/comments.js` 单例加载，因此从 PJAX 页面反复进入说说或留言板时不会重复插入 CDN 脚本。

- `/shuoshuo/` 的引用评论仍使用 `comments.path`（默认 `/shuoshuo/`）；
- `/comment/` 使用 `comment_board.path`（默认 `/comment/`）；
- 两个 path 是独立 Twikoo 线程，不会互相混合。

Twikoo 没有稳定公开的编辑器预填 API。主题会先尝试写入说说页文本框；若当前 Twikoo DOM 不匹配，则复制引用到剪贴板并提示粘贴。

### 留言板与弹幕

`/comment/` 的全部可编辑文案、独立评论 path 与弹幕参数都位于 `_config.paper-moments.yml` 的 `comment_board`：

```yaml
comment_board:
  path: /comment/
  title: 留一页话给我
  description: 想说的话，都会被好好收进这本手账。
  letter_lines:
    - 这本小小的手账，也想听见你的声音。
  danmaku:
    enable: true
    desktop_only: true
    page_size: 50
    include_replies: true
    max_text_length: 42
```

页面现在使用 AIOVTUE 固定参考提交 `d1110c265445b26a42c9cd05fb1841f35618b4f6` 的四张信封资源：`before.png`、`after.png`、`cover.png`、`line.png`。它们已按原始尺寸和层级自托管在 `source/comment/envelope/`，并通过 `form-wrap` 的 `447px → 1050px` 展开模型还原桌面信封；这是视觉还原所必需的资源，不是运行时外部 CDN。本站仍保留自己的 Paper Moments 页面标题、Twikoo path、PJAX 和安全纯文本弹幕逻辑。

弹幕仅在桌面端、在线且未启用系统“减少动态效果”时运行；它只读取 `/comment/` 线程最近 `page_size` 条公开主留言和可选回复。留言 HTML 会转为纯文本、按 Unicode 字符截断并通过 `textContent` 写入，不会把评论中的 HTML、链接或图片作为弹幕执行。可以用页面的“暂停弹幕 / 继续弹幕”按钮控制播放；移动端、离线、`prefers-reduced-motion` 下会退化为静态纸笺和正常评论区。

Twikoo 评论浏览请求可使用现有 Workbox `NetworkFirst` runtime cache 回退到最近缓存；**发布留言始终需要联网**，不会缓存或后台重放 POST 请求。浏览器可能在本机保存公开评论缓存最多 7 天。

### 相册

相册配置集中位于根目录 `_config.paper-moments.yml` 的 `gallery.albums`。每个相册会生成独立地址 `/gallery/<slug>/`，并按 YAML 中的顺序显示在 `/gallery/` 目录页。媒体同时支持本地文件和远程 HTTPS URL：

```yaml
gallery:
  albums:
    - slug: spring-2026
      title: 春日随拍
      description: 三月到五月的零散记录。
      date: 2026-05-31
      access: public # public 或 password
      # 本地媒体放到 source/gallery/media/spring-2026/ 后，用站点根路径引用。
      cover: /gallery/media/spring-2026/cover.webp
      items:
        - url: /gallery/media/spring-2026/01.webp
          type: image # image 或 video；省略时会按扩展名识别
          alt: 窗边的一盆绿植
          date: 2026-05-12
          caption: 下午四点的光。
```

详情页会按拍摄月份分段。图片和视频缩略图使用原生懒加载；点击后进入共用媒体灯箱，支持上一项/下一项、计数、底部缩略图、键盘 `←`/`→`/`Esc`、遮罩关闭、触屏横滑、原媒体新窗口链接。图片额外支持双击、滚轮和双指缩放（最高 4 倍）及放大后拖拽；视频使用原生播放控件。

#### 前端密码提示门

若 `access: password`，请只保存 SHA-256 哈希，不要把明文写进配置：

```yaml
access: password
password_hash: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
```

可用 Node 生成哈希：

```bash
node -e "const crypto=require('crypto'); process.stdout.write(crypto.createHash('sha256').update(process.argv[1]).digest('hex')+'\n')" "你的密码"
```

解锁状态只保留在当前浏览器会话。**这是静态站的提示门，不是访问控制**：媒体 URL 仍会出现在生成页面中；若需要真正私密的原图，请使用带鉴权或签名 URL 的外部存储。

本项目的首批样例媒体直接引用 [AIOVTUE 相册](https://daily.yybb.us/gallery/) 当前公开的远程 URL，未下载或再发布原图/视频。每个样例相册详情页和本说明都会给出来源链接；其可用性取决于上游托管。替换成自己的素材后，可删除对应的 `source_attribution` 字段。

PWA 预缓存页面壳、CSS 和脚本，但会刻意忽略 `source/gallery/media/**` 下的本地原图/视频，避免首次安装 Service Worker 时下载大量媒体；远程媒体也不由 Workbox 强制缓存。

### 朋友圈文章流

`/fcircle/` 使用 [Friend-Circle-Lite](https://github.com/kmoretti/Friend-Circle-Lite) 兼容的 `all.json` 数据，不在构建时抓取远程内容。默认配置使用自部署服务：

```yaml
fcircle:
  data_url: https://fc.081531.xyz/all.json
  page_size: 20
```

运行时会仅接受 HTTP(S) 数据地址和文章链接，跳过缺标题、链接不安全或重复的文章，并按发布时间倒序展示。文章标题和头像都使用 DOM API 写入，外链会在新标签页打开。访问成功后，PWA 通过 `NetworkFirst` 缓存最近一次朋友圈数据（有效期 6 小时）；离线时可回退到该缓存，首次离线则显示正常的加载失败提示。

导航配置位于 `_config.paper-moments.yml` 的 `navigation`。普通条目继续使用 `name/path/icon`；需要下拉菜单时添加 `children`：

```yaml
- name: 友人
  icon: link
  children:
    - name: 友链
      path: /link/
```

## PWA

`hexo-offline` 根据 [`hexo-offline.config.cjs`](./hexo-offline.config.cjs) 生成 Service Worker。新增 HTML、CSS、JavaScript 会自动预缓存为离线页面壳；远程说说、朋友圈、Twikoo 和图片等数据仍按各自 runtime cache/网络策略处理。

## 许可证

本项目主题代码为 MIT；主题视觉借鉴 FlatPaper 的纸张、便签与手账语汇，但未复制其模板或资源。数据插件 `hexo-bb-channel` 和 Twikoo 保持各自的上游许可证与运行方式。
