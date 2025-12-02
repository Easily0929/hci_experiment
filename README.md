# HCI 语音交互实验平台

一个基于 React + TypeScript + Vite 构建的人机交互（HCI）实验平台，支持语音和文本两种交互模式，用于研究用户与AI助手或人类伙伴的交互体验。

## 📁 项目文件结构

```
hci_experiment-main 2/
├── index.html              # HTML 入口文件
├── package.json            # 项目依赖和脚本配置
├── vite.config.ts          # Vite 构建工具配置
├── react-ts-xaifrsnf.zip  # 项目压缩包（可删除）
├── src/
│   ├── App.tsx             # 主应用组件（包含所有功能逻辑）
│   ├── index.tsx           # React 应用入口文件
│   └── style.css           # 全局样式文件
└── README.md               # 项目说明文档（本文件）
```

## 🚀 快速开始

### 环境要求

- Node.js 16+ 
- npm 或 yarn
- Edge 浏览器 79+ 或 Chrome 浏览器（推荐使用 Edge 以获得最佳语音识别体验）

### 安装步骤

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置 Supabase（可选）**
   - 项目已配置 Supabase 用于数据存储
   - 如需修改，请编辑 `src/App.tsx` 中的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`

3. **配置 AI API Key**
   - 在登录页面点击右下角设置按钮进入管理员界面
   - 为每个语音模型配置 API Key（使用 SiliconFlow API）
   - 默认模型使用 `deepseek-ai/DeepSeek-V2.5`

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **构建生产版本**
   ```bash
   npm run build
   ```

6. **预览生产构建**
   ```bash
   npm run preview
   ```

## 📄 文件说明

### `index.html`
- HTML 入口文件
- 引入 Tailwind CSS（通过 CDN）
- 包含 React 应用的挂载点 `<div id="root"></div>`
- 加载主入口脚本 `/src/index.tsx`

### `package.json`
项目依赖和脚本配置：

**主要依赖：**
- `react` & `react-dom`: React 框架
- `@supabase/supabase-js`: Supabase 客户端
- `recharts`: 数据可视化图表库
- `lucide-react`: 图标库
- `uuid`: 生成唯一ID
- `recorder-core`: 音频录制核心库

**开发依赖：**
- `vite`: 构建工具
- `@vitejs/plugin-react`: React 插件
- `typescript`: TypeScript 支持
- `tailwindcss`: CSS 框架

**可用脚本：**
- `npm run dev`: 启动开发服务器
- `npm run build`: 构建生产版本
- `npm run preview`: 预览生产构建

### `vite.config.ts`
Vite 配置文件：
- 使用 `@vitejs/plugin-react` 插件支持 React
- 配置了 TypeScript 支持

### `src/index.tsx`
React 应用入口：
- 渲染 `App` 组件到 DOM
- 使用 React 18 的 `createRoot` API

### `src/App.tsx`
**核心应用文件**，包含所有功能：

#### 主要功能模块：

1. **用户认证与登录**
   - 参与者姓名输入
   - 交互模式选择（文本/语音）
   - 自动分配实验条件（AI_Model / Human_Partner）

2. **语音交互功能**
   - 浏览器原生语音识别（Web Speech API）
   - 语音合成（Text-to-Speech）
   - Edge 浏览器优化支持
   - 实时转录显示
   - 音频可视化

3. **文本交互功能**
   - 文本输入框
   - 消息发送
   - 对话历史记录

4. **AI 模型集成**
   - 支持多个语音模型配置
   - SiliconFlow API 集成
   - 可自定义系统提示词
   - 响应延迟统计

5. **数据管理**
   - Supabase 数据存储
   - 本地会话管理
   - 实验日志记录

6. **管理员界面**
   - 语音模型配置
   - API Key 管理
   - Edge 浏览器诊断工具
   - 语音识别配置说明

7. **数据仪表板**
   - 消息统计
   - 响应延迟图表
   - 原始数据查看

#### 主要组件：

- `HCIExperimentPlatform`: 主应用组件
- `LoginView`: 登录界面
- `ParticipantView`: 参与者交互界面
- `AdminView`: 管理员配置界面
- `ThankYouView`: 实验结束感谢页面
- `DashboardView`: 数据仪表板
- `ChatMessage`: 聊天消息组件
- `PersistentTextInput`: 持久化文本输入组件
- `AudioVisualizer`: 音频可视化组件
- `EdgeDiagnostic`: Edge 浏览器诊断工具

### `src/style.css`
全局样式文件：
- 定义基础字体样式（Lato）

## 🎯 核心功能

### 1. 双模式交互
- **文本模式**: 键盘输入，适合快速输入
- **语音模式**: 语音识别，支持自然对话

### 2. 实验条件分配
- **AI_Model**: 与 AI 助手交互
- **Human_Partner**: 与人类伙伴交互（实际为配置的 AI 模型）

### 3. 语音识别特性
- 支持中文语音识别
- Edge/Chrome 浏览器优化
- 实时转录显示
- 错误处理和重试机制
- 麦克风权限管理

### 4. 数据收集
- 所有交互消息自动保存到 Supabase
- 记录响应延迟
- 记录交互模式
- 记录实验条件

### 5. 可视化分析
- 响应延迟趋势图
- 消息统计
- 模式使用统计

## 🔧 配置说明

### Supabase 配置
在 `src/App.tsx` 中修改：
```typescript
const SUPABASE_URL = 'your-supabase-url';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### AI API 配置
在管理员界面中配置：
- API URL: SiliconFlow API 地址
- API Key: 你的 API 密钥
- 模型名称: 使用的模型（如 `deepseek-ai/DeepSeek-V2.5`）
- 系统提示词: 定义 AI 的行为和风格

