# Time Echo

Time Echo（时间回声）是一个本地运行的 AI 角色陪伴聊天平台。项目以 React/Vite 作为前端，本地 Node 服务作为 API 层，使用 SQLite 文件保存用户资料、聊天记录、图鉴解锁、熟悉度、陪伴日志、分层记忆和羁绊事件进度。

平台默认接入 DeepSeek Chat Completions API。浏览器不会直接访问上游模型接口，而是统一请求本地 `/api/*` 和 `/api-proxy/*`，由本地服务读取 API Key 并转发。

## 核心功能

- 多世界 AI 角色聊天：每个世界都有独立 NPC、世界观、系统提示词、开场白、知识图鉴和羁绊事件。
- 首次引导流程：API 设置、艾希世界观载入、用户资料填写、世界选择。
- DeepSeek 接入：优先读取 `.env` 中的 DeepSeek Key，也支持在页面设置中手动填写。
- 本地 SQLite 存储：数据保存到 `data/time-echo.sqlite`，不再依赖浏览器 `localStorage`。
- 用户画像：记录称呼、性格、偏好题材、互动方式、情绪陪伴偏好、剧情边界和长期备注。
- 情绪识别：用户发言后分析当前情绪，并把陪伴策略注入角色回复。
- 分层记忆：沉淀长期用户偏好、世界羁绊记忆和短期对话上下文。
- 记忆档案：在聊天页查看、删除长期用户记忆、世界羁绊记忆，并清空短期上下文。
- 陪伴日志：退出对话时生成本次聊天总结，记录相处时长、话题、熟悉度变化和解锁内容。
- 熟悉度系统：根据聊天时长、用户消息、图鉴解锁和羁绊事件推进关系进度。
- 羁绊事件：熟悉度达到阈值后解锁角色专属剧情节点，完成后写入世界记忆。
- RAG 知识库：`聊斋夜录` 世界可检索《聊斋志异》语料片段，增强回答依据。
- 世界分类：按系列展示世界，包括未来残响、创世神话、旧文明典藏、异想生灵。

## 当前世界

| 世界 | NPC | 系列 | 说明 |
| --- | --- | --- | --- |
| 量子废墟 | 艾希 | 未来残响 | 文明崩塌后的数字废土与量子档案库。 |
| 时间起源 | 零曦 | 创世神话 | 第零年、第一秒之门与创世神谕。 |
| 聊斋夜录 | 青灯 | 旧文明典藏 | 旧文明残卷、狐鬼夜谈与《聊斋》RAG。 |
| 鲸的梦境 | 蓝洄 | 异想生灵 | 鲸歌、迁徙、鲸落与深海记忆。 |

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React
- Node.js `node:sqlite`
- DeepSeek Chat Completions API

## 环境要求

- Node.js 24 或更高版本。
  - 当前本地服务使用 Node 24 的 `node:sqlite`。
- npm。
- Python 3，可选，仅在重新导入 RAG 语料时需要。

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

如果你的网络需要本地代理访问 DeepSeek，再按实际端口启用：

```env
VITE_LOCAL_PROXY=http://127.0.0.1:7890
```

启动本地应用：

```powershell
npm run dev
```

打开浏览器：

```text
http://127.0.0.1:5173
```

`npm run dev` 会启动 `scripts/dev-server.mjs`。它会同时完成：

- 创建或打开 `data/time-echo.sqlite`。
- 提供本地 `/api/*` 数据接口。
- 提供 `/api-proxy/chat/completions` DeepSeek 代理。
- 挂载 Vite 开发中间件渲染前端页面。

## API Key 规则

API Key 有两种来源：

1. `.env` 中的 `VITE_DEEPSEEK_API_KEY`，优先级最高。
2. 页面设置中手动填写的 Key，会保存到本地 SQLite。

如果 `.env` 已经配置 Key，首次进入时会自动通过 API 设置阶段。  
如果 `.env` 没有配置 Key，页面会展示设置界面，让用户手动填写 DeepSeek API Key。

## 本地数据

SQLite 数据文件默认位置：

```text
data/time-echo.sqlite
```

`data/` 已加入 `.gitignore`，不会提交到仓库。

保存的数据包括：

