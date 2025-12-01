import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  Mic,
  MicOff,
  Settings,
  Activity,
  Database,
  Download,
  Play,
  Check,
  Trash2,
  PlusCircle,
  CloudUpload,
  Lock
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// --- 配置区域 ---
const SUPABASE_URL = 'https://pqhrtviidwuwspubaxfm.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxaHJ0dmlpZHd1d3NwdWJheGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NTQwNzEsImV4cCI6MjA4MDEzMDA3MX0.2UXvn6wk9Qlhq_HnRKm5bqIrFKwwPTuBq0kyXxa-WDI';

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http')
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// --- 类型定义 ---
type Condition = 'AI_Model' | 'Human_Partner';
type AppView = 'login' | 'participant' | 'admin' | 'dashboard' | 'thank_you';

type ModelConfig = {
  id: string;
  alias: string;
  url: string;
  key: string;
  modelName: string;
};

type Message = {
  id: string;
  sessionId: string;
  participantName: string;
  condition: Condition;
  actualModelUsed: string;
  role: 'user' | 'partner' | 'system' | 'assistant';
  content: string;
  timestamp: number;
  latency?: number;
};

const mockData = [
  { name: 'User', words: 400 },
  { name: 'Partner', words: 600 },
];

// --- 可视化组件 ---
const AudioVisualizer = ({
  isActive,
  mode,
}: {
  isActive: boolean;
  mode: string;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    let animId: number,
      offset = 0;
    const draw = () => {
      ctx.clearRect(0, 0, 600, 150);
      ctx.lineWidth = 2;
      const color =
        mode === 'user' ? '#10b981' : mode === 'ai' ? '#3b82f6' : '#f97316';
      ctx.strokeStyle = color;
      ctx.beginPath();
      for (let x = 0; x < 600; x++) {
        const amp = isActive
          ? Math.sin((x + offset) * 0.05) * 50 * Math.random()
          : 1;
        ctx.lineTo(x, 75 + amp);
      }
      ctx.stroke();
      offset += 5;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [isActive, mode]);
  return (
    <canvas ref={ref} width={600} height={150} className="w-full h-full" />
  );
};

// --- 主程序 ---
export default function HCIExperimentPlatform() {
  const [currentView, setCurrentView] = useState<AppView>('login');
  const [sessionId] = useState(() => uuidv4());

  // 实验变量
  const [participantName, setParticipantName] = useState('');
  const [assignedCondition, setAssignedCondition] =
    useState<Condition>('AI_Model');
  const [activeConfig, setActiveConfig] = useState<ModelConfig | null>(null);

  // 模型列表
  const [modelList, setModelList] = useState<ModelConfig[]>([
    {
      id: 'default_silicon',
      alias: 'SiliconFlow - DeepSeek',
      url: 'https://api.siliconflow.cn/v1/chat/completions',
      key: '',
      modelName: 'deepseek-ai/DeepSeek-V2.5',
    },
  ]);

  const [prompts, setPrompts] = useState({
    ai: 'You are a helpful AI assistant.',
    human:
      'You are pretending to be a human participant in a chat. Speak casually, lower case, maybe some typos.',
  });

  const [isRecording, setIsRecording] = useState(false);
  const [interactionState, setInteractionState] = useState<
    'idle' | 'listen' | 'process' | 'speak'
  >('idle');
  const [logs, setLogs] = useState<Message[]>([]);

  // --- 核心功能：上传数据到 Supabase ---
  const uploadToCloud = async (msg: Message) => {
    if (!supabase) {
      console.warn('Supabase not configured, skipping cloud upload.');
      return;
    }

    const { error } = await supabase.from('experiment_logs').insert({
      session_id: msg.sessionId,
      participant_name: msg.participantName,
      condition: msg.condition,
      role: msg.role,
      content: msg.content,
      latency: msg.latency || 0,
      timestamp: new Date(msg.timestamp).toISOString(), 
    });

    if (error) {
      console.error('Supabase Upload Error:', error);
    } else {
      console.log('Uploaded to cloud:', msg.id);
    }
  };

  // --- 登录逻辑 ---
  const handleLogin = () => {
    if (!participantName.trim()) {
      alert('Please enter name');
      return;
    }
    if (modelList.length === 0) {
      alert('No models configured!');
      return;
    }

    const isAI = Math.random() > 0.5;
    const condition = isAI ? 'AI_Model' : 'Human_Partner';
    setAssignedCondition(condition);

    const randomIndex = Math.floor(Math.random() * modelList.length);
    const selectedModel = modelList[randomIndex];
    setActiveConfig(selectedModel);

    setCurrentView('participant');
  };

  // --- 交互逻辑 ---
  const handleInteraction = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Use Chrome');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.start();
    setIsRecording(true);
    setInteractionState('listen');

    recognition.onresult = async (event: any) => {
      const userText = event.results[0][0].transcript;
      setIsRecording(false);
      setInteractionState('process');

      const userMsg: Message = {
        id: Date.now().toString(),
        sessionId,
        participantName,
        condition: assignedCondition,
        actualModelUsed: activeConfig?.alias || 'Unknown',
        role: 'user',
        content: userText,
        timestamp: Date.now(),
      };

      let newHistory: Message[] = [];
      setLogs((prev) => {
        newHistory = [...prev, userMsg];
        return newHistory;
      });

      uploadToCloud(userMsg);

      try {
        if (!activeConfig || !activeConfig.key)
          throw new Error('API Key missing.');

        const startProcess = Date.now();
        const systemMsg = {
          role: 'system',
          content:
            assignedCondition === 'AI_Model' ? prompts.ai : prompts.human,
        };
        // 修正类型错误
        const apiMessages = [
          systemMsg,
          ...newHistory.map((l) => ({
            role: (l.role === 'partner' ? 'assistant' : 'user') as "user" | "assistant" | "system",
            content: l.content,
          })),
        ];

        const response = await fetch(activeConfig.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeConfig.key}`,
          },
          body: JSON.stringify({
            model: activeConfig.modelName,
            messages: apiMessages,
          }),
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        const partnerText = data.choices[0].message.content;
        const latency = Date.now() - startProcess;

        const partnerMsg: Message = {
          id: (Date.now() + 1).toString(),
          sessionId,
          participantName,
          condition: assignedCondition,
          actualModelUsed: activeConfig.alias,
          role: 'partner',
          content: partnerText,
          timestamp: Date.now(),
          latency,
        };
        setLogs((prev) => [...prev, partnerMsg]);

        uploadToCloud(partnerMsg);

        setInteractionState('speak');
        const utterance = new SpeechSynthesisUtterance(partnerText);
        utterance.lang = 'zh-CN';
        if (assignedCondition === 'Human_Partner') {
          utterance.rate = 0.9;
          utterance.pitch = 1.1;
        }
        utterance.onend = () => setInteractionState('idle');
        window.speechSynthesis.speak(utterance);
      } catch (e: any) {
        alert(e.message);
        setInteractionState('idle');
      }
    };
  };

  // --- 管理员后台 ---
  const AdminView = () => {
    const addNewModel = () => {
      setModelList([
        ...modelList,
        {
          id: uuidv4(),
          alias: 'New Model',
          url: 'https://api.siliconflow.cn/v1/chat/completions',
          key: '',
          modelName: '',
        },
      ]);
    };
    const removeModel = (id: string) => {
      if (modelList.length > 1)
        setModelList(modelList.filter((m) => m.id !== id));
    };
    const updateModel = (
      id: string,
      field: keyof ModelConfig,
      value: string
    ) => {
      setModelList(
        modelList.map((m) => (m.id === id ? { ...m, [field]: value } : m))
      );
    };

    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center overflow-y-auto">
        <div className="w-full max-w-4xl pb-12">
          <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Settings /> System Configuration
            </h1>
            <button
              onClick={() => setCurrentView('login')}
              className="text-sm text-gray-400 hover:text-white"
            >
              ← Back
            </button>
          </header>

          <div className="space-y-8">
            <div
              className={`p-4 rounded border ${
                supabase
                  ? 'bg-green-900/30 border-green-600'
                  : 'bg-red-900/30 border-red-600'
              }`}
            >
              <h3 className="font-bold flex gap-2 items-center">
                <CloudUpload size={18} />
                Cloud Database Status:{' '}
                {supabase ? 'Connected' : 'Not Configured'}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-blue-400">Models</h3>
                <button
                  onClick={addNewModel}
                  className="flex items-center gap-1 bg-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500"
                >
                  <PlusCircle size={14} /> Add
                </button>
              </div>
              {modelList.map((model, index) => (
                <div
                  key={model.id}
                  className="bg-gray-800 p-6 rounded-lg border border-gray-700 relative"
                >
                  <button
                    onClick={() => removeModel(model.id)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                  <h4 className="text-xs text-gray-500 uppercase tracking-widest mb-3">
                    Model #{index + 1}
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      value={model.alias}
                      onChange={(e) =>
                        updateModel(model.id, 'alias', e.target.value)
                      }
                      placeholder="Alias"
                      className="bg-gray-700 border-gray-600 rounded p-2 text-sm"
                    />
                    <input
                      value={model.modelName}
                      onChange={(e) =>
                        updateModel(model.id, 'modelName', e.target.value)
                      }
                      placeholder="Model Name"
                      className="bg-gray-700 border-gray-600 rounded p-2 text-sm"
                    />
                    <input
                      value={model.url}
                      onChange={(e) =>
                        updateModel(model.id, 'url', e.target.value)
                      }
                      placeholder="Endpoint"
                      className="md:col-span-2 bg-gray-700 border-gray-600 rounded p-2 text-sm"
                    />
                    <input
                      type="password"
                      value={model.key}
                      onChange={(e) =>
                        updateModel(model.id, 'key', e.target.value)
                      }
                      placeholder="API Key"
                      className="md:col-span-2 bg-gray-700 border-gray-600 rounded p-2 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="font-bold mb-4 text-green-400">Prompts</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400">AI</label>
                  <textarea
                    rows={2}
                    value={prompts.ai}
                    onChange={(e) =>
                      setPrompts({ ...prompts, ai: e.target.value })
                    }
                    className="w-full bg-gray-700 border-gray-600 rounded p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Human</label>
                  <textarea
                    rows={2}
                    value={prompts.human}
                    onChange={(e) =>
                      setPrompts({ ...prompts, human: e.target.value })
                    }
                    className="w-full bg-gray-700 border-gray-600 rounded p-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => setCurrentView('login')}
              className="w-full bg-blue-600 py-3 rounded font-bold hover:bg-blue-500"
            >
              Save & Return
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- 其他视图 ---
  const LoginView = () => (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-2">Welcome</h1>
        <p className="text-gray-500 mb-8 text-sm">Enter ID to start.</p>
        <input
          type="text"
          placeholder="ID"
          value={participantName}
          onChange={(e) => setParticipantName(e.target.value)}
          className="w-full border-2 rounded-lg p-4 mb-4"
        />
        <button
          onClick={handleLogin}
          className="w-full bg-black text-white py-4 rounded-lg font-bold flex justify-center gap-2"
        >
          Start <Play size={20} />
        </button>
      </div>
      <button
        onClick={() => setCurrentView('admin')}
        className="fixed bottom-4 right-4 text-gray-300 hover:text-gray-500 p-2"
      >
        <Settings size={16} />
      </button>
    </div>
  );
  const ParticipantView = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 relative">
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setCurrentView('thank_you')}
          className="bg-white border text-gray-600 px-4 py-2 rounded text-sm hover:text-red-600"
        >
          End Session
        </button>
      </div>
      <div className="absolute top-10 text-xs text-gray-400 uppercase tracking-widest">
        {interactionState}
      </div>
      <div className="w-full max-w-2xl h-48 mb-12 flex items-center justify-center">
        <AudioVisualizer
          isActive={
            interactionState === 'listen' || interactionState === 'speak'
          }
          mode={
            interactionState === 'listen'
              ? 'user'
              : assignedCondition === 'AI_Model'
              ? 'ai'
              : 'human'
          }
        />
      </div>
      <button
        onMouseDown={() => {}}
        onClick={handleInteraction}
        className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all ${
          interactionState === 'listen'
            ? 'bg-red-500 scale-110'
            : 'bg-white hover:bg-gray-100 text-gray-800'
        }`}
      >
        {interactionState === 'listen' ? (
          <Mic className="text-white w-8 h-8" />
        ) : (
          <MicOff className="text-gray-400 w-8 h-8" />
        )}
      </button>
    </div>
  );
  const ThankYouView = () => {
    const [pwd, setPwd] = useState('');
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Finished</h1>
          <p className="text-gray-500 mb-8">Notify researcher.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Pass"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="border rounded px-2 py-1 w-24 text-sm"
          />
          <button
            onClick={() => {
              if (pwd === 'admin') setCurrentView('dashboard');
            }}
            className="bg-black text-white px-3 py-1 rounded text-sm"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  };
  const DashboardView = () => {
    const dl = () => {
      const a = document.createElement('a');
      a.href =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(logs, null, 2));
      a.download = `exp_${participantName}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    return (
      <div className="min-h-screen bg-gray-100 p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm mt-1">
              ID: <b>{participantName}</b> | Cond: {assignedCondition}
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setCurrentView('admin')}
              className="text-sm underline"
            >
              Config
            </button>
            <button
              onClick={dl}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded"
            >
              <Download size={16} /> JSON
            </button>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 h-64">
          <div className="bg-white p-4 rounded shadow-sm">
            <h3 className="mb-2 font-bold text-gray-700 flex gap-2">
              <Activity size={16} /> Latency
            </h3>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart
                data={logs
                  .filter((l) => l.role === 'partner')
                  .map((l, i) => ({ t: i + 1, v: l.latency }))}
              >
                <XAxis dataKey="t" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-4 rounded shadow-sm">
            <h3 className="mb-2 font-bold text-gray-700 flex gap-2">
              <Database size={16} /> Words
            </h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={mockData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={50} />
                <Tooltip />
                <Bar dataKey="words" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3">Role</th>
                <th className="p-3">Content</th>
                <th className="p-3 text-right">Lat</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-3 font-bold text-xs uppercase text-gray-500">
                    {m.role}
                  </td>
                  <td className="p-3 truncate max-w-xl">{m.content}</td>
                  <td className="p-3 text-right font-mono text-xs text-gray-400">
                    {m.latency || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="font-sans text-gray-900">
      {currentView === 'login' && <LoginView />}
      {currentView === 'participant' && <ParticipantView />}
      {currentView === 'thank_you' && <ThankYouView />}
      {currentView === 'admin' && <AdminView />}
      {currentView === 'dashboard' && <DashboardView />}
    </div>
  );
}
