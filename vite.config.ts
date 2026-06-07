import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { HttpsProxyAgent } from 'https-proxy-agent'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_BASE_URL || 'https://api.deepseek.com/v1'

  // 梯子本地代理地址：优先读 .env 里的 VITE_LOCAL_PROXY，默认 Clash 的 7890 端口
  // 如果你用的不是 Clash，把 7890 改成你的软件对应端口：
  //   Surge → 6152   Shadowrocket → 1086   V2RayU → 1081
  const localProxy = env.VITE_LOCAL_PROXY || 'http://127.0.0.1:7890'

  console.log(`[vite] API 目标: ${apiTarget}`)
  console.log(`[vite] 本地代理: ${localProxy}`)

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api-proxy': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api-proxy/, ''),
          agent: new HttpsProxyAgent(localProxy),
        },
      },
    },
  }
})