- API 设置
- 用户资料
- 首次引导状态
- 每个世界的聊天记录
- 图鉴解锁进度
- 熟悉度
- 陪伴日志
- 情绪历史
- 用户长期记忆
- 世界羁绊记忆
- 短期对话上下文
- 羁绊事件完成状态

如果需要重置本地数据，停止开发服务后只删除 SQLite 文件：

```powershell
Remove-Item -LiteralPath "C:\Users\Uniqu\Desktop\ai-chat\data\time-echo.sqlite"
```

不要删除整个 `data` 目录。

## 常用脚本

启动开发服务：

```powershell
npm run dev
```

构建生产文件：

```powershell
npm run build
```

预览生产构建：

```powershell
npm run preview
```

注意：`npm run preview` 只预览静态构建结果，不会替代 `scripts/dev-server.mjs` 提供的 SQLite API 服务。

重新导入聊斋 RAG 语料：

```powershell
npm run rag:liaozhai
```

该脚本会读取 `rag_sources/liaozhai` 下的 PDF 或 TXT 文件，并生成：

```text
src/worlds/world2/rag/chunks.json
```

读取 PDF 需要 Python 环境中安装 `pypdf` 或 `pdfplumber`。

## 项目结构

```text
.
├── scripts
│   ├── dev-server.mjs          # 本地 Node API、SQLite、DeepSeek 代理、Vite 中间件
│   └── import-liaozhai-rag.py  # 聊斋 RAG 语料导入脚本
├── rag_sources
│   └── liaozhai                # 聊斋 PDF 原始语料
├── data
│   └── time-echo.sqlite        # 本地数据文件，运行后自动创建
├── src
│   ├── App.tsx                 # 首次流程和页面切换
│   ├── components
│   │   ├── SetupPage.tsx
│   │   ├── IntroStoryGate.tsx
│   │   ├── UserProfileGate.tsx
│   │   ├── WorldSelectPage.tsx
│   │   ├── WorldCard.tsx
│   │   ├── ChatPage.tsx
│   │   ├── ChatBubble.tsx
│   │   ├── EncyclopediaPanel.tsx
│   │   ├── CompanionJournalPanel.tsx
│   │   ├── MemoryArchiveModal.tsx
│   │   └── UnlockToast.tsx
│   ├── utils
│   │   ├── storage.ts          # 前端本地 API 客户端
│   │   ├── ai.ts               # 流式模型响应解析
│   │   ├── companionship.ts    # 熟悉度、主题和兜底总结
│   │   └── unlock.ts           # 图鉴解锁标记解析
│   └── worlds
│       ├── index.ts            # 世界注册
│       ├── series.ts           # 世界系列分类
│       ├── world1
│       ├── world2
│       │   └── rag             # 聊斋 RAG chunks
│       ├── world3
│       └── world4
```

## 本地 API

开发服务提供以下接口：

- `GET /api/health`
- `GET/PUT /api/settings`
- `GET/PUT /api/profile`
- `GET/PUT /api/intro-story`
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
- `GET/POST /api/bond-events/:worldId`
- `POST /api/rag/search`
- `POST /api-proxy/chat/completions`

前端不直接访问 DeepSeek，也不在浏览器保存 API Key。

## 分层记忆机制

应用会把陪伴上下文拆成三层：

- 用户长期记忆：称呼、互动偏好、情绪支持方式、剧情边界、长期备注等。
- 世界羁绊记忆：用户与某个 NPC 在该世界发生过的重要事件、选择和关系节点。
- 短期上下文：最近对话摘要、未完成话题、用户刚表达的需求。

聊天生成前，`ChatPage` 会读取这些记忆并注入 system prompt。角色会自然延续关系，但不会直接说“我读取了记忆”。

记忆来源包括：

- 用户资料
- 最近对话
- 陪伴日志
- 情绪轨迹
- 图鉴解锁
- 熟悉度变化
- 羁绊事件选择

记忆可以在聊天页的“记忆档案”中查看。用户可以删除单条长期记忆或世界记忆，也可以清空短期上下文。

## 情绪识别与个性化陪伴

用户每次发送消息时，本地后端会调用同一个 Chat Completions 模型进行短 JSON 情绪分析。分析结果包括：

