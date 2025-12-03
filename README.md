# HCI 语音交互实验平台

一个基于 React + TypeScript + Vite 构建的人机交互（HCI）实验平台，支持语音和文本两种交互模式，用于研究用户与AI助手或人类伙伴的交互体验。

## ✨ 核心功能

- ✅ **双模式交互**: 文本输入和语音识别
- ✅ **腾讯云语音识别**: 无需 VPN，新用户免费 5 小时
- ✅ **阿里云 DashScope TTS**: 高质量语音合成
- ✅ **实时数据存储**: 自动保存到 Supabase
- ✅ **完整行为记录**: 记录所有用户交互数据

## 🚀 快速开始

### 环境要求

- Node.js 16+
- npm 或 yarn
- Edge 浏览器 79+ 或 Chrome 浏览器（推荐 Edge）

### 安装和运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

访问 `http://localhost:5173`

## 🗄️ 数据库配置

### Supabase 数据库信息

**Dashboard**: https://app.supabase.com/project/pqhrtviidwuwspubaxfm

**项目 URL**: `https://pqhrtviidwuwspubaxfm.supabase.co`

**Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxaHJ0dmlpZHd1d3NwdWJheGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ1NTQwNzEsImV4cCI6MjA4MDEzMDA3MX0.2UXvn6wk9Qlhq_HnRKm5bqIrFKwwPTuBq0kyXxa-WDI`

### 数据库表设置

1. 访问 [Supabase Dashboard](https://app.supabase.com/project/pqhrtviidwuwspubaxfm)
2. 点击 **SQL Editor**
3. 执行 `database-setup.sql` 中的 SQL 创建表

**注意**: 代码中已包含默认 Supabase 配置，无需修改即可使用。如需使用自己的 Supabase 项目，可修改 `src/App.tsx` 中的配置或创建 `.env` 文件。

## 📊 数据访问

### 方式一：Supabase Dashboard（推荐）

1. 访问 https://app.supabase.com/project/pqhrtviidwuwspubaxfm
2. 点击 **Table Editor**
3. 选择 `experiment_logs` 表查看数据

### 方式二：SQL 查询

在 Supabase Dashboard 的 **SQL Editor** 中执行：

```sql
-- 查看最近 100 条记录
SELECT * FROM experiment_logs 
ORDER BY timestamp DESC 
LIMIT 100;

-- 按会话统计
SELECT 
  session_id,
  participant_name,
  COUNT(*) as message_count,
  AVG(latency) as avg_latency
FROM experiment_logs
GROUP BY session_id, participant_name
ORDER BY MAX(timestamp) DESC;

-- 按实验条件统计
SELECT 
  condition,
  COUNT(*) as total_messages,
  COUNT(DISTINCT session_id) as session_count,
  COUNT(DISTINCT participant_name) as participant_count
FROM experiment_logs
GROUP BY condition;
```

### 方式三：REST API

```bash
curl 'https://pqhrtviidwuwspubaxfm.supabase.co/rest/v1/experiment_logs?limit=10' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxaHJ0dmlpZHd1d3NwdWJheGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ1NTQwNzEsImV4cCI6MjA4MDEzMDA3MX0.2UXvn6wk9Qlhq_HnRKm5bqIrFKwwPTuBq0kyXxa-WDI" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxaHJ0dmlpZHd1d3NwdWJheGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ1NTQwNzEsImV4cCI6MjA4MDEzMDA3MX0.2UXvn6wk9Qlhq_HnRKm5bqIrFKwwPTuBq0kyXxa-WDI"
```

## 🚀 部署到 Vercel

### 方式一：通过 GitHub（推荐）

1. 推送代码到 GitHub
2. 在 [Vercel](https://vercel.com) 中导入项目
3. 点击 **Deploy**（项目已包含 `vercel.json`，无需额外配置）

### 方式二：使用 Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

## ⚙️ 配置说明

### AI API 配置

1. 打开应用，点击右下角设置按钮
2. 在管理员界面配置语音模型的 API Key
3. 支持阿里云 DashScope API

### 腾讯云语音识别配置（推荐）

**优势**: 无需 VPN，新用户免费 5 小时，超出后约 3 元/小时

1. 在管理员界面选择"识别类型"为"腾讯云"
2. 访问 [腾讯云控制台](https://console.cloud.tencent.com/cam/capi) 获取 SecretId 和 SecretKey
3. 开通 [实时语音识别服务](https://console.cloud.tencent.com/asr)（免费试用）
4. 填写识别服务 URL、SecretId 和识别模型（如：16k_zh）

## 📁 项目结构

```
hci_experiment-main 2/
├── src/
│   ├── App.tsx              # 主应用（包含所有功能）
│   ├── index.tsx            # React 入口
│   └── style.css           # 全局样式
├── index.html               # HTML 入口
├── package.json             # 依赖配置
├── vite.config.ts           # Vite 配置
├── vercel.json              # Vercel 部署配置
├── database-setup.sql       # 数据库表结构 SQL
└── README.md                # 本文件
```

## 📊 数据表结构

数据存储在 `experiment_logs` 表中，包含以下字段：

- `id`: 主键（自增）
- `session_id`: 会话ID
- `participant_name`: 参与者姓名
- `user_id`: 用户ID
- `voice_model_id`: 语音模型ID
- `condition`: 实验条件（AI_Model/Human_Partner）
- `role`: 角色（user/partner/system/assistant）
- `content`: 消息内容
- `latency`: 响应延迟（毫秒）
- `timestamp`: 时间戳
- `input_mode`: 输入模式（text/voice）
- `actual_model_used`: 实际使用的模型

## 🌐 浏览器兼容性

### 推荐浏览器

- **Microsoft Edge 79+**（最佳体验）
- **Google Chrome**（良好支持）

### 语音识别要求

- HTTPS 连接（本地开发可使用 localhost）
- 麦克风权限
- 浏览器支持 Web Speech API

**注意**: 浏览器原生语音识别可能需要 VPN。推荐使用腾讯云语音识别（无需 VPN）。

## 🔧 常见问题

### 语音识别不工作

1. 检查浏览器是否支持（Edge/Chrome）
2. 确认已授予麦克风权限
3. 尝试刷新页面
4. 检查是否有其他程序占用麦克风
5. **推荐**: 配置腾讯云语音识别（无需 VPN）

### 数据无法保存

1. 检查 Supabase 配置是否正确
2. 确认数据库表已创建（执行 `database-setup.sql`）
3. 检查网络连接

### AI 响应失败

1. 检查 API Key 是否正确配置
2. 确认网络连接正常
3. 检查 API 配额是否充足

## 📝 许可证

本项目为实验研究用途，请根据实际需求选择合适的许可证。

---

**最后更新**: 2024年