### 语音模型配置
支持配置多个语音模型：
- 模型别名
- 语音合成参数（语速、音调）
- 文本 LLM 配置

## 🌐 浏览器兼容性

### 推荐浏览器
- **Microsoft Edge 79+**（最佳体验）
- **Google Chrome**（良好支持）

### 语音识别要求
- 需要 HTTPS 连接（本地开发可使用 localhost）
- 需要麦克风权限
- 需要浏览器支持 Web Speech API

### Edge 浏览器特殊说明
- 首次使用需要允许麦克风权限
- 点击地址栏左侧的麦克风图标进行权限管理
- 建议在安静环境下使用
- 支持诊断工具检查兼容性

## 📊 数据存储

### Supabase 表结构
数据存储在 `experiment_logs` 表中，包含以下字段：
- `session_id`: 会话ID
- `participant_name`: 参与者姓名
- `user_id`: 用户ID
- `voice_model_id`: 语音模型ID
- `condition`: 实验条件
- `role`: 消息角色（user/partner/system/assistant）
- `content`: 消息内容
- `latency`: 响应延迟（毫秒）
- `timestamp`: 时间戳

## 🛠️ 开发指南

### 添加新的语音模型
1. 进入管理员界面
2. 点击"添加模型"按钮
3. 配置模型参数
4. 保存配置

### 自定义样式
项目使用 Tailwind CSS，可以通过以下方式自定义：
- 修改组件中的 className
- 在 `src/style.css` 中添加全局样式
- 配置 Tailwind 主题（需要创建 `tailwind.config.js`）

### 扩展功能
- 添加新的交互模式
- 集成其他 AI 服务
- 添加更多数据分析功能
- 实现数据导出功能

## ⚠️ 注意事项

1. **API Key 安全**: 不要将 API Key 提交到公共仓库
2. **麦克风权限**: 确保用户已授权麦克风访问
3. **网络连接**: AI API 调用需要稳定的网络连接
4. **数据隐私**: 确保遵守数据保护法规
5. **浏览器版本**: 使用最新版本的 Edge 或 Chrome

## 🐛 常见问题

### 语音识别不工作
1. 检查浏览器是否支持 Web Speech API
2. 确认已授予麦克风权限
3. 尝试刷新页面
4. 检查是否有其他程序占用麦克风
5. 使用 Edge 浏览器诊断工具

### AI 响应失败
1. 检查 API Key 是否正确配置
2. 确认网络连接正常
3. 检查 API 配额是否充足
4. 查看浏览器控制台错误信息

### 数据未保存
1. 检查 Supabase 配置是否正确
2. 确认网络连接正常
3. 检查 Supabase 表结构是否正确

## 📝 许可证

本项目为实验研究用途，请根据实际需求选择合适的许可证。

## 👥 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 📧 联系方式

如有问题或建议，请通过 Issue 反馈。

---

**最后更新**: 2024年

