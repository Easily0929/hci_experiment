// App.tsx - HCI实验平台完整代码
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Settings, Activity, Play, Trash2, PlusCircle, Send, Mic, MicOff, Keyboard, 
  AudioLines, Volume2, AlertCircle, RefreshCw, User, Fingerprint
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// 定义 SpeechRecognition 类型
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// --- 配置区 ---
const SUPABASE_URL = 'https://pqhrtviidwuwspubaxfm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxaHJ0dmlpZHd1d3NwdWJheGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ1NTQwNzEsImV4cCI6MjA4MDEzMDA3MX0.2UXvn6wk9Qlhq_HnRKm5bqIrFKwwPTuBq0kyXxa-WDI';

// 创建单例的Supabase客户端，避免重复实例
let supabaseInstance: ReturnType<typeof createClient> | null = null;

const getSupabaseClient = () => {
  if (!supabaseInstance && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: undefined,
      }
    });
  }
  return supabaseInstance;
};

// --- 类型定义 ---
type Condition = 'AI_Model' | 'Human_Partner';
type InputMode = 'text' | 'voice';
type AppView = 'login' | 'participant' | 'admin' | 'dashboard' | 'thank_you';
type VoiceModelConfig = { 
  id: string; 
  alias: string; 
  recognitionType: 'browser' | 'custom';
  recognitionUrl?: string;
  recognitionKey?: string;
  recognitionModel?: string;
  synthesisType: 'browser' | 'custom';
  synthesisUrl?: string;
  synthesisKey?: string;
  synthesisVoice?: string;
  synthesisRate?: number;
  synthesisPitch?: number;
  textLLM: {
    url: string;
    key: string;
    modelName: string;
    systemPrompt: string;
  }
};

type Message = {
  id: string; sessionId: string; participantName: string; userId: string;
  voiceModelId: string; condition: Condition; inputMode: InputMode; 
  actualModelUsed: string; role: 'user' | 'partner' | 'system' | 'assistant';
  content: string; timestamp: number; latency?: number;
};

// --- 音频可视化组件 ---
const AudioVisualizer = ({ isActive, mode, volumeLevel = 0 }: { isActive: boolean; mode: string; volumeLevel?: number }) => {
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
        const amp = isActive ? Math.sin((x + offset) * 0.05) * (30 + volumeLevel * 50) * Math.random() : 1;
        ctx.lineTo(x, 75 + amp);
      }
      ctx.stroke();
      offset += 5;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [isActive, mode, volumeLevel]);
  return <canvas ref={ref} width={600} height={150} className="w-full h-full" />;
};

