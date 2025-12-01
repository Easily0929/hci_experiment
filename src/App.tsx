import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import {
  Settings, Activity, Database, Download, Play, Check, Trash2, PlusCircle, CloudUpload,
  Send, Mic, MicOff, Keyboard, AudioLines
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// 引入录音库
import Recorder from 'recorder-core';
import 'recorder-core/src/engine/pcm.js';

// --- 配置区域 ---
const SUPABASE_URL = 'https://pqhrtviidwuwspubaxfm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxaHJ0dmlpZHd1d3NwdWJheGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NTQwNzEsImV4cCI6MjA4MDEzMDA3MX0.2UXvn6wk9Qlhq_HnRKm5bqIrFKwwPTuBq0kyXxa-WDI';

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http')
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// --- 默认配置 (方便测试，生产环境请在 Admin 修改) ---
const VOLC_APPID_DEFAULT = "2167852377"; 
const VOLC_TOKEN_DEFAULT = "ZtBt5W3f5JbujzshhrAjwVrC0aueKE8l";

// --- 类型定义 ---
type Condition = 'AI_Model' | 'Human_Partner';
type InputMode = 'text' | 'voice';
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
  inputMode: InputMode;
  actualModelUsed: string;
  role: 'user' | 'partner' | 'system' | 'assistant';
  content: string;
  timestamp: number;
  latency?: number;
};

const mockData = [{ name: 'User', words: 400 }, { name: 'Partner', words: 600 }];

// --- 可视化组件 ---
const AudioVisualizer = ({ isActive, mode }: { isActive: boolean; mode: string }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    let animId: number, offset = 0;
    const draw = () => {
      ctx.clearRect(0, 0, 600, 150);
      ctx.lineWidth = 2;
      const color = mode === 'user' ? '#10b981' : mode === 'ai' ? '#3b82f6' : '#f97316';
      ctx.strokeStyle = color;
      ctx.beginPath();
      for (let x = 0; x < 600; x++) {
        const amp = isActive ? Math.sin((x + offset) * 0.05) * 50 * Math.random() : 1;
        ctx.lineTo(x, 75 + amp);
      }
      ctx.stroke();
      offset += 5;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [isActive, mode]);
  return <canvas ref={ref} width={600} height={150} className="w-full h-full" />;
};

