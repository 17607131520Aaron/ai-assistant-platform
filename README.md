# AI Assistant Platform

基于 Next.js 的 AI 助手 Web 前端：登录鉴权、流式对话、多模态图片输入，以及通过后端管理的模型与 API Key 配置。

## 功能概览

- **用户认证**：登录 / 注册，Token 存于 Cookie，未登录访问主界面会跳转 `/login`
- **AI 对话**：调用后端 `POST /web/ai/chat/stream` 的 SSE 流式响应，支持推理过程展示
- **多模态输入**：文本 + 图片（选择文件、粘贴剪贴板），上传后对接 SenseNova 风格 content parts
- **模型设置**：在设置弹窗中配置 `requestUrl`、`model`、`apiKeyToken`（由后端持久化，如 Redis）
- **全局请求**：统一 HTTP 封装（重试、401 处理、可选全局 Loading）

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16、React 19 |
| UI | Ant Design 6、Tailwind CSS 4 |
| AI | Vercel AI SDK、`@ai-sdk/openai`、`ollama-ai-provider` |
| 状态 / 工具 | Zustand、ahooks、Dexie |
| 构建 | TypeScript、React Compiler、pnpm |

## 项目结构

```
src/
├── app/
│   ├── page.tsx                 # 入口，渲染 AI 助手主界面
│   ├── login/page.tsx           # 登录 / 注册
│   └── ai-assistant/            # 对话 UI、设置弹窗、业务 Hook
├── components/
│   ├── auth-guard.tsx           # 路由鉴权
│   └── request-loading-provider.tsx
├── lib/
│   ├── api-client.ts            # API 封装（信封解析、Token、Loading）
│   ├── request.ts               # 底层 fetch 请求层
│   ├── auth-api.ts / auth-token.ts / auth-session.ts
│   ├── ai-api-key-config.ts     # 模型与 API Key 配置
│   ├── ai-chat-image.ts         # 图片校验、上传、content parts
│   ├── ai-chat-message.ts       # 消息结构与请求载荷
│   └── stream-delta.ts          # SSE 流增量解析
└── types/                       # 请求与聊天相关类型
```

## 环境要求

- Node.js 20+
- [pnpm](https://pnpm.io/)（推荐，与 Docker 构建一致）
- 可访问的后端 API 服务（本地开发默认 `http://localhost:9999`）

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

项目通过 `APP_ENV` 加载对应 env 文件（见 `next.config.ts`）：

| 文件 | 用途 |
|------|------|
| `.env.development` | 本地开发 |
| `.env.test` | 测试环境构建 / 运行 |
| `.env.production` | 生产环境构建 / 运行 |

常用变量：

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_API_BASE_URL` | 前端请求前缀，默认 `/api` |
| `NEXT_PUBLIC_API_PROXY_TARGET` | 开发时 Next 将 `/api/*` 代理到此后端地址 |

示例（`.env.development`）：

```env
NEXT_PUBLIC_API_BASE_URL=/api
NEXT_PUBLIC_API_PROXY_TARGET=http://localhost:9999
```

生产构建时若未设置 `NEXT_PUBLIC_API_PROXY_TARGET`，构建会失败；开发环境未设置时仅禁用代理并输出警告。

### 3. 启动开发服务

```bash
# 开发环境（默认 APP_ENV=development）
pnpm dev

# 指定环境
pnpm dev:test
pnpm dev:production
```

浏览器访问 [http://localhost:3000](http://localhost:3000)。主界面需先登录；后端需已启动并可通过代理访问。

### 4. 构建与生产运行

```bash
pnpm build          # APP_ENV=production
pnpm build:test     # APP_ENV=test
pnpm start
```

## 脚本说明

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发模式，`APP_ENV=development` |
| `pnpm dev:test` | 开发模式，使用 test 环境配置 |
| `pnpm build` / `pnpm build:test` | 对应环境生产构建 |
| `pnpm start` | 启动 standalone 产物 |
| `pnpm lint` | ESLint 检查 |

## 与后端的对接

开发环境下，浏览器请求 `/api/...`，由 Next.js `rewrites` 转发到 `NEXT_PUBLIC_API_PROXY_TARGET`。

主要接口（路径均相对于 API 根）：

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/web/users/login` | 登录 |
| POST | `/web/users/register` | 注册 |
| GET/PUT/DELETE | `/web/ai/api-key-config` | 读取 / 保存 / 清除模型配置 |
| POST | `/web/ai/chat/stream` | AI 流式对话（SSE） |
| POST | `/web/ai/files` | 图片上传（多模态） |

流式接口在 `next.config.ts` 中单独设置了 `Cache-Control: no-cache`，代理超时 120s。

## Docker 部署

项目使用多阶段 Dockerfile，输出 Next.js `standalone` 镜像。

```bash
# 交互式选择 test / production，构建并推送镜像
bash scripts/docker-build-push.sh

# 将镜像部署到远程服务器（需先配置脚本中的服务器信息）
bash scripts/docker-deploy-server.sh

# 一键：构建推送 + 部署
bash scripts/deploy.sh
```

部署相关变量与默认值见 `scripts/docker-common.sh`（镜像名、远程目录、端口等）。**请勿将 Docker Hub / SSH 密码提交到仓库**；在 `docker-build-push.sh` 与 `docker-deploy-server.sh` 中本地配置。

远程运行使用 `docker/docker-compose.remote.yml`，通过环境变量 `IMAGE_NAME`、`APP_ENV`、`HOST_PORT` 等启动容器。

## 开发说明

- 路由：`/` 为 AI 助手主页，`/login` 为登录页；`AuthGuard` 保护主界面
- 请求层：`src/lib/request.ts` 提供通用能力；`src/lib/api-client.ts` 在此基础上处理业务信封 `{ code, message, data }`
- 旧版本地存储的 AI 设置会在打开设置弹窗时尝试迁移到后端（`migrateLegacyLocalSettings`）
- Next.js 16 与常见教程存在差异，修改框架相关代码前可参考 `node_modules/next/dist/docs/` 与仓库内 `AGENTS.md`

## License

Private project.