// --- 修复的文本输入组件 ---
const PersistentTextInput = React.memo(({
  onSubmit,
  disabled,
  placeholder = "输入消息后按回车发送..."
}: {
  onSubmit: (text: string) => void;
  disabled: boolean;
  placeholder?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, []);
  
  useEffect(() => {
    if (!disabled && inputRef.current && !isFocused) {
      const timer = setTimeout(() => {
        if (inputRef.current && !disabled) {
          inputRef.current.focus();
          setIsFocused(true);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [disabled, isFocused]);
  
  const handleSubmit = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !disabled) {
      onSubmit(trimmedValue);
      setInputValue('');
      
      setTimeout(() => {
        if (inputRef.current && !disabled) {
          inputRef.current.focus();
        }
      }, 10);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  const handleFocus = () => {
    setIsFocused(true);
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    if (!disabled) {
      setTimeout(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
        }
      }, 150);
    }
  };
  
  return (
    <div className="flex-1 relative">
      <input 
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
        disabled={disabled}
        maxLength={500}
      />
      {inputValue.length > 0 && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
          {inputValue.length}/500
        </div>
      )}
    </div>
  );
});

PersistentTextInput.displayName = 'PersistentTextInput';

// --- 聊天消息组件 ---
const ChatMessage = React.memo(({ 
  message, 
  condition,
  isSpeaking = false
}: { 
  message: Message; 
  condition: Condition;
  isSpeaking?: boolean;
}) => {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
      <div className={`px-4 py-3 rounded-2xl max-w-[85%] md:max-w-[70%] shadow-lg transition-all ${
        message.role === 'user' 
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-none' 
          : isSpeaking
            ? 'bg-gradient-to-r from-green-100 to-green-200 text-gray-800 rounded-bl-none border-2 border-green-400 shadow-green-200'
            : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
      }`}>
        <div className="flex items-center gap-2 font-medium text-xs opacity-80 mb-1">
          {message.role === 'user' ? (
            <>
              <span>👤 您</span>
              <span className="text-xs">· 语音输入</span>
            </>
          ) : (
            <>
              <span>{condition === 'AI_Model' ? '🤖 AI助手' : '👤 人类伙伴'}</span>
              {isSpeaking && (
                <span className="flex items-center gap-1 text-green-600 animate-pulse">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  正在说话...
                </span>
              )}
            </>
          )}
        </div>
        <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</div>
        {message.latency && (
          <div className="text-xs opacity-60 mt-1 text-right">
            响应时间: {message.latency}ms
          </div>
        )}
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';

// --- Edge浏览器语音识别Hook（优化版）---
const useEdgeSpeechRecognition = (onResult?: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasResultRef = useRef(false);
  const transcriptResultRef = useRef({ final: '', interim: '' });
  
  // 检查麦克风权限
  const checkMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (permission.state === 'denied') {
        setError('麦克风权限被拒绝。请在浏览器设置中允许此网站使用麦克风。');
        return false;
      }
      
      // 尝试获取麦克风访问权限
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('无法访问麦克风。请点击地址栏的麦克风图标允许权限。');
          return false;
        }
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('未检测到麦克风设备。请检查麦克风是否已连接。');
          return false;
        }
        console.warn('麦克风权限检查警告:', err);
        return true; // 继续尝试，可能是其他问题
      }
    } catch (err) {
      // 某些浏览器不支持 permissions API，继续尝试
      console.warn('权限检查API不支持，继续尝试:', err);
      return true;
    }
  }, []);
  
  const startListening = useCallback(async () => {
    // 清理之前的状态
    setError('');
    setTranscript('');
    hasResultRef.current = false;
    
    // 如果已有识别实例在运行，先停止
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // 忽略停止错误
      }
      recognitionRef.current = null;
    }
    
    // 清理之前的超时
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    const userAgent = navigator.userAgent;
    const isEdge = /Edg\/\d+/.test(userAgent);
    const isChrome = /Chrome\/\d+/.test(userAgent) && !/Edg\/\d+/.test(userAgent);
    
    if (!isEdge && !isChrome) {
      setError('请使用Edge或Chrome浏览器以获得最佳语音识别体验');
      setIsSupported(false);
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('您的浏览器不支持语音识别API。请更新到最新版Edge或Chrome。');
      setIsSupported(false);
      return;
    }
    
    // 检查麦克风权限
    const hasPermission = await checkMicrophonePermission();
    if (!hasPermission) {
      setIsListening(false);
      return;
    }
    
    // 创建新的识别实例
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';
    recognition.maxAlternatives = 1;
    
    // 重置结果跟踪
    transcriptResultRef.current = { final: '', interim: '' };
    
    recognition.onstart = () => {
      console.log('语音识别开始');
      setIsListening(true);
      hasResultRef.current = false;
      transcriptResultRef.current = { final: '', interim: '' };
      
      // 设置更长的超时时间（20秒）
      timeoutRef.current = setTimeout(() => {
        if (!hasResultRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            console.log('超时停止识别时出错:', e);
          }
          const result = transcriptResultRef.current;
          if (!result.final.trim() && !result.interim.trim()) {
            setError('录音超时（20秒）。\n\n请尝试：\n1. 确保麦克风正常工作\n2. 说话时声音清晰\n3. 检查麦克风音量设置\n4. 点击"重试"按钮');
          }
          setIsListening(false);
        }
      }, 20000); // 延长到20秒
    };
    
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript += transcript;
          hasResultRef.current = true;
          console.log('识别到最终结果片段:', transcript);
        } else {
          interimTranscript += transcript;
        }
      }
      
      // 更新 ref 中的结果
      transcriptResultRef.current = {
        final: finalTranscript,
        interim: interimTranscript
      };
      
      console.log('识别结果更新:', { final: finalTranscript, interim: interimTranscript });
      
      // 更新显示的文本
      const displayText = finalTranscript || interimTranscript;
      if (displayText) {
        setTranscript(displayText);
      }
      
      // 如果有最终结果，停止识别并准备提交
      if (finalTranscript) {
        console.log('有最终结果，准备停止识别:', finalTranscript);
        // 清理超时
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        // 确保 transcript 状态已更新
        setTranscript(finalTranscript);
        try {
          recognition.stop();
        } catch (e) {
          console.log('停止识别时出错:', e);
        }
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('语音识别错误:', event.error);
      
      // 清理超时
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      let errorMessage = '';
      let shouldRetry = false;
      
      switch (event.error) {
        case 'no-speech':
          // no-speech 错误不立即显示，等待onend处理
          errorMessage = '';
          shouldRetry = true;
          break;
        case 'audio-capture':
          errorMessage = '无法访问麦克风。\n\n解决方案：\n1. 点击地址栏左侧的麦克风图标\n2. 选择"始终允许此站点使用麦克风"\n3. 检查系统麦克风设置\n4. 确保没有其他程序占用麦克风';
          break;
        case 'not-allowed':
          errorMessage = '麦克风访问被拒绝。\n\n权限设置：\n1. 点击右上角菜单（...）\n2. 选择"设置" → "站点权限"\n3. 找到"麦克风"并允许\n4. 刷新页面后重试';
          break;
        case 'service-not-allowed':
          errorMessage = '语音识别服务不可用。\n\n请检查：\n1. 网络连接是否正常\n2. 是否使用HTTPS（本地开发可用localhost）\n3. 尝试重启浏览器';
          break;
        case 'network':
          errorMessage = '网络错误。请检查网络连接后重试。';
          shouldRetry = true;
          break;
        case 'aborted':
          // 用户主动停止，不显示错误
          errorMessage = '';
          break;
        default:
          errorMessage = `语音识别出错: ${event.error}\n\n请尝试刷新页面或重启浏览器。`;
      }
      
      if (errorMessage) {
        setError(errorMessage);
      }
      setIsListening(false);
    };
    
    recognition.onend = () => {
      console.log('语音识别结束');
      setIsListening(false);
      
      // 清理超时
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // 使用 ref 获取最新的识别结果
      const result = transcriptResultRef.current;
      console.log('识别结束时的结果:', result);
      
      // 确定要使用的文本（优先使用最终结果，否则使用临时结果）
      const textToUse = result.final.trim() || result.interim.trim();
      
      if (textToUse) {
        console.log('识别到结果，准备设置 transcript:', textToUse);
        setTranscript(textToUse);
        // 如果有回调函数，直接调用
        if (onResult) {
          console.log('🚀 通过回调直接提交识别结果:', textToUse);
          setTimeout(() => {
            onResult(textToUse);
          }, 100);
        }
      } else {
        // 如果没有结果，检查是否有错误
        setTimeout(() => {
          const latestResult = transcriptResultRef.current;
          setError(prevError => {
            // 只有在没有错误且没有结果时才设置错误
            if (!prevError && !latestResult.final.trim() && !latestResult.interim.trim()) {
              return '没有检测到语音。\n\n请尝试：\n1. 点击"重试"按钮\n2. 说话时保持麦克风距离10-20厘米\n3. 确保在安静环境下清晰说话\n4. 检查麦克风音量是否足够\n5. 确保浏览器为最新版本';
            }
            return prevError;
          });
        }, 500);
      }
      
      recognitionRef.current = null;
    };
    
    try {
      recognition.start();
    } catch (err: any) {
      console.error('启动语音识别失败:', err);
      
      // 清理超时
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      let errorMsg = `启动语音识别失败: ${err.message || '未知错误'}`;
      
      if (err.message?.includes('already started') || err.message?.includes('started')) {
        errorMsg = '语音识别已在运行中。如果问题持续，请刷新页面。';
      } else {
        errorMsg += '\n\n请确保：\n1. Edge/Chrome浏览器已更新到最新版本\n2. 麦克风硬件正常工作\n3. 没有其他程序占用麦克风\n4. 已授予浏览器麦克风权限';
      }
      
      setError(errorMsg);
      setIsListening(false);
      recognitionRef.current = null;
    }
  }, [checkMicrophonePermission, error]);
  
  const stopListening = useCallback(() => {
    // 清理超时
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // 停止识别
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('停止识别时出错:', e);
      }
      recognitionRef.current = null;
    }
    
    setIsListening(false);
    setError('');
  }, []);
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // 忽略清理错误
        }
      }
    };
  }, []);
  
  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
  };
};

