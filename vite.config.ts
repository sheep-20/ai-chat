import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { HttpsProxyAgent } from 'https-proxy-agent'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_DEEPSEEK_API_BASE_URL || env.VITE_API_BASE_URL || 'https://api.deepseek.com/v1'

  // 本地代理地址：仅在 .env 显式配置 VITE_LOCAL_PROXY 时启用。
  // 如果你用的不是 Clash，把 7890 改成你的软件对应端口：
  //   Surge → 6152   Shadowrocket → 1086   V2RayU → 1081
  const localProxy = env.VITE_LOCAL_PROXY?.trim()

  console.log(`[vite] DeepSeek API 目标: ${apiTarget}`)
  console.log(`[vite] 本地代理: ${localProxy || '未启用'}`)

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api-proxy': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api-proxy/, ''),
          ...(localProxy ? { agent: new HttpsProxyAgent(localProxy) } : {}),
        },
      },
    },
  }
})