- `mood`：低落、焦虑、愤怒、疲惫、孤独、开心、平静、困惑、危机风险或未知。
- `intensity`：情绪强度，1 到 5。
- `confidence`：识别置信度。
- `signals`：触发判断的文本线索。
- `supportStrategy`：给角色的回复策略。

如果模型分析失败，后端会使用关键词启发式兜底，保证聊天流程不中断。最近情绪轨迹会写入 SQLite，并作为后续回复上下文的一部分。

当识别到危机风险时，角色会优先进行安全支持，暂停沉浸式剧情推进，并建议用户联系现实中的可信任对象、当地紧急服务或危机支持资源。

## RAG 知识库

当前 RAG 主要用于 `聊斋夜录` 世界。

原始语料位于：

```text
rag_sources/liaozhai
```

包含《聊斋志异》相关 PDF，例如：

- 婴宁
- 促织
- 崂山道士
- 狐嫁女
- 画皮
- 聂小倩

导入脚本会把语料切分为 chunks，并写入：

```text
src/worlds/world2/rag/chunks.json
```

聊天时，如果当前世界是 `world2`，应用会根据用户问题检索相关片段，并把“旧文明残卷摘录”注入提示词。

## 羁绊事件

每个世界可以在 `WorldConfig` 中配置 `bondEvents`。羁绊事件包含：

- `id`：事件唯一标识。
- `title`：事件标题。
- `threshold`：触发所需熟悉度。
- `summary`：事件概述。
- `triggerLabel`：聊天页按钮文案。
- `opening`：事件开场文本。
- `choices`：用户可选择的回应。

当用户完成羁绊事件后：

- 事件 ID 会写入本地完成状态。
- 对应选择会沉淀到世界羁绊记忆。
- 熟悉度计算会获得额外奖励。
- 后续对话会把该事件作为世界记忆继续使用。

## 添加新世界

每个世界由配置文件和知识卡片组成：

- `src/worlds/worldX/index.ts`
- `src/worlds/worldX/knowledge.ts`

新增世界步骤：

1. 新增 `worldX` 目录和两个文件。
2. 在 `src/worlds/index.ts` 中导入并加入 `WORLDS`。
3. 设置 `id`、`seriesId`、`order`、`name`、`npcName`、`npcIcon`、主题色、开场白和系统提示词。
4. 在 `knowledge.ts` 中配置知识卡片。
5. 如需角色剧情推进，在 `bondEvents` 中配置羁绊事件。
6. 设置 `available: true` 后，世界会出现在选择页。
7. 如需新增分类，在 `src/worlds/series.ts` 中添加。

知识卡片解锁依赖模型回复中的标记。例如：

```text
[UNLOCK:fragment_network]
```

前端会解析标记、解锁对应图鉴，并在展示给用户时清理掉标记文本。

## 常见问题

### 页面显示 API 错误 500

优先检查：

- 是否通过 `npm run dev` 启动，而不是只运行 `vite` 或 `npm run preview`。
- `.env` 是否配置了正确的 `VITE_DEEPSEEK_API_KEY`。
- `VITE_DEEPSEEK_API_BASE_URL` 是否是 `https://api.deepseek.com/v1` 或兼容地址。
- 如果启用了 `VITE_LOCAL_PROXY`，确认对应端口真实可用。

### 页面返回 HTML 而不是 JSON

说明前端请求没有打到本地 Node API。请使用：

```powershell
npm run dev
```

不要只启动静态预览。

### 页面手动填写了 Key，但重启后还在

这是正常行为。页面填写的 Key 会保存在本地 SQLite 文件中。

### 想清空所有本地状态

停止开发服务后，只删除单个 SQLite 文件：

```powershell
Remove-Item -LiteralPath "C:\Users\Uniqu\Desktop\ai-chat\data\time-echo.sqlite"
```

## 注意事项

- `.env` 和真实 API Key 不应提交。
- `data/time-echo.sqlite` 不应提交。
- `npm run preview` 不能替代本地 API 服务。
- RAG 原始 PDF 体积较大，提交前确认团队是否需要纳入仓库。
- 如果修改 `.env` 或 `vite.config.ts`，需要重启 `npm run dev`。