// --- 主程序 ---
export default function HCIExperimentPlatform() {
  const [currentView, setCurrentView] = useState<AppView>('login');
  const [sessionId] = useState(() => uuidv4());
  const [participantName, setParticipantName] = useState('');
  const [assignedCondition, setAssignedCondition] = useState<Condition>('AI_Model');
  const [selectedInputMode, setSelectedInputMode] = useState<InputMode>('voice'); 
  const [activeConfig, setActiveConfig] = useState<ModelConfig | null>(null);
  const [inputText, setInputText] = useState('');
  
  // 火山引擎配置
  const [volcAppId, setVolcAppId] = useState(VOLC_APPID_DEFAULT);
  const [volcToken, setVolcToken] = useState(VOLC_TOKEN_DEFAULT);

  // 语音录制状态
  const [isRecording, setIsRecording] = useState(false);
  const [rec, setRec] = useState<any>(null);

  // LLM 模型列表
  const [modelList, setModelList] = useState<ModelConfig[]>([
    {
      id: 'default_silicon',
      alias: 'SiliconFlow - DeepSeek',
      url: 'https://api.siliconflow.cn/v1/chat/completions',
      key: '', // 这里空着没关系，去 Admin 填
      modelName: 'deepseek-ai/DeepSeek-V2.5',
    },
  ]);

  const [prompts, setPrompts] = useState({
    ai: 'You are a helpful AI assistant.',
    human: 'You are pretending to be a human participant.',
  });

  const [interactionState, setInteractionState] = useState<'idle' | 'listen' | 'process' | 'speak'>('idle');
  const [logs, setLogs] = useState<Message[]>([]);

  // --- 数据上传 ---
  const uploadToCloud = async (msg: Message) => {
    if (!supabase) return;
    await supabase.from('experiment_logs').insert({
      session_id: msg.sessionId,
      participant_name: msg.participantName,
      condition: msg.condition,
      role: msg.role,
      content: msg.content,
      latency: msg.latency || 0,
      timestamp: new Date(msg.timestamp).toISOString(), 
    });
  };

  const handleLogin = () => {
    if (!participantName.trim()) { alert('Please enter name'); return; }
    if (modelList.length === 0) { alert('No models configured!'); return; }
    setAssignedCondition(Math.random() > 0.5 ? 'AI_Model' : 'Human_Partner');
    setActiveConfig(modelList[Math.floor(Math.random() * modelList.length)]);
    setCurrentView('participant');
  };

  // --- 核心交互逻辑 ---
  const processMessageExchange = async (userText: string) => {
    setInteractionState('process');
    const userMsg: Message = {
      id: Date.now().toString(), sessionId, participantName, condition: assignedCondition,
      inputMode: selectedInputMode, actualModelUsed: activeConfig?.alias || 'Unknown',
      role: 'user', content: userText, timestamp: Date.now(),
    };
    let newHistory = [...logs, userMsg];
    setLogs(newHistory);
    uploadToCloud(userMsg);

    try {
      if (!activeConfig?.key) throw new Error('AI API Key missing. Check Admin settings.');
      
      const startProcess = Date.now();
      const systemMsg = { role: 'system', content: assignedCondition === 'AI_Model' ? prompts.ai : prompts.human };
      const apiMessages = [systemMsg, ...newHistory.map(l => ({ role: (l.role === 'partner' ? 'assistant' : 'user') as any, content: l.content }))];

      const response = await fetch(activeConfig.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeConfig.key}` },
        body: JSON.stringify({ model: activeConfig.modelName, messages: apiMessages }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      const partnerText = data.choices[0].message.content;
      const latency = Date.now() - startProcess;

      const partnerMsg: Message = {
        id: (Date.now() + 1).toString(), sessionId, participantName, condition: assignedCondition,
        inputMode: selectedInputMode, actualModelUsed: activeConfig.alias,
        role: 'partner', content: partnerText, timestamp: Date.now(), latency,
      };
      setLogs(prev => [...prev, partnerMsg]);
      uploadToCloud(partnerMsg);

      setInteractionState('speak');
      const utterance = new SpeechSynthesisUtterance(partnerText);
      utterance.lang = 'zh-CN';
      if (assignedCondition === 'Human_Partner') { utterance.rate = 0.9; utterance.pitch = 1.1; }
      utterance.onend = () => setInteractionState('idle');
      window.speechSynthesis.speak(utterance);
    } catch (e: any) {
      alert(e.message);
      setInteractionState('idle');
    }
  };
 // --- 语音识别 (Recorder -> WebSocket -> Volcengine) ---
  const handleMicClick = () => {
      if (isRecording) {
          // 停止录音并发送
          if(rec) {
            rec.stop((blob: Blob, duration: number) => {
                setIsRecording(false);
                setInteractionState('process');
                
                const reader = new FileReader();
                reader.onloadend = () => {
                    const arrayBuffer = reader.result as ArrayBuffer;
                    const wsUrl = `wss://openspeech.bytedance.com/api/v2/asr`;
                    const ws = new WebSocket(wsUrl);
                    
                    ws.onopen = () => {
                        // 1. 发送 Start 指令
                        // 🔴 重点：集群名改回 "volcengine_streaming_common" (对应你截图里的通用版)
                        ws.send(JSON.stringify({
                            app: { appid: volcAppId, token: volcToken, cluster: "volcengine_streaming_common" },
                            user: { uid: sessionId },
                            request: {
                                event: "Start", 
                                reqid: uuidv4(), 
                                workflow: "audio_in,resample,partition,vad,asr,itn,punctuation",
                                audio: { format: "pcm", rate: 16000, bits: 16, channel: 1, codec: "raw" },
                                // 🔴 重点：强制要求服务器返回 JSON 格式，防止乱码
                                result: { encoding: "utf-8", format: "json" }
                            }
                        }));
                        
                        // 2. 发送音频数据
                        ws.send(new Uint8Array(arrayBuffer));
                        
                        // 3. 发送 Stop 指令
                        ws.send(JSON.stringify({
                            app: { appid: volcAppId, token: volcToken, cluster: "volcengine_streaming_common" },
                            request: { event: "Stop" }
                        }));
                    };
                    
                    ws.onmessage = (e) => {
                        const data = JSON.parse(e.data);
                        // 调试：看看服务器到底回了啥
                        console.log("ASR Response:", data);
                        
                        // 成功识别
                        if (data.result && data.result.text) {
                             const text = data.result.text;
                             ws.close();
                             if(text.trim()) processMessageExchange(text);
                             else setInteractionState('idle'); 
                        }
                    };
                    
                    ws.onerror = (e) => {
                        console.error("ASR Error:", e);
                        // 这里的 alert 可能会在 console 看到更详细的信息
                        setInteractionState('idle');
                    };
                };
                reader.readAsArrayBuffer(blob);
            });
          }
      } else {
          // 开始录音
          if (!volcAppId || !volcToken) { alert("请在 Admin 配置火山引擎参数"); return; }
          const newRec = Recorder({ type: "pcm", bitRate: 16, sampleRate: 16000, bufferSize: 4096 });
          newRec.open(() => {
              newRec.start();
              setRec(newRec);
              setIsRecording(true);
              setInteractionState('listen');
          }, (msg:string) => alert("麦克风启动失败: " + msg));
      }
  };
  // --- 管理员视图 (已修复！包含所有输入框) ---
  const AdminView = () => {
    const addNewModel = () => {
      setModelList([...modelList, { id: uuidv4(), alias: 'New', url: 'https://api.siliconflow.cn/v1/chat/completions', key: '', modelName: '' }]);
    };
    const removeModel = (id: string) => {
      if (modelList.length > 1) setModelList(modelList.filter(m => m.id !== id));
    };
    const updateModel = (id: string, field: keyof ModelConfig, value: string) => {
      setModelList(modelList.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center overflow-y-auto">
        <div className="w-full max-w-4xl pb-12">
            <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                <h1 className="text-xl font-bold flex items-center gap-2"><Settings /> System Configuration</h1>
                <button onClick={() => setCurrentView('login')} className="text-sm text-gray-400 hover:text-white">← Back</button>
            </header>
            
            <div className="space-y-8">
                {/* 1. 火山引擎语音配置 */}
                <div className="bg-gray-800 p-6 rounded border border-orange-500/50">
                    <h3 className="font-bold mb-4 text-orange-400 flex items-center gap-2"><AudioLines size={18}/> Volcengine Speech (ASR)</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">APP ID</label>
                            <input value={volcAppId} onChange={e => setVolcAppId(e.target.value)} className="w-full bg-gray-700 p-2 rounded text-sm"/>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Access Token</label>
                            <input value={volcToken} onChange={e => setVolcToken(e.target.value)} className="w-full bg-gray-700 p-2 rounded text-sm"/>
                        </div>
                    </div>
                </div>

                {/* 2. LLM 模型配置 (这是之前丢失的部分，现在加回来了！) */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-blue-400 flex items-center gap-2"><Activity size={18}/> LLM Models (AI Brain)</h3>
                    <button onClick={addNewModel} className="flex items-center gap-1 bg-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500"><PlusCircle size={14}/> Add</button>
                  </div>
                  {modelList.map((model, index) => (
                    <div key={model.id} className="bg-gray-800 p-6 rounded-lg border border-gray-700 relative">
                      <button onClick={() => removeModel(model.id)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500"><Trash2 size={18}/></button>
                      <h4 className="text-xs text-gray-500 uppercase tracking-widest mb-3">Model #{index + 1}</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <input value={model.alias} onChange={e => updateModel(model.id, 'alias', e.target.value)} placeholder="Alias" className="bg-gray-700 border-gray-600 rounded p-2 text-sm"/>
                        <input value={model.modelName} onChange={e => updateModel(model.id, 'modelName', e.target.value)} placeholder="Model Name" className="bg-gray-700 border-gray-600 rounded p-2 text-sm"/>
                        <input value={model.url} onChange={e => updateModel(model.id, 'url', e.target.value)} placeholder="Endpoint URL" className="md:col-span-2 bg-gray-700 border-gray-600 rounded p-2 text-sm"/>
                        <input type="password" value={model.key} onChange={e => updateModel(model.id, 'key', e.target.value)} placeholder="API Key (sk-...)" className="md:col-span-2 bg-gray-700 border-gray-600 rounded p-2 text-sm border-2 border-blue-500/30"/>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => setCurrentView('login')} className="w-full bg-green-600 py-3 rounded font-bold hover:bg-green-500">Save & Return</button>
            </div>
        </div>
      </div>
    );
  };

  // --- 视图渲染 (保持不变) ---
  const LoginView = () => (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">HCI Experiment</h1>
        <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Participant ID</label>
            <input type="text" value={participantName} onChange={(e) => setParticipantName(e.target.value)} className="w-full border-2 rounded-lg p-3" />
        </div>
        <div className="mb-8 grid grid-cols-2 gap-4">
            <button onClick={() => setSelectedInputMode('text')} className={`flex flex-col items-center p-4 rounded-lg border-2 ${selectedInputMode === 'text' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}><Keyboard className="mb-2 text-blue-500"/><span className="text-sm font-bold">Text</span></button>
            <button onClick={() => setSelectedInputMode('voice')} className={`flex flex-col items-center p-4 rounded-lg border-2 ${selectedInputMode === 'voice' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}><AudioLines className="mb-2 text-blue-500"/><span className="text-sm font-bold">Voice (Volc)</span></button>
        </div>
        <button onClick={handleLogin} className="w-full bg-black text-white py-4 rounded-lg font-bold flex justify-center gap-2">Start Experiment <Play size={20}/></button>
      </div>
      <button onClick={() => setCurrentView('admin')} className="fixed bottom-4 right-4 text-gray-300 p-2"><Settings size={16}/></button>
    </div>
  );

  const ParticipantView = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 relative p-4">
      <div className="absolute top-4 right-4"><button onClick={() => setCurrentView('thank_you')} className="bg-white border px-4 py-2 rounded text-sm hover:text-red-600">End Session</button></div>
      <div className="absolute top-12 text-xs text-gray-400 uppercase tracking-widest animate-pulse">{interactionState === 'process' ? 'Thinking...' : interactionState === 'speak' ? 'Speaking...' : interactionState === 'listen' ? 'Recording...' : ''}</div>
      
      {selectedInputMode === 'voice' && (
        <div className="w-full max-w-2xl h-64 mb-12 flex items-center justify-center">
            <AudioVisualizer isActive={interactionState === 'listen' || interactionState === 'speak'} mode={interactionState === 'listen' ? 'user' : assignedCondition === 'AI_Model' ? 'ai' : 'human'} />
        </div>
      )}

      <div className={`${selectedInputMode === 'text' ? 'h-96' : 'h-24'} w-full max-w-lg mb-6 overflow-y-auto bg-white rounded-xl p-4 shadow-sm border border-gray-100`}>
         {logs.slice(selectedInputMode === 'voice' ? -2 : 0).map(msg => (
           <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
             <div className={`px-4 py-2 rounded-2xl text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>{msg.content}</div>
           </div>
         ))}
      </div>

      <div className="w-full max-w-lg">
          {selectedInputMode === 'voice' ? (
              <div className="flex justify-center flex-col items-center gap-2">
                <button
                    onClick={handleMicClick}
                    disabled={interactionState === 'process' || interactionState === 'speak'}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${isRecording ? 'bg-red-500 scale-110' : 'bg-blue-600 text-white'}`}
                >
                    {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </button>
                <p className="text-xs text-gray-400">{isRecording ? "Click to Stop & Send" : "Click to Record"}</p>
              </div>
          ) : (
              <div className="flex gap-2">
                <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && processMessageExchange(inputText) && setInputText('')} placeholder="Type a message..." className="flex-1 border-2 rounded-xl px-4 py-3" />
                <button onClick={() => { processMessageExchange(inputText); setInputText(''); }} className="bg-blue-600 text-white px-6 rounded-xl"><Send size={20} /></button>
              </div>
          )}
      </div>
    </div>
  );

  const ThankYouView = () => (<div className="min-h-screen bg-white flex flex-col items-center justify-center"><h1 className="text-3xl font-bold">Session Ended</h1><button onClick={() => setCurrentView('dashboard')} className="mt-4 underline">Data</button></div>);
  const DashboardView = () => (<div className="p-8"><h1 className="text-2xl font-bold">Dashboard</h1><pre className="bg-gray-100 p-4 h-96 overflow-auto">{JSON.stringify(logs, null, 2)}</pre><button onClick={() => setCurrentView('login')} className="mt-4 bg-black text-white px-4 py-2 rounded">New Session</button></div>);

  return <div className="font-sans text-gray-900">{currentView === 'login' && <LoginView />}{currentView === 'participant' && <ParticipantView />}{currentView === 'thank_you' && <ThankYouView />}{currentView === 'admin' && <AdminView />}{currentView === 'dashboard' && <DashboardView />}</div>;
}
