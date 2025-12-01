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
  Settings,
  Activity,
  Database,
  Download,
  Play,
  Check,
  Trash2,
  PlusCircle,
  CloudUpload,
  Send,
  Mic,
  MicOff,
  Keyboard, // 新增键盘图标
  AudioLines // 新增音频图标
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
type InputMode = 'text' | 'voice'; // 新增交互模式
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
  inputMode: InputMode; // 记录交互模式
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
  const [assignedCondition, setAssignedCondition] = useState<Condition>('AI_Model');
  const [selectedInputMode, setSelectedInputMode] = useState<InputMode>('text'); // 默认文字模式
  const [activeConfig, setActiveConfig] = useState<ModelConfig | null>(null);
  
  // 文字输入状态
  const [inputText, setInputText] = useState('');

  // 语音输入状态
  const [isRecording, setIsRecording] = useState(false);

  // 模型列表
  const [modelList, setModelList] = useState<ModelConfig[]>([
    {
      id: 'default_silicon',
      alias: 'SiliconFlow - DeepSeek',
      url: 'https://api.siliconflow.cn/v1/chat/completions',
      key: '', // 记得去 Admin 面板填 Key
      modelName: 'deepseek-ai/DeepSeek-V2.5',
    },
  ]);

  const [prompts, setPrompts] = useState({
    ai: 'You are a helpful AI assistant.',
    human: 'You are pretending to be a human participant. Speak casually.',
  });

  const [interactionState, setInteractionState] = useState<
    'idle' | 'listen' | 'process' | 'speak'
  >('idle');
  const [logs, setLogs] = useState<Message[]>([]);

  // --- 核心功能：上传数据到 Supabase ---
  const uploadToCloud = async (msg: Message) => {
    if (!supabase) {
      console.warn('Supabase not configured.');
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
      // 注意：如果你想存 inputMode，需要在 Supabase 里加这个列。
      // 否则这里会报错，为了保险起见，我们可以把 mode 拼接到 content 里或者忽略
    });
    if (error) console.error('Supabase Upload Error:', error);
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

  // --- 统一的消息处理与 API 调用 ---
  const processMessageExchange = async (userText: string) => {
    setInteractionState('process');

    // 1. 记录用户消息
    const userMsg: Message = {
      id: Date.now().toString(),
      sessionId,
      participantName,
      condition: assignedCondition,
      inputMode: selectedInputMode,
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

    // 2. 调用 API
    try {
      if (!activeConfig || !activeConfig.key) throw new Error('API Key missing.');

      const startProcess = Date.now();
      const systemMsg = {
        role: 'system',
        content: assignedCondition === 'AI_Model' ? prompts.ai : prompts.human,
      };
      
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

      // 3. 记录 AI 消息
      const partnerMsg: Message = {
        id: (Date.now() + 1).toString(),
        sessionId,
        participantName,
        condition: assignedCondition,
        inputMode: selectedInputMode,
        actualModelUsed: activeConfig.alias,
        role: 'partner',
        content: partnerText,
        timestamp: Date.now(),
        latency,
      };
      setLogs((prev) => [...prev, partnerMsg]);
      uploadToCloud(partnerMsg);

      // 4. 语音合成 (两种模式下 AI 都会说话)
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

  // --- 语音交互触发 ---
  const handleVoiceInteraction = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Browser not supported. Use Chrome.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.start();
    setIsRecording(true);
    setInteractionState('listen');

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      processMessageExchange(transcript);
    };
    recognition.onerror = () => {
      setIsRecording(false);
      setInteractionState('idle');
      alert("Voice recognition failed (Check Network/VPN)");
    };
  };

  // --- 文字交互触发 ---
  const handleTextInteraction = () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    processMessageExchange(text);
  };

  // --- 管理员后台 (省略了部分重复代码，只保留核心) ---
  const AdminView = () => {
    // ... 模型增删改逻辑 ...
    const addNewModel = () => {
        setModelList([...modelList, { id: uuidv4(), alias: 'New', url: 'https://api.siliconflow.cn/v1/chat/completions', key: '', modelName: '' }]);
    };
    const updateModel = (id: string, field: keyof ModelConfig, value: string) => {
        setModelList(modelList.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center overflow-y-auto">
        <div className="w-full max-w-4xl pb-12">
            <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                <h1 className="text-xl font-bold flex items-center gap-2"><Settings /> Config</h1>
                <button onClick={() => setCurrentView('login')} className="text-sm text-gray-400">Back</button>
            </header>
            
            <div className="space-y-6">
                <div className="bg-gray-800 p-4 rounded">
                    <h3 className="font-bold mb-4">Models & Keys</h3>
                    {modelList.map((model) => (
                        <div key={model.id} className="grid gap-2 mb-4 border-b border-gray-700 pb-4">
                            <input value={model.alias} onChange={e => updateModel(model.id, 'alias', e.target.value)} className="bg-gray-700 p-2 rounded" placeholder="Alias"/>
                            <input value={model.url} onChange={e => updateModel(model.id, 'url', e.target.value)} className="bg-gray-700 p-2 rounded" placeholder="URL"/>
                            <input value={model.modelName} onChange={e => updateModel(model.id, 'modelName', e.target.value)} className="bg-gray-700 p-2 rounded" placeholder="Model Name"/>
                            <input type="password" value={model.key} onChange={e => updateModel(model.id, 'key', e.target.value)} className="bg-gray-700 p-2 rounded" placeholder="API Key (sk-...)"/>
                        </div>
                    ))}
                    <button onClick={addNewModel} className="bg-blue-600 px-4 py-2 rounded text-sm"><PlusCircle className="inline w-4 h-4"/> Add Model</button>
                </div>
                <button onClick={() => setCurrentView('login')} className="w-full bg-green-600 py-3 rounded font-bold">Save & Exit</button>
            </div>
        </div>
      </div>
    );
  };

  // --- 登录视图 (新增模式选择) ---
  const LoginView = () => (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">HCI Experiment</h1>
        
        <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Participant ID</label>
            <input
            type="text"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            className="w-full border-2 rounded-lg p-3"
            placeholder="e.g., P001"
            />
        </div>

        <div className="mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-2">Select Interaction Mode</label>
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => setSelectedInputMode('text')}
                    className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                        selectedInputMode === 'text' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    <Keyboard className={`mb-2 ${selectedInputMode === 'text' ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className={`text-sm font-bold ${selectedInputMode === 'text' ? 'text-blue-700' : 'text-gray-500'}`}>Text Chat</span>
                </button>
                <button
                    onClick={() => setSelectedInputMode('voice')}
                    className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                        selectedInputMode === 'voice' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    <AudioLines className={`mb-2 ${selectedInputMode === 'voice' ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className={`text-sm font-bold ${selectedInputMode === 'voice' ? 'text-blue-700' : 'text-gray-500'}`}>Voice Chat</span>
                </button>
            </div>
            {selectedInputMode === 'voice' && (
                <p className="text-xs text-orange-500 mt-2 text-center">Note: Voice mode requires VPN & Chrome.</p>
            )}
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-black text-white py-4 rounded-lg font-bold flex justify-center gap-2 hover:bg-gray-800 transition-colors"
        >
          Start Experiment <Play size={20} />
        </button>
      </div>
      <button onClick={() => setCurrentView('admin')} className="fixed bottom-4 right-4 text-gray-300 p-2 hover:text-gray-600"><Settings size={16} /></button>
    </div>
  );

  // --- 实验视图 (根据模式渲染不同界面) ---
  const ParticipantView = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 relative p-4">
      {/* 顶部控制栏 */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setCurrentView('thank_you')}
          className="bg-white border text-gray-600 px-4 py-2 rounded text-sm hover:text-red-600 shadow-sm"
        >
          End Session
        </button>
      </div>
      
      <div className="absolute top-4 left-4 text-xs font-mono text-gray-400">
        Mode: {selectedInputMode.toUpperCase()} | Cond: {assignedCondition}
      </div>

      {/* 状态文字 */}
      <div className="absolute top-12 text-xs text-gray-400 uppercase tracking-widest animate-pulse">
        {interactionState === 'process' ? 'Thinking...' : interactionState === 'speak' ? 'Speaking...' : interactionState === 'listen' ? 'Listening...' : ''}
      </div>

      {/* 通用区域：AI 可视化 & 消息记录 */}
      
      {/* 如果是语音模式，显示大波形 */}
      {selectedInputMode === 'voice' && (
        <div className="w-full max-w-2xl h-64 mb-12 flex items-center justify-center">
            <AudioVisualizer
            isActive={interactionState === 'listen' || interactionState === 'speak'}
            mode={interactionState === 'listen' ? 'user' : assignedCondition === 'AI_Model' ? 'ai' : 'human'}
            />
        </div>
      )}

      {/* 如果是文字模式，显示聊天记录气泡 (语音模式下只显示最新一句) */}
      <div className={`${selectedInputMode === 'text' ? 'h-96' : 'h-24'} w-full max-w-lg mb-6 overflow-y-auto bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all`}>
         {logs.length > 0 ? (
           <div className="space-y-4">
             {/* 语音模式只显示最后2条，文字模式显示全部 */}
             {(selectedInputMode === 'voice' ? logs.slice(-2) : logs).map(msg => (
               <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`px-4 py-3 rounded-2xl text-sm max-w-[80%] ${
                   msg.role === 'user' 
                     ? 'bg-blue-600 text-white rounded-br-none' 
                     : 'bg-gray-100 text-gray-800 rounded-bl-none'
                 }`}>
                   <div className="font-bold text-[10px] opacity-50 mb-1 uppercase">{msg.role}</div>
                   {msg.content}
                 </div>
               </div>
             ))}
           </div>
         ) : (
           <p className="text-center text-gray-300 text-sm mt-10">Conversation empty...</p>
         )}
      </div>

      {/* 交互区域：根据模式切换 */}
      <div className="w-full max-w-lg">
          {selectedInputMode === 'voice' ? (
              // 语音交互按钮
              <div className="flex justify-center">
                <button
                    onMouseDown={() => {}} 
                    onClick={handleVoiceInteraction}
                    disabled={interactionState !== 'idle'}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
                    interactionState === 'listen'
                        ? 'bg-red-500 scale-110 shadow-red-200'
                        : interactionState === 'idle' 
                            ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    {interactionState === 'listen' ? <Mic className="w-8 h-8 animate-pulse" /> : <Mic className="w-8 h-8" />}
                </button>
              </div>
          ) : (
              // 文字输入框
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTextInteraction()}
                  placeholder="Type a message..."
                  disabled={interactionState !== 'idle'}
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:bg-white bg-gray-50 transition-all"
                />
                <button
                  onClick={handleTextInteraction}
                  disabled={interactionState !== 'idle' || !inputText.trim()}
                  className={`px-6 rounded-xl font-bold flex items-center justify-center transition-all ${
                    interactionState !== 'idle' || !inputText.trim()
                      ? 'bg-gray-200 text-gray-400'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-200'
                  }`}
                >
                  {interactionState === 'process' ? <Activity className="animate-spin" /> : <Send size={20} />}
                </button>
              </div>
          )}
      </div>
    </div>
  );

  const ThankYouView = () => (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
          <h1 className="text-3xl font-bold">Session Ended</h1>
          <button onClick={() => setCurrentView('dashboard')} className="mt-4 underline text-gray-500">View Data</button>
      </div>
  );
  
  const DashboardView = () => (
      <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Data Dashboard</h1>
          <p>Participant: {participantName}</p>
          <p>Mode: {selectedInputMode}</p>
          <pre className="bg-gray-100 p-4 rounded mt-4 text-xs overflow-auto h-96">{JSON.stringify(logs, null, 2)}</pre>
          <button onClick={() => setCurrentView('login')} className="mt-4 bg-black text-white px-4 py-2 rounded">New Session</button>
      </div>
  );

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