// --- 主组件 ---
const HCIExperimentPlatform = () => {
  const [currentView, setCurrentView] = useState<AppView>('login');
  
  // 用户相关状态
  const [userId, setUserId] = useState<string>(() => {
    const storedUserId = localStorage.getItem('hci_user_id');
    if (storedUserId) return storedUserId;
    
    const newUserId = uuidv4();
    localStorage.setItem('hci_user_id', newUserId);
    return newUserId;
  });
  
  const [sessionId] = useState(() => uuidv4());
  const [participantName, setParticipantName] = useState('');
  const [assignedCondition, setAssignedCondition] = useState<Condition>('AI_Model');
  const [selectedInputMode, setSelectedInputMode] = useState<InputMode>('voice');
  const [isListening, setIsListening] = useState(false);
  const [interactionState, setInteractionState] = useState<'idle' | 'listen' | 'process' | 'speak'>('idle');
  const [logs, setLogs] = useState<Message[]>([]);
  
  // 使用修复后的语音识别Hook
  const {
    isListening: speechListening,
    transcript,
    error: speechError,
    isSupported: speechSupported,
    startListening,
    stopListening,
  } = useEdgeSpeechRecognition((text) => {
    // 当识别完成时，直接提交
    console.log('🎯 识别完成回调触发，检查条件:', {
      text,
      textTrimmed: text?.trim(),
      interactionState,
      currentView,
      hasProcessMessageExchange: !!processMessageExchangeRef.current
    });
    
    if (text && text.trim()) {
      // 不检查 interactionState 和 currentView，直接提交
      console.log('✅ 条件满足，准备提交消息:', text);
      // 使用 ref 来访问 processMessageExchange
      if (processMessageExchangeRef.current) {
        console.log('🚀 调用 processMessageExchange');
        processMessageExchangeRef.current(text);
      } else {
        console.warn('⚠️ processMessageExchange 尚未初始化，延迟提交');
        setTimeout(() => {
          if (processMessageExchangeRef.current) {
            console.log('🚀 延迟后调用 processMessageExchange');
            processMessageExchangeRef.current(text);
          } else {
            console.error('❌ processMessageExchange 仍然不可用');
          }
        }, 500);
      }
    } else {
      console.log('❌ 文本为空，不提交');
    }
  });
  
  // 同步状态
  useEffect(() => {
    setIsListening(speechListening);
    setRecognitionError(speechError);
    setBrowserSupport(speechSupported);
  }, [speechListening, speechError, speechSupported]);
  
  // 语音识别结果自动提交的 refs（在 processMessageExchange 定义后使用）
  const previousTranscriptRef = useRef('');
  const submittedTranscriptRef = useRef('');
  const processMessageExchangeRef = useRef<((text: string) => Promise<void>) | null>(null);
  
  // 语音识别状态
  const speechRecognitionRef = useRef<any>(null);
  const [browserSupport, setBrowserSupport] = useState(true);
  const [recognitionError, setRecognitionError] = useState('');

  // Supabase客户端（使用单例模式）
  const supabase = getSupabaseClient();

  // 语音大模型配置（使用阿里云 DashScope API）
  const [voiceModelList, setVoiceModelList] = useState<VoiceModelConfig[]>([
    {
      id: 'model_1',
      alias: 'AI助手 - 温柔女声',
      recognitionType: 'browser',
      synthesisType: 'browser',
      synthesisRate: 1.0,
      synthesisPitch: 1.0,
      textLLM: {
        url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        key: 'sk-c5e6833061944016adc237cc5bc92da8',
        modelName: 'qwen-plus',
        systemPrompt: '你是一个温柔、友善的AI助手，说话语气温和，用词礼貌。请用中文回复。'
      }
    },
    {
      id: 'model_2',
      alias: 'AI助手 - 专业男声',
      recognitionType: 'browser',
      synthesisType: 'browser',
      synthesisRate: 0.9,
      synthesisPitch: 0.8,
      textLLM: {
        url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        key: 'sk-c5e6833061944016adc237cc5bc92da8',
        modelName: 'qwen-plus',
        systemPrompt: '你是一个专业、严谨的AI助手，回答问题准确，逻辑清晰。请用中文回复。'
      }
    },
    {
      id: 'model_3',
      alias: '人类伙伴 - 自然声音',
      recognitionType: 'browser',
      synthesisType: 'browser',
      synthesisRate: 1.1,
      synthesisPitch: 1.2,
      textLLM: {
        url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        key: 'sk-c5e6833061944016adc237cc5bc92da8',
        modelName: 'qwen-plus',
        systemPrompt: '你正在假装是一个人类参与者，说话要自然、随意，可以有一些口头禅和停顿。请用中文回复，不要透露你是AI。'
      }
    },
  ]);

  // 当前用户绑定的语音模型
  const [assignedVoiceModel, setAssignedVoiceModel] = useState<VoiceModelConfig | null>(() => {
    const storedModelId = localStorage.getItem(`hci_user_model_${userId}`);
    if (storedModelId) {
      const model = voiceModelList.find(m => m.id === storedModelId);
      if (model) return model;
    }
    return null;
  });

  // Edge浏览器兼容性检查
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isEdge = /Edg\/\d+/.test(userAgent);
    const isChrome = /Chrome\/\d+/.test(userAgent) && !/Edg\/\d+/.test(userAgent);
    
    if (!isEdge && !isChrome) {
      setBrowserSupport(false);
      setRecognitionError('请使用Edge或Chrome浏览器以获得最佳语音识别体验');
    } else {
      if (isEdge) {
        const edgeVersion = parseInt(/Edg\/(\d+)/.exec(userAgent)![1]);
        if (edgeVersion < 79) {
          setRecognitionError(`您的Edge浏览器版本（${edgeVersion}）过低，请更新到最新版本以获得语音识别支持`);
        }
      }
    }
  }, []);

  // 处理麦克风点击
  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // 重试语音识别
  const retrySpeechRecognition = useCallback(() => {
    setRecognitionError('');
    startListening();
  }, [startListening]);

  // 切换到文本模式
  const switchToTextMode = useCallback(() => {
    setSelectedInputMode('text');
    setRecognitionError('');
  }, []);

  // 切换到语音模式
  const switchToVoiceMode = useCallback(() => {
    if (!browserSupport) {
      alert('您的浏览器不支持语音识别，请使用Chrome或Edge浏览器');
      return;
    }
    setSelectedInputMode('voice');
  }, [browserSupport]);

  // 数据上传
  const uploadToCloud = useCallback(async (msg: Message) => {
    if (!supabase) return;
    try {
      await supabase.from('experiment_logs').insert({
        session_id: msg.sessionId,
        participant_name: msg.participantName,
        user_id: msg.userId,
        voice_model_id: msg.voiceModelId,
        condition: msg.condition,
        role: msg.role,
        content: msg.content,
        latency: msg.latency || 0,
        timestamp: new Date(msg.timestamp).toISOString(),
      });
    } catch (error) { 
      console.error('上传失败', error); 
    }
  }, [supabase]);

  // 登录处理
  const handleLogin = useCallback(() => {
    if (!participantName.trim()) {
      alert('请输入姓名');
      return;
    }
    
    if (selectedInputMode === 'voice' && !browserSupport) {
      alert('您的浏览器不支持语音识别，已自动切换到文本模式');
      setSelectedInputMode('text');
    }
    
    // 分配实验条件
    const condition: Condition = Math.random() > 0.5 ? 'AI_Model' : 'Human_Partner';
    setAssignedCondition(condition);
    
    // 分配或获取已绑定的语音模型
    let voiceModel = assignedVoiceModel;
    if (!voiceModel) {
      const randomIndex = Math.floor(Math.random() * voiceModelList.length);
      voiceModel = voiceModelList[randomIndex];
      setAssignedVoiceModel(voiceModel);
      localStorage.setItem(`hci_user_model_${userId}`, voiceModel.id);
    }
    
    setCurrentView('participant');
  }, [participantName, selectedInputMode, browserSupport, voiceModelList, assignedVoiceModel, userId]);

  // 核心对话逻辑
  const processMessageExchange = useCallback(async (userText: string) => {
    if (!assignedVoiceModel) {
      alert('未分配语音模型，请重新登录');
      return;
    }
    
    setInteractionState('process');
    const userMsg: Message = {
      id: Date.now().toString(), 
      sessionId, 
      participantName, 
      userId,
      voiceModelId: assignedVoiceModel.id,
      condition: assignedCondition,
      inputMode: selectedInputMode, 
      actualModelUsed: assignedVoiceModel.alias,
      role: 'user', 
      content: userText, 
      timestamp: Date.now(),
    };
    
    setLogs(prev => [...prev, userMsg]);
    uploadToCloud(userMsg);

    try {
      const config = assignedVoiceModel.textLLM;
      if (!config.key) {
        throw new Error('AI API Key 缺失。请检查管理员设置。');
      }
      
      const start = Date.now();
      const systemMsg = { 
        role: 'system', 
        content: config.systemPrompt
      };
      
      const newHistory = [...logs, userMsg];
      const apiMessages = [
        systemMsg, 
        ...newHistory.map(l => ({
          role: (l.role === 'partner' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: l.content,
        }))
      ];

      const res = await fetch(config.url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${config.key}` 
        },
        body: JSON.stringify({ 
          model: config.modelName, 
          messages: apiMessages 
        }),
      });
      
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      const partnerText = data.choices[0]?.message?.content || '没有返回内容';
      const latency = Date.now() - start;
      const partnerMsg: Message = {
        id: (Date.now() + 1).toString(), 
        sessionId, 
        participantName, 
        userId,
        voiceModelId: assignedVoiceModel.id,
        condition: assignedCondition,
        inputMode: selectedInputMode, 
        actualModelUsed: assignedVoiceModel.alias, 
        role: 'partner',
        content: partnerText, 
        timestamp: Date.now(), 
        latency,
      };
      
      setLogs(prev => [...prev, partnerMsg]);
      uploadToCloud(partnerMsg);
      setInteractionState('speak');

      // 语音合成函数（在 if 之前定义）
      const startSpeechSynthesis = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        
        if (assignedVoiceModel.synthesisRate) utterance.rate = assignedVoiceModel.synthesisRate;
        if (assignedVoiceModel.synthesisPitch) utterance.pitch = assignedVoiceModel.synthesisPitch;
        
        utterance.onstart = () => {
          console.log('🔊 开始语音播放');
          setInteractionState('speak');
        };
        
        utterance.onend = () => {
          console.log('✅ 语音播放完成');
          setInteractionState('idle');
        };
        
        utterance.onerror = (e: any) => {
          console.error('❌ 语音播放错误:', e.error, e);
          // 如果是 interrupted 错误，可能是被新语音中断，这是正常的
          if (e.error !== 'interrupted') {
            console.warn('语音播放出错，但继续显示文本');
          }
          setInteractionState('idle');
        };
        
        utterance.onpause = () => {
          console.log('⏸️ 语音播放暂停');
        };
        
        utterance.onresume = () => {
          console.log('▶️ 语音播放恢复');
        };
        
        console.log('🚀 开始播放语音');
        window.speechSynthesis.speak(utterance);
      };

      // 语音合成回复（语音模式下总是启用）
      if (selectedInputMode === 'voice') {
        console.log('🎤 准备语音合成回复:', partnerText.substring(0, 50) + '...');
        
        // 等待一小段时间确保状态稳定
        setTimeout(() => {
          try {
            // 先取消之前的语音
            if (window.speechSynthesis.speaking) {
              console.log('⚠️ 检测到正在播放，先停止');
              window.speechSynthesis.cancel();
              // 等待停止完成
              setTimeout(() => {
                startSpeechSynthesis(partnerText);
              }, 100);
            } else {
              startSpeechSynthesis(partnerText);
            }
          } catch (err) {
            console.error('语音合成启动失败:', err);
            setInteractionState('idle');
          }
        }, 200);
      } else {
        setInteractionState('idle');
      }
    } catch (e: any) {
      alert('对话出错: ' + e.message);
      setInteractionState('idle');
    }
  }, [sessionId, participantName, userId, assignedVoiceModel, assignedCondition, selectedInputMode, logs, uploadToCloud]);
  
  // 保存 processMessageExchange 到 ref，供语音识别使用
  useEffect(() => {
    processMessageExchangeRef.current = processMessageExchange;
  }, [processMessageExchange]);

  // 语音识别结果自动提交
  useEffect(() => {
    console.log('自动提交 useEffect 触发:', {
      transcript,
      selectedInputMode,
      isListening,
      interactionState,
      currentView,
      previousTranscript: previousTranscriptRef.current,
      submittedTranscript: submittedTranscriptRef.current
    });
    
    // 当识别完成且有最终结果时，自动提交
    if (
      selectedInputMode === 'voice' && 
      transcript && 
      transcript.trim() && 
      transcript !== previousTranscriptRef.current &&
      transcript !== submittedTranscriptRef.current &&
      !isListening && 
      interactionState === 'idle' &&
      currentView === 'participant'
    ) {
      // 检查是否是最终结果（不是临时结果）
      // 如果 transcript 有值且识别已停止，说明是最终结果
      const finalText = transcript.trim();
      if (finalText && finalText.length > 0) {
        console.log('✅ 条件满足，准备自动提交语音识别结果:', finalText);
        submittedTranscriptRef.current = finalText;
        previousTranscriptRef.current = finalText;
        // 延迟一点确保状态稳定
        setTimeout(() => {
          console.log('🚀 开始处理消息:', finalText);
          processMessageExchange(finalText);
        }, 500);
      }
    } else {
      // 记录为什么没有提交
      if (selectedInputMode !== 'voice') {
        console.log('❌ 未提交：不是语音模式');
      } else if (!transcript || !transcript.trim()) {
        console.log('❌ 未提交：transcript 为空');
      } else if (transcript === previousTranscriptRef.current) {
        console.log('❌ 未提交：transcript 与 previous 相同');
      } else if (transcript === submittedTranscriptRef.current) {
        console.log('❌ 未提交：transcript 已提交过');
      } else if (isListening) {
        console.log('❌ 未提交：仍在监听中');
      } else if (interactionState !== 'idle') {
        console.log('❌ 未提交：交互状态不是 idle，当前状态:', interactionState);
      } else if (currentView !== 'participant') {
        console.log('❌ 未提交：当前视图不是 participant，当前视图:', currentView);
      }
      
      if (transcript !== previousTranscriptRef.current) {
        previousTranscriptRef.current = transcript || '';
      }
    }
  }, [transcript, isListening, selectedInputMode, interactionState, currentView, processMessageExchange]);

  // 管理员视图
  const AdminView = () => {
    const addNewVoiceModel = () => setVoiceModelList([...voiceModelList, {
      id: `model_${Date.now()}`,
      alias: '新语音模型',
      recognitionType: 'browser',
      synthesisType: 'browser',
      synthesisRate: 1.0,
      synthesisPitch: 1.0,
      textLLM: {
        url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        key: 'sk-c5e6833061944016adc237cc5bc92da8',
        modelName: 'qwen-plus',
        systemPrompt: '你是一个有帮助的AI助手。'
      }
    }]);
    
    const removeVoiceModel = (id: string) => { 
      if (voiceModelList.length > 1) {
        setVoiceModelList(voiceModelList.filter(m => m.id !== id));
      }
    };
    
    const updateVoiceModel = (id: string, field: string, value: any) => {
      setVoiceModelList(voiceModelList.map(m => {
        if (m.id === id) {
          if (field.includes('.')) {
            const [parent, child] = field.split('.');
            return {
              ...m,
              [parent]: {
                ...m[parent as keyof VoiceModelConfig] as any,
                [child]: value
              }
            };
          }
          return { ...m, [field]: value };
        }
        return m;
      }));
    };

    // Edge浏览器诊断工具
    const EdgeDiagnostic = () => {
      const [diagnosticInfo, setDiagnosticInfo] = useState('');
      
      const runDiagnostic = async () => {
        const info = [];
        const userAgent = navigator.userAgent;
        const isEdge = /Edg\/\d+/.test(userAgent);
        
        info.push(`🌐 浏览器: ${isEdge ? 'Microsoft Edge' : '其他'}`);
        info.push(`🔧 用户代理: ${userAgent}`);
        
        if (isEdge) {
          const edgeVersion = parseInt(/Edg\/(\d+)/.exec(userAgent)![1]);
          info.push(`📊 Edge版本: ${edgeVersion}`);
          info.push(edgeVersion >= 79 ? '✅ 版本支持语音识别' : '❌ 版本过低，请更新到79+');
        }
        
        // 检查麦克风权限
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as any });
          info.push(`🎤 麦克风权限: ${permission.state}`);
          
          if (permission.state === 'prompt' || permission.state === 'granted') {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              info.push('✅ 可以访问麦克风');
              stream.getTracks().forEach(track => track.stop());
            } catch (err: any) {
              info.push(`❌ 麦克风访问失败: ${err.message}`);
            }
          }
        } catch (err: any) {
          info.push(`❌ 权限查询失败: ${err.message}`);
        }
        
        // 检查SpeechRecognition支持
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        info.push(SpeechRecognition ? '✅ 支持SpeechRecognition API' : '❌ 不支持SpeechRecognition API');
        
        // 检查页面协议
        info.push(window.location.protocol === 'https:' 
          ? '🔒 使用HTTPS' 
          : '⚠️ 使用HTTP（建议HTTPS）');
        
        setDiagnosticInfo(info.join('\n'));
      };
      
      return (
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-4 rounded-lg border border-blue-500 mb-6">
          <h3 className="font-bold mb-3 text-yellow-300 flex items-center gap-2">
            🔍 Edge浏览器诊断工具
          </h3>
          <button 
            onClick={runDiagnostic}
            className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded mb-3"
          >
            运行Edge兼容性诊断
          </button>
          {diagnosticInfo && (
            <pre className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded whitespace-pre-wrap">
              {diagnosticInfo}
            </pre>
          )}
        </div>
      );
    };

    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 flex flex-col items-center overflow-y-auto">
        <div className="w-full max-w-4xl pb-12">
          <header className="flex justify-between items-center mb-6 md:mb-8 border-b border-gray-700 pb-4">
            <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <Settings /> 系统配置
            </h1>
            <button 
              onClick={() => setCurrentView('login')} 
              className="text-sm text-gray-400 hover:text-white"
            >
              返回
            </button>
          </header>

          <EdgeDiagnostic />
          
          <div className="space-y-6 md:space-y-8">
            {/* 语音识别信息 */}
            <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-4 md:p-6 rounded-lg border border-blue-500">
              <h3 className="font-bold mb-3 md:mb-4 text-yellow-300 flex items-center gap-2">
                <Volume2 size={18} /> 语音识别配置
              </h3>
              
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${browserSupport ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">
                    {browserSupport ? '✅ 浏览器支持语音识别' : '❌ 浏览器不支持语音识别'}
                  </span>
                </div>
                
                <div className="text-sm text-gray-300 bg-gray-800/50 p-3 md:p-4 rounded">
                  <p className="font-bold mb-2">💡 Edge浏览器语音识别使用说明：</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>确保使用 <strong>Edge 浏览器（版本79+）</strong></li>
                    <li>首次使用时，点击地址栏左侧<strong>🎤图标</strong>允许麦克风访问</li>
                    <li>如果看不到🎤图标，访问 <code>edge://settings/content/microphone</code> 检查全局设置</li>
                    <li>在<strong>安静的环境</strong>下使用，避免背景噪音</li>
                    <li>说话时<strong>靠近麦克风</strong>，音量适中</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* 语音大模型配置 */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-blue-400 flex items-center gap-2">
                  <AudioLines size={18} /> 语音大模型配置
                </h3>
                <button 
                  onClick={addNewVoiceModel} 
                  className="flex items-center gap-1 bg-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500"
                >
                  <PlusCircle size={14} /> 添加模型
                </button>
              </div>
              
              {voiceModelList.map((model, i) => (
                <div key={model.id} className="bg-gray-800 p-4 md:p-6 rounded-lg border border-gray-700 relative">
                  <button 
                    onClick={() => removeVoiceModel(model.id)} 
                    className="absolute top-3 right-3 md:top-4 md:right-4 text-gray-500 hover:text-red-500"
                    disabled={voiceModelList.length <= 1}
                  >
                    <Trash2 size={18} />
                  </button>
                  <h4 className="text-xs text-gray-500 uppercase tracking-widest mb-3">
                    模型 #{i + 1}: {model.alias}
                  </h4>
                  
                  <div className="space-y-4">
                    {/* 基础信息 */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">模型别名</label>
                      <input 
                        value={model.alias} 
                        onChange={e => updateVoiceModel(model.id, 'alias', e.target.value)} 
                        placeholder="模型别名" 
                        className="w-full bg-gray-700 p-2 rounded text-sm" 
                      />
                    </div>
                    
                    {/* 语音合成配置 */}
                    <div className="border-l-4 border-green-500 pl-3">
                      <h5 className="text-sm font-semibold mb-2 text-green-300">语音合成配置</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">语速</label>
                          <input 
                            type="range" 
                            min="0.5" max="2" step="0.1"
                            value={model.synthesisRate || 1} 
                            onChange={e => updateVoiceModel(model.id, 'synthesisRate', parseFloat(e.target.value))} 
                            className="w-full"
                          />
                          <span className="text-xs text-gray-400">{model.synthesisRate || 1}</span>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">音调</label>
                          <input 
                            type="range" 
                            min="0.5" max="2" step="0.1"
                            value={model.synthesisPitch || 1} 
                            onChange={e => updateVoiceModel(model.id, 'synthesisPitch', parseFloat(e.target.value))} 
                            className="w-full"
                          />
                          <span className="text-xs text-gray-400">{model.synthesisPitch || 1}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 文本LLM配置 */}
                    <div className="border-l-4 border-yellow-500 pl-3">
                      <h5 className="text-sm font-semibold mb-2 text-yellow-300">文本LLM配置</h5>
                      <div className="space-y-2">
                        <input 
                          value={model.textLLM.url} 
                          onChange={e => updateVoiceModel(model.id, 'textLLM.url', e.target.value)} 
                          placeholder="API URL" 
                          className="w-full bg-gray-700 p-2 rounded text-sm" 
                        />
                        <input 
                          type="password" 
                          value={model.textLLM.key} 
                          onChange={e => updateVoiceModel(model.id, 'textLLM.key', e.target.value)} 
                          placeholder="API Key" 
                          className="w-full bg-gray-700 p-2 rounded text-sm border-2 border-blue-500/30" 
                        />
                        <input 
                          value={model.textLLM.modelName} 
                          onChange={e => updateVoiceModel(model.id, 'textLLM.modelName', e.target.value)} 
                          placeholder="模型名称" 
                          className="w-full bg-gray-700 p-2 rounded text-sm" 
                        />
                        <textarea 
                          value={model.textLLM.systemPrompt} 
                          onChange={e => updateVoiceModel(model.id, 'textLLM.systemPrompt', e.target.value)} 
                          placeholder="系统提示词" 
                          className="w-full bg-gray-700 p-2 rounded text-sm h-24"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setCurrentView('login')} 
              className="w-full bg-green-600 py-3 rounded font-bold hover:bg-green-500 transition-colors"
            >
              保存并返回
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 登录视图
  const LoginView = () => {
    const [showEdgeTips, setShowEdgeTips] = useState(false);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Fingerprint className="text-white" size={28} />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">HCI 语音交互实验平台</h1>
          <p className="text-gray-600 text-center mb-6 md:mb-8">Edge浏览器优化版</p>
          
          {/* Edge浏览器提示 */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-800">🎯 Edge浏览器用户</span>
              </div>
              <button 
                onClick={() => setShowEdgeTips(!showEdgeTips)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {showEdgeTips ? '隐藏提示' : '查看使用提示'}
              </button>
            </div>
            
            {showEdgeTips && (
              <div className="mt-2 text-sm text-blue-700 space-y-1">
                <p className="font-medium">使用语音功能前请确保：</p>
                <ol className="list-decimal list-inside ml-2 space-y-1">
                  <li>点击地址栏左侧的🔒或🎤图标</li>
                  <li>允许此网站使用麦克风</li>
                  <li>首次使用可能需要等待几秒</li>
                  <li>在安静环境下清晰说话</li>
                </ol>
              </div>
            )}
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <span className="text-red-500">*</span> 参与者姓名
            </label>
            <input 
              type="text" 
              value={participantName} 
              onChange={(e) => setParticipantName(e.target.value)} 
              className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="请输入您的姓名"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && participantName.trim()) {
                  handleLogin();
                }
              }}
            />
          </div>
          
          <div className="mb-6 md:mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-4">选择交互模式</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setSelectedInputMode('text')} 
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${selectedInputMode === 'text' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <Keyboard className="mb-2 text-blue-500" size={24} />
                <span className="text-sm font-bold">文本模式</span>
                <span className="text-xs text-gray-500 mt-1">键盘输入</span>
              </button>
              <button 
                onClick={switchToVoiceMode} 
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${selectedInputMode === 'voice' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <AudioLines className="mb-2 text-blue-500" size={24} />
                <span className="text-sm font-bold">语音模式</span>
                <span className="text-xs text-gray-500 mt-1">语音对话</span>
              </button>
            </div>
            
            {!browserSupport && selectedInputMode === 'voice' && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  您的浏览器不支持语音识别，请使用Edge或Chrome浏览器
                </p>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleLogin} 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
          >
            开始实验 <Play size={20} />
          </button>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-bold text-gray-700 mb-2">🔧 语音功能测试</h4>
            <p className="text-xs text-gray-600 mb-2">
              如果语音识别有问题，请尝试：
            </p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• 点击浏览器地址栏的麦克风图标检查权限</li>
              <li>• 确保没有其他程序占用麦克风</li>
              <li>• 更新Edge浏览器到最新版本</li>
              <li>• 在Edge设置中检查麦克风权限</li>
            </ul>
          </div>
        </div>
        
        <button 
          onClick={() => setCurrentView('admin')} 
          className="fixed bottom-6 right-6 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
          title="系统配置"
        >
          <Settings size={20} />
        </button>
      </div>
    );
  };

  // 参与者视图
  const ParticipantView = () => {
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, [logs]);

    useEffect(() => {
      return () => {
        window.speechSynthesis.cancel();
      };
    }, []);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white relative p-4">
        {/* 顶部状态栏 */}
        <div className="w-full max-w-4xl mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex-1">
              <div className="text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{participantName}</span>
                  <span>•</span>
                  <span>{assignedCondition === 'AI_Model' ? '🤖 AI助手' : '👤 人类伙伴'}</span>
                  <span>•</span>
                  <span>{selectedInputMode === 'text' ? '📝 文本模式' : '🎤 语音模式'}</span>
                </div>
                {assignedVoiceModel && (
                  <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                    <Fingerprint size={10} />
                    专属模型: <span className="font-medium text-blue-600">{assignedVoiceModel.alias}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  stopListening();
                  window.speechSynthesis.cancel();
                  setCurrentView('thank_you');
                }} 
                className="bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors shadow-sm"
              >
                结束会话
              </button>
            </div>
          </div>
        </div>
        
        {/* 状态指示器 */}
        <div className={`text-sm font-bold uppercase tracking-widest mb-4 transition-all flex items-center justify-center gap-2 ${
          interactionState === 'process' ? 'text-blue-600 animate-pulse' : 
          interactionState === 'speak' ? 'text-green-600 animate-pulse' : 
          interactionState === 'listen' ? 'text-red-600 animate-pulse' : 'text-gray-400'
        }`}>
          {interactionState === 'process' ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>AI思考中...</span>
            </>
          ) : interactionState === 'speak' ? (
            <>
              <span className="animate-bounce">🔊</span>
              <span>AI正在语音回复...</span>
            </>
          ) : interactionState === 'listen' ? (
            <>
              <span className="animate-pulse">🎤</span>
              <span>请说话...</span>
            </>
          ) : (
            <span>💬 等待对话...</span>
          )}
        </div>
        
        {/* Edge专用错误提示 */}
        {recognitionError && (
          <div className="w-full max-w-2xl mb-4 z-10">
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg shadow-md">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle size={18} />
                  <span className="font-bold">Edge浏览器语音识别问题</span>
                </div>
                <button 
                  onClick={() => setRecognitionError('')}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
              <p className="text-red-600 text-sm whitespace-pre-line mb-3">{recognitionError}</p>
              
              <div className="mb-3 p-2 bg-red-100 rounded border border-red-200">
                <p className="text-red-700 text-xs font-semibold mb-1">💡 Edge浏览器解决方案：</p>
                <ul className="text-red-600 text-xs list-disc list-inside space-y-1">
                  <li>点击Edge地址栏的🎤图标检查权限</li>
                  <li>访问 edge://settings/content/microphone 检查全局设置</li>
                  <li>确保没有Zoom、微信等程序占用麦克风</li>
                  <li>尝试在Edge设置中重置权限</li>
                </ul>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <button 
                  onClick={retrySpeechRecognition}
                  className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded text-sm flex items-center justify-center gap-1"
                >
                  <RefreshCw size={14} /> 重试语音
                </button>
                <button 
                  onClick={switchToTextMode}
                  className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded text-sm flex items-center justify-center gap-1"
                >
                  <Keyboard size={14} /> 切换到文本
                </button>
                <button 
                  onClick={() => window.open('edge://settings/content/microphone', '_blank')}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded text-sm flex items-center justify-center gap-1"
                >
                  <Settings size={14} /> Edge麦克风设置
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 实时转录显示 */}
        {selectedInputMode === 'voice' && transcript && !recognitionError && (
          <div className="w-full max-w-2xl mb-4">
            <div className="bg-white p-4 rounded-lg shadow-md border border-blue-100">
              <p className="text-sm text-gray-500 mb-1">实时转录：</p>
              <p className="text-blue-700 font-medium">{transcript}</p>
            </div>
          </div>
        )}
        
        {/* 音频可视化 */}
        {selectedInputMode === 'voice' && (
          <div className="w-full max-w-2xl h-48 md:h-64 mb-6 md:mb-8 flex items-center justify-center">
            <AudioVisualizer 
              isActive={interactionState === 'listen' || interactionState === 'speak'} 
              mode={interactionState === 'listen' ? 'user' : assignedCondition === 'AI_Model' ? 'ai' : 'human'}
              volumeLevel={isListening ? 0.5 : 0}
            />
          </div>
        )}
        
        {/* 聊天记录 */}
        <div 
          ref={chatContainerRef}
          className={`${selectedInputMode === 'text' ? 'h-80 md:h-96' : 'h-48 md:h-64'} w-full max-w-2xl mb-6 md:mb-8 overflow-y-auto bg-white rounded-xl p-4 md:p-6 shadow-lg border border-gray-100`}
        >
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <AudioLines size={48} className="mb-4 opacity-30" />
              <p className="text-lg font-medium">对话即将开始</p>
              <p className="text-sm mt-2 text-center">
                {selectedInputMode === 'voice' 
                  ? '点击下方麦克风按钮开始语音对话' 
                  : '在下方输入框中输入消息开始对话'}
              </p>
              {assignedVoiceModel && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <span className="font-bold">🎯 您的专属模型:</span> {assignedVoiceModel.alias}
                    <br/>
                    <span className="text-gray-600">系统提示: {assignedVoiceModel.textLLM.systemPrompt.substring(0, 50)}...</span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            logs.map((msg, index) => (
              <ChatMessage 
                key={msg.id}
                message={msg}
                condition={assignedCondition}
                isSpeaking={interactionState === 'speak' && msg.role === 'partner' && index === logs.length - 1}
              />
            ))
          )}
        </div>
        
        {/* 输入区域 */}
        <div className="w-full max-w-2xl">
          {selectedInputMode === 'voice' ? (
            <div className="flex justify-center flex-col items-center gap-4">
              <div className="relative">
                {/* 麦克风按钮 */}
                <button 
                  onClick={handleMicClick} 
                  disabled={interactionState === 'process' || interactionState === 'speak'}
                  className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-105 ${
                    isListening 
                      ? 'bg-gradient-to-r from-red-500 to-pink-600 animate-pulse ring-4 ring-red-300' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  } ${(interactionState === 'process' || interactionState === 'speak') ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isListening ? (
                    <>
                      <div className="relative">
                        <MicOff className="w-10 h-10" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                      </div>
                    </>
                  ) : (
                    <Mic className="w-10 h-10" />
                  )}
                </button>
                
                {/* 录音指示器 */}
                {isListening && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                    录音中
                  </div>
                )}
              </div>
              
              {/* 状态指示 */}
              <div className="text-center space-y-2">
                <p className={`text-sm font-medium ${
                  isListening ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {isListening 
                    ? '正在聆听... 请说话（8秒后自动停止）' 
                    : interactionState === 'process' 
                      ? '正在处理您的语音...' 
                      : interactionState === 'speak'
                        ? 'AI正在回复...'
                        : '点击麦克风按钮开始说话'}
                </p>
                
                {/* 语音波形模拟 */}
                {isListening && (
                  <div className="flex items-center justify-center gap-1 h-8">
                    {[1, 2, 3, 4, 3, 2, 1, 2, 3, 4].map((height, index) => (
                      <div 
                        key={index}
                        className="w-1 bg-red-500 rounded-full animate-pulse"
                        style={{
                          height: `${height * 6}px`,
                          animationDelay: `${index * 0.1}s`,
                          animationDuration: '0.8s'
                        }}
                      ></div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={switchToTextMode}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50"
                  title="切换到文本输入"
                >
                  <Keyboard size={16} />
                  <span>切换到文本</span>
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50"
                  title="刷新页面"
                >
                  <RefreshCw size={16} />
                  <span>刷新页面</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <PersistentTextInput
                key="text-input"
                onSubmit={processMessageExchange}
                disabled={interactionState !== 'idle'}
                placeholder="输入消息后按回车发送..."
              />
              <button 
                onClick={() => {
                  const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (input && input.value.trim() && interactionState === 'idle') {
                    processMessageExchange(input.value.trim());
                  }
                }}
                disabled={interactionState !== 'idle'}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 md:px-6 py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
              >
                <Send size={20} /> 发送
              </button>
            </div>
          )}
        </div>

        {/* 模式切换提示 */}
        <div className="mt-6 text-center">
          <button
            onClick={selectedInputMode === 'text' ? switchToVoiceMode : switchToTextMode}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2"
          >
            {selectedInputMode === 'text' ? (
              <>
                <AudioLines size={14} />
                切换到语音模式
              </>
            ) : (
              <>
                <Keyboard size={14} />
                切换到文本模式
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // 感谢视图
  const ThankYouView = () => (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center p-6 md:p-8">
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-2xl max-w-md text-center border border-gray-100">
        <div className="text-5xl mb-6">🎉</div>
        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">感谢您的参与！</h1>
        <p className="text-gray-600 mb-6">
          您的实验会话已成功结束。所有交互数据已保存，这将为我们的研究提供宝贵的信息。
        </p>
        
        <div className="mb-6 md:mb-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-bold mb-2 text-gray-700">实验信息</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>参与者：<span className="font-medium">{participantName}</span></p>
            <p>用户ID：<code className="text-xs bg-gray-200 px-1 rounded">{userId.substring(0, 8)}...</code></p>
            <p>实验条件：<span className="font-medium">{assignedCondition === 'AI_Model' ? 'AI助手' : '人类伙伴'}</span></p>
            <p>交互模式：<span className="font-medium">{selectedInputMode === 'voice' ? '语音对话' : '文本对话'}</span></p>
            <p>专属模型：<span className="font-medium">{assignedVoiceModel?.alias || '未分配'}</span></p>
            <p>对话消息：<span className="font-medium">{logs.length} 条</span></p>
          </div>
        </div>
        
        <div className="space-y-3">
          <button 
            onClick={() => {
              // 查看数据仪表板（可以在这里实现）
              alert('数据仪表板功能暂未实现');
            }} 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity shadow-md"
          >
            查看实验数据
          </button>
          <button 
            onClick={() => {
              setParticipantName('');
              setLogs([]);
              setRecognitionError('');
              setCurrentView('login');
            }} 
            className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            开始新会话
          </button>
        </div>
      </div>
    </div>
  );

  // 数据仪表板视图
  const DashboardView = () => {
    const [statistics, setStatistics] = useState({
      totalMessages: 0,
      avgLatency: 0,
      voiceCount: 0,
      textCount: 0,
    });

    useEffect(() => {
      if (logs.length > 0) {
        const voiceLogs = logs.filter(log => log.inputMode === 'voice');
        const textLogs = logs.filter(log => log.inputMode === 'text');
        const latencies = logs.filter(log => log.latency).map(log => log.latency!);
        const avgLatency = latencies.length > 0 
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) 
          : 0;
        
        setStatistics({
          totalMessages: logs.length,
          avgLatency,
          voiceCount: voiceLogs.length,
          textCount: textLogs.length,
        });
      }
    }, [logs]);

    const chartData = logs
      .filter(log => log.latency)
      .map((log, index) => ({
        name: `消息 ${index + 1}`,
        延迟: log.latency || 0,
      }));

    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">实验数据仪表板</h1>
              <p className="text-gray-600">用户ID: {userId}</p>
              <p className="text-gray-600">专属模型: {assignedVoiceModel?.alias || '未分配'}</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setCurrentView('login')} 
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 md:px-6 py-2 md:py-3 rounded-lg hover:opacity-90 transition-opacity shadow-md"
              >
                返回首页
              </button>
            </div>
          </div>
          
          {/* 统计数据卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <div className="bg-white p-4 md:p-6 rounded-xl shadow border border-gray-200">
              <div className="text-sm text-gray-500 mb-2">总消息数</div>
              <div className="text-2xl md:text-3xl font-bold text-blue-600">{statistics.totalMessages}</div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow border border-gray-200">
              <div className="text-sm text-gray-500 mb-2">平均响应延迟</div>
              <div className="text-2xl md:text-3xl font-bold text-green-600">{statistics.avgLatency}ms</div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow border border-gray-200">
              <div className="text-sm text-gray-500 mb-2">语音消息数</div>
              <div className="text-2xl md:text-3xl font-bold text-purple-600">{statistics.voiceCount}</div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow border border-gray-200">
              <div className="text-sm text-gray-500 mb-2">文本消息数</div>
              <div className="text-2xl md:text-3xl font-bold text-orange-600">{statistics.textCount}</div>
            </div>
          </div>
          
          {/* 延迟图表 */}
          {chartData.length > 0 && (
            <div className="bg-white p-4 md:p-6 rounded-xl shadow border border-gray-200 mb-6 md:mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">响应延迟趋势</h3>
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: '延迟 (ms)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="延迟" 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      dot={{ r: 4 }} 
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          {/* 原始数据 */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">原始交互数据</h3>
            <div className="h-64 md:h-96 overflow-auto">
              <pre className="text-xs bg-gray-50 p-4 rounded border border-gray-200">
                {JSON.stringify(logs, null, 2)}
              </pre>
            </div>
          </div>
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
};

export default HCIExperimentPlatform;
