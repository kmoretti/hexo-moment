// hexo-offline 配置（workbox-build generateSW 参数）。
// 参考安知鱼主题的 PWA 方案：预缓存全部静态资源，实现页面壳离线可用。
// 远程数据（说说/友链/赞助/头像）遵循"仅页面离线，数据需在线"；
// 评论区（Twikoo）浏览走缓存、发布需联网。
module.exports = {
  skipWaiting: true,
  clientsClaim: true,
  globPatterns: [
    '**/*.{js,mjs,html,css,png,jpg,jpeg,gif,webp,svg,eot,ttf,woff,woff2,ico,json,webmanifest}',
  ],
  // 忽略由 Hexo 构建过程产生的临时/元文件。
  globIgnores: [
    '**/.DS_Store',
    '**/*.map',
    // 本地原图/视频可能较大；保留页面壳离线，不在 SW 安装时预下载相册媒体。
    'gallery/media/**',
  ],
  runtimeCaching: [
    // Friend-Circle-Lite 数据：在线时优先取新文章；已成功读取过时，离线可退回最近缓存。
    {
      urlPattern: /^https:\/\/fc\.081531\.xyz\/all\.json(?:\?.*)?$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'friend-circle-feed',
        expiration: {
          maxEntries: 2,
          maxAgeSeconds: 6 * 60 * 60,
        },
        networkTimeoutSeconds: 5,
      },
    },
    // Twikoo 评论区：浏览已加载过的评论走缓存（先网后缓存，5s 超时回退），发布（写请求）仍走网络。
    {
      urlPattern: /^https:\/\/tg-pyq\.081531\.xyz\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'twikoo-comments',
        expiration: {
          maxEntries: 80,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
        networkTimeoutSeconds: 5,
      },
    },
    // Twikoo 客户端脚本（jsdelivr CDN），版本化资源，缓存优先。
    {
      urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/twikoo@[^/]+\/dist\/.*\.(js|css)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'twikoo-assets',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
    // Live Dashboard 公开接口：在线优先，离线可回退缓存，保证 PWA 离线也能看到最近状态。
    {
      urlPattern: /^https:\/\/live\.081531\.xyz\/api\/(current|config)(?:\?.*)?$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'live-dashboard-api',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 24 * 60 * 60,
        },
        networkTimeoutSeconds: 6,
      },
    },
  ],
};
