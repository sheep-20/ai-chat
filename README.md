# Time Echo

Time Echo（时间回声）是一个本地运行的 AI 角色陪伴聊天应用。前端使用 React/Vite，开发模式下会同时启动一个本地 Node 服务，用 SQLite 文件保存用户资料、聊天记录、图鉴解锁、熟悉度和陪伴日志。

## 功能概览

- 多世界角色聊天：每个世界有独立 NPC、世界观、开场白、系统提示词和知识图鉴。
- 首次引导流程：API 设置 → 艾希世界观载入 → 用户资料 → 世界选择。
- 用户资料：可编辑称呼、性格、偏好世界、互动方式、剧情边界和长期偏好。
- 情绪识别：用户发送消息后会识别当前心情，并把情绪支持策略注入角色回复。
- 记忆分层：短期对话、长期用户偏好和世界羁绊经历会分层沉淀，让角色后续能自然接上关系。
- 本地 SQLite 存储：数据写入 `data/time-echo.sqlite`，不再保存到浏览器 `localStorage`。
- 陪伴日志：退出对话时调用大模型生成本次对话总结；失败时使用本地兜底总结。
- 同源 API：浏览器只请求本地 `/api/*` 和 `/api-proxy/*`，API Key 由本地后端读取。

## 环境要求

- Node.js 24 或更高版本。
  - 当前实现使用 Node 24 的 `node:sqlite`。
- npm。

## 快速启动

安装依赖：

```powershell
npm install
```

复制环境变量文件：

```powershell
Copy-Item .env.example .env
```

编辑 `.env`，填写 DeepSeek 配置：

```env
VITE_DEEPSEEK_API_KEY=sk-...
VITE_DEEPSEEK_API_BASE_URL=https://api.deepseek.com/v1
```

启动本地应用：

```powershell
npm run dev
```

打开：

```text
http://127.0.0.1:5173
```

`npm run dev` 会启动 `scripts/dev-server.mjs`，它会：

- 创建或打开 `data/time-echo.sqlite`。
- 提供本地 `/api/*` 数据接口。
- 提供 `/api-proxy/chat/completions` 模型代理。
- 挂载 Vite 开发中间件渲染前端页面。

## API Key 和本地数据

API Key 有两种来源：

- `.env` 中的 `VITE_DEEPSEEK_API_KEY`，优先级最高。
- 页面设置中手动填写的 Key，会保存到 `data/time-echo.sqlite`。

SQLite 数据文件默认位置：

```text
data/time-echo.sqlite
```

`data/` 已加入 `.gitignore`，不会提交到仓库。

如果需要重置本地数据，可以停止开发服务后删除单个 SQLite 文件：

```powershell
Remove-Item -LiteralPath "C:\Users\Uniqu\Desktop\ai-chat\data\time-echo.sqlite"
```

不要删除整个 `data` 目录。

## 常用脚本

```powershell
npm run dev
```

启动本地 Node + Vite + SQLite 开发服务。

```powershell
npm run build
```

执行 TypeScript 检查并构建生产文件。

```powershell
npm run preview
```

预览生产构建结果。注意：`preview` 只预览静态产物，不会替代本地 SQLite API 服务。

## 主要目录

```text
.
├── scripts/dev-server.mjs      # 本地 Node API、SQLite、Vite 中间件
├── data/time-echo.sqlite       # 本地数据文件，运行后自动创建
├── src
│   ├── App.tsx                 # 首次流程和页面切换
│   ├── components
│   │   ├── IntroStoryGate.tsx  # 艾希世界观引导
│   │   ├── UserProfileGate.tsx # 用户资料编辑
│   │   ├── WorldSelectPage.tsx # 世界选择
│   │   ├── WorldCard.tsx       # 世界卡片
│   │   ├── ChatPage.tsx        # 聊天和陪伴日志生成
│   │   └── CompanionJournalPanel.tsx
│   ├── utils
│   │   ├── storage.ts          # 前端本地 API 客户端
│   │   ├── ai.ts               # 流式模型响应解析
│   │   └── companionship.ts    # 熟悉度、主题和兜底总结
│   └── worlds                  # 世界配置和知识卡片
```

## 本地 API

开发服务提供以下接口：

- `GET/PUT /api/profile`
- `GET/PUT /api/settings`
- `GET/POST /api/messages/:worldId`
- `GET/POST /api/unlocked/:worldId`
- `GET/POST /api/familiarity/:worldId`
- `GET/POST /api/companion-logs/:worldId`
- `POST /api/companion-logs/:worldId/generate-summary`
- `POST /api/emotion/analyze`
- `GET/POST /api/emotion/:worldId`
- `GET/PUT /api/memory/user`
- `GET/PUT /api/memory/world/:worldId`
- `GET/PUT /api/memory/short-term/:worldId`
- `POST /api/memory/extract`
- `POST /api/memory/bond-event/:worldId`
- `POST /api-proxy/chat/completions`

前端不直接访问上游模型 API，也不在浏览器保存 API Key。

## 记忆分层

应用会把陪伴上下文分为三层并写入本地 SQLite：短期对话记忆、长期用户偏好、世界专属羁绊记忆。ChatPage 在生成回复前读取这些记忆并注入 system prompt，让角色自然延续用户偏好和世界经历；退出对话后会从陪伴日志、情绪轨迹、图鉴解锁和熟悉度变化中抽取记忆；完成羁绊事件后会立即写入对应世界的羁绊记忆。

## 情绪识别与个性化陪伴

用户每次发送消息时，本地后端会先调用同一个 Chat Completions 模型做一次短 JSON 情绪分析。分析结果包括：

- `mood`：低落、焦虑、愤怒、疲惫、孤独、开心、平静、困惑、危机风险或未知。
- `intensity`：情绪强度，1 到 5。
- `confidence`：识别置信度。
- `signals`：触发判断的文本线索。
- `supportStrategy`：给角色的回复策略。

如果模型分析失败，后端会使用关键词启发式兜底，保证聊天流程不中断。最近情绪轨迹会写入 SQLite，并在下一次回复时作为上下文参与提示词，但默认不会在界面中显示诊断式标签。

用户资料中的以下字段会参与 AI 回复：

- 称呼方式
- 用户自设性格
- 偏好世界/题材
- 喜欢的互动方式
- 情绪低落时希望被怎样陪伴
- 剧情边界与雷区
- 长期偏好备注

当识别到危机风险时，角色会优先进行安全支持，暂停沉浸式剧情推进，并建议用户联系现实中的可信任对象、当地紧急服务或危机支持资源。

## 添加新世界

每个世界由配置文件和知识卡片组成：

- `src/worlds/worldX/index.ts`
- `src/worlds/worldX/knowledge.ts`

新增世界时需要：

1. 新增 `worldX` 目录和两个文件。
2. 在 `src/worlds/index.ts` 注册到 `WORLDS`。
3. 设置 `seriesId`、`order`、`npcIcon`、`available` 等字段。
4. 如需新增分类，在 `src/worlds/series.ts` 中添加。

世界卡片左上角显示分类名，角色头像使用 `npcIcon` 图案字段。

## 注意事项

- `.env` 和真实 API Key 不应提交。
- `data/time-echo.sqlite` 是本地状态文件，不应提交。
- 若聊天请求失败，先确认 `npm run dev` 正在运行，并检查 `.env` 或页面设置里的 API Key。
- 如果使用页面手动填写 API Key，Key 只保存在本地 SQLite 文件。
