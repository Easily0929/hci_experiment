-- HCI 实验平台数据库表结构
-- 适用于 Supabase PostgreSQL

-- 创建实验日志表
CREATE TABLE IF NOT EXISTS experiment_logs (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  voice_model_id TEXT,
  condition TEXT NOT NULL CHECK (condition IN ('AI_Model', 'Human_Partner')),
  role TEXT NOT NULL CHECK (role IN ('user', 'partner', 'system', 'assistant')),
  content TEXT NOT NULL,
  latency INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  input_mode TEXT CHECK (input_mode IN ('text', 'voice')),
  actual_model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_experiment_logs_session_id ON experiment_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_experiment_logs_user_id ON experiment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_experiment_logs_timestamp ON experiment_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_experiment_logs_condition ON experiment_logs(condition);
CREATE INDEX IF NOT EXISTS idx_experiment_logs_participant_name ON experiment_logs(participant_name);

-- 启用 Row Level Security (RLS)
ALTER TABLE experiment_logs ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许匿名用户插入数据（用于实验数据收集）
CREATE POLICY "Allow anonymous insert" ON experiment_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 创建策略：允许认证用户查看所有数据
CREATE POLICY "Allow authenticated read" ON experiment_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- 创建策略：允许服务角色完全访问（用于管理员）
CREATE POLICY "Allow service role full access" ON experiment_logs
  FOR ALL
  TO service_role
  USING (true);

-- 添加表注释
COMMENT ON TABLE experiment_logs IS 'HCI实验平台交互日志表';
COMMENT ON COLUMN experiment_logs.session_id IS '会话ID，标识一次实验会话';
COMMENT ON COLUMN experiment_logs.participant_name IS '参与者姓名';
COMMENT ON COLUMN experiment_logs.user_id IS '用户唯一标识';
COMMENT ON COLUMN experiment_logs.voice_model_id IS '使用的语音模型ID';
COMMENT ON COLUMN experiment_logs.condition IS '实验条件：AI_Model 或 Human_Partner';
COMMENT ON COLUMN experiment_logs.role IS '消息角色：user(用户)、partner(伙伴)、system(系统)、assistant(助手)';
COMMENT ON COLUMN experiment_logs.content IS '消息内容';
COMMENT ON COLUMN experiment_logs.latency IS '响应延迟（毫秒）';
COMMENT ON COLUMN experiment_logs.timestamp IS '消息时间戳';
COMMENT ON COLUMN experiment_logs.input_mode IS '输入模式：text(文本) 或 voice(语音)';
COMMENT ON COLUMN experiment_logs.actual_model_used IS '实际使用的模型名称';

-- 创建视图：会话统计
CREATE OR REPLACE VIEW session_stats AS
SELECT 
  session_id,
  participant_name,
  user_id,
  condition,
  COUNT(*) as message_count,
  AVG(latency) as avg_latency,
  MIN(timestamp) as session_start,
  MAX(timestamp) as session_end,
  COUNT(DISTINCT CASE WHEN role = 'user' THEN id END) as user_messages,
  COUNT(DISTINCT CASE WHEN role IN ('partner', 'assistant') THEN id END) as partner_messages
FROM experiment_logs
GROUP BY session_id, participant_name, user_id, condition;

-- 创建视图：参与者统计
CREATE OR REPLACE VIEW participant_stats AS
SELECT 
  participant_name,
  user_id,
  COUNT(DISTINCT session_id) as session_count,
  COUNT(*) as total_messages,
  AVG(latency) as avg_latency,
  MIN(timestamp) as first_participation,
  MAX(timestamp) as last_participation
FROM experiment_logs
GROUP BY participant_name, user_id;

