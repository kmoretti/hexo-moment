import { defineConfig } from 'swpp-backends'

/**
 * SWPP（Service Worker Plus Plus）配置文件。
 *
 * 设计原则：
 * - HTML 不缓存，确保内容实时性。
 * - 同源静态资源（JS/CSS/字体/图片）按更新频率设置 TTL。
 * - 跨域运行时接口（Twikoo、朋友圈、Live Dashboard）短时间缓存，兼顾离线回退。
 * - 带版本号的 CDN 资源（如 twikoo@x.x.x）视为稳定资源，长期缓存并配置备用 URL。
 */

defineConfig({
  compilationEnv: {
    // 站点基准域名，hexo-swpp 会自动覆盖，这里显式声明便于本地独立调试。
    DOMAIN_HOST: new URL('https://pyq.081531.xyz'),
    // 生成的 Service Worker 文件名为 /sw.js。
    SERVICE_WORKER: 'sw',
    // 放宽版本信息长度限制，避免文章增多后 update.json 被截断。
    VERSION_LENGTH_LIMIT: 512,
    // 判断拉取是否 404。部分静态托管对不存在的路径会 fallback 返回 HTML（200），
    // 这会导致 SWPP 首次构建时无法正确识别 tracker/update.json 不存在。
    // 因此对 /swpp/ 下的 JSON 元数据，若响应 Content-Type 为 HTML，按 404 处理。
    isNotFound: {
      response: (response) => {
        if (response.status === 404) return true
        const url = response.url || ''
        if (url.includes('/swpp/') && url.endsWith('.json')) {
          const type = response.headers.get('content-type') || ''
          if (type.includes('text/html')) return true
        }
        return false
      },
      error: (err) => err?.cause?.code === 'ENOTFOUND'
    }
  },
  crossEnv: {
    // 缓存库名称，与文档示例保持一致。
    CACHE_NAME: 'BlogCache',
    // 逃生门版本号。后续若需要强制清空用户缓存，修改此数字并重新部署即可。
    ESCAPE: 1,
    // 检查更新最短间隔 10 分钟（默认值）。
    UPDATE_CD: 600000,
  },
  crossDep: {
    // 缓存规则。注意 crossDep 中的函数项需直接传入 { runOnBrowser, runOnNode }，
    // 不能包在 { default: ... } 中（default 只用于声明缺省值）。
    matchCacheRule: {
      runOnBrowser: (url) => {
        let { host, pathname } = url
        // 处理以 / 结尾的 URL，便于统一判断 index.html。
        if (pathname.endsWith('/')) pathname += 'index.html'

        const isSelf = host === 'pyq.081531.xyz'

        if (isSelf) {
          // Service Worker 及 SWPP 元数据必须实时拉取，不能缓存。
          if (pathname === '/sw.js') return false
          if (pathname.startsWith('/swpp/')) return false
          // HTML 不缓存，避免用户看到旧内容。
          if (pathname.endsWith('.html')) return false
          // JSON（manifest、search.xml 等）短时缓存。
          if (pathname.endsWith('.json')) return 3600000 // 1 小时
          // 本地图片缓存 12 小时。
          if (/\.(webp|jpg|jpeg|png|gif|svg|ico|bmp)$/i.test(pathname)) {
            return 43200000 // 12 小时
          }
        }

        // 静态资源（JS/CSS/字体）跨域也缓存 2 天。
        if (/\.(js|css|woff2|woff|ttf|cur)$/i.test(pathname)) {
          return 172800000 // 2 天
        }

        // 带版本号的 jsdelivr/npm 资源视为稳定资源，长期缓存。
        if (/^(cdn|fastly)\.jsdelivr\.net$/i.test(host) &&
            /^\/npm\/[^/]+@[\d.]+\//i.test(pathname)) {
          return -1 // 永久缓存（跨域等效 24 小时）
        }

        // Twikoo 评论接口：短时缓存，在线优先，离线可回退旧数据。
        if (host === 'tg-pyq.081531.xyz') return 300000 // 5 分钟

        // 朋友圈接口。
        if (host === 'fc.081531.xyz' && pathname === '/all.json') {
          return 21600000 // 6 小时
        }

        // Live Dashboard 公开接口。
        if (host === 'live.081531.xyz' && /^\/api\/(current|config)$/.test(pathname)) {
          return 60000 // 1 分钟
        }

        // 其余资源不缓存。
        return false
      },
      runOnNode: (url) => {
        // 构建阶段复用浏览器端规则，确保前后端判断一致。
        let { host, pathname } = url
        if (pathname.endsWith('/')) pathname += 'index.html'

        const isSelf = host === 'pyq.081531.xyz'

        if (isSelf) {
          if (pathname === '/sw.js') return false
          if (pathname.startsWith('/swpp/')) return false
          if (pathname.endsWith('.html')) return false
          if (pathname.endsWith('.json')) return 3600000
          if (/\.(webp|jpg|jpeg|png|gif|svg|ico|bmp)$/i.test(pathname)) return 43200000
        }

        if (/\.(js|css|woff2|woff|ttf|cur)$/i.test(pathname)) return 172800000

        if (/^(cdn|fastly)\.jsdelivr\.net$/i.test(host) &&
            /^\/npm\/[^/]+@[\d.]+\//i.test(pathname)) {
          return -1
        }

        if (host === 'tg-pyq.081531.xyz') return 300000
        if (host === 'fc.081531.xyz' && pathname === '/all.json') return 21600000
        if (host === 'live.081531.xyz' && /^\/api\/(current|config)$/.test(pathname)) return 60000

        return false
      }
    }
  },
  runtimeDep: {
    // 备用 URL：jsdelivr 主站不可用时自动切换到国内镜像或 fastly。
    // 注意：runtimeDep 中默认值为 null 的项需要直接传入函数，不能包在 { default: ... } 中。
    getStandbyRequests: (request) => {
      const srcUrl = new URL(request.url)
      const { host, pathname } = srcUrl

      if (host === 'cdn.jsdelivr.net' && /^\/npm\/[^/]+@[\d.]+\//i.test(pathname)) {
        const mirrors = [
          `https://cdn.jsdmirror.com${pathname}`,
          `https://fastly.jsdelivr.net${pathname}`
        ]
        return {
          t: 2000,
          l: () => mirrors.map(it => new Request(it, request))
        }
      }

      return undefined
    }
  }
})
