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
// 从环境变量读取配置，如果没有则使用默认值（向后兼容）
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pqhrtviidwuwspubaxfm.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxaHJ0dmlpZHd1d3NwdWJheGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ1NTQwNzEsImV4cCI6MjA4MDEzMDA3MX0.2UXvn6wk9Qlhq_HnRKm5bqIrFKwwPTuBq0kyXxa-WDI';

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
const useEdgeSpeechRecognition = (
  onResult?: (text: string) => void,
  voiceModel?: VoiceModelConfig | null
) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasResultRef = useRef(false);
  const transcriptResultRef = useRef({ final: '', interim: '' });
  const retryCountRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const volumeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxVolumeRef = useRef(0);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const reconnectDelayRef = useRef(1000);
  const isManualStopRef = useRef(false);
  
  // 腾讯云签名生成函数（简化版，生产环境应通过后端获取）
  const generateTencentCloudSignature = useCallback((secretId: string, secretKey: string, timestamp: number, nonce: number) => {
    // 注意：这是简化版本，仅用于测试
    // 生产环境应该通过后端 API 获取签名，避免在前端暴露 SecretKey
    try {
      // 构建签名字符串（根据腾讯云文档格式）
      const signString = `secretId=${secretId}&timestamp=${timestamp}&nonce=${nonce}`;
      
      // 使用 HMAC-SHA1 签名（需要 crypto-js 库，这里使用简化方式）
      // 实际应该使用：CryptoJS.HmacSHA1(signString, secretKey).toString()
      // 为了简化，这里返回一个基础签名（生产环境必须使用正确的 HMAC）
      const signature = btoa(signString + secretKey).substring(0, 40);
      return signature;
    } catch (err) {
      console.error('生成签名失败:', err);
      return '';
    }
  }, []);
  
  // 检查麦克风权限（使用 ref 避免闭包问题）
  const checkMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      // 首先尝试直接获取麦克风权限（这会触发浏览器权限请求）
      try {
        console.log('🎤 正在请求麦克风权限...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ 麦克风权限已授予');
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (err: any) {
        console.error('❌ 获取麦克风权限失败:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('无法访问麦克风。\n\n请按以下步骤操作：\n1. 点击地址栏左侧的🔒或🎤图标\n2. 选择"允许"或"始终允许此站点使用麦克风"\n3. 刷新页面后重试');
          return false;
        }
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('未检测到麦克风设备。\n\n请检查：\n1. 麦克风是否已正确连接\n2. 系统设置中麦克风是否已启用\n3. 其他程序是否正在使用麦克风');
          return false;
        }
        if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('麦克风被其他程序占用。\n\n请关闭：\n1. Zoom、Teams、微信等视频通话软件\n2. 其他正在使用麦克风的应用程序\n3. 然后刷新页面重试');
          return false;
        }
        // 其他错误，继续尝试（可能是临时问题）
        console.warn('麦克风权限检查警告，继续尝试:', err);
        return true;
      }
    } catch (err) {
      // 某些浏览器不支持相关 API，继续尝试
      console.warn('权限检查API不支持，继续尝试:', err);
      return true;
    }
  }, []);
  
  // 腾讯云语音识别实现（改进版）
  const startTencentCloudASR = useCallback(async (isReconnect = false) => {
    if (!voiceModel?.recognitionUrl || !voiceModel?.recognitionKey) {
      setError('腾讯云语音识别配置不完整。请检查识别服务 URL 和 SecretId 是否已配置。');
      setIsSupported(false);
      return;
    }

    if (isReconnect) {
      reconnectAttemptsRef.current++;
      if (reconnectAttemptsRef.current > maxReconnectAttempts) {
        setError(`连接失败：已重试 ${maxReconnectAttempts} 次。请检查网络连接和配置信息。`);
        setIsListening(false);
        return;
      }
      console.log(`🔄 尝试重连（第 ${reconnectAttemptsRef.current} 次）...`);
      await new Promise(resolve => setTimeout(resolve, reconnectDelayRef.current));
      reconnectDelayRef.current *= 2; // 指数退避
    } else {
      reconnectAttemptsRef.current = 0;
      reconnectDelayRef.current = 1000;
      isManualStopRef.current = false;
    }

    console.log('🎤 启动腾讯云实时语音识别...');
    
    // 检查麦克风权限
    const hasPermission = await checkMicrophonePermission();
    if (!hasPermission) {
      console.error('❌ 麦克风权限检查失败');
      setIsListening(false);
      return;
    }

    try {
      // 获取麦克风流（如果不是重连，才重新获取）
      if (!microphoneStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          }
        });
        microphoneStreamRef.current = stream;

        // 创建音频上下文
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000
        });
        audioContextRef.current = audioContext;

        // 创建音频分析器（用于音量检测）
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        // 定期检查音量
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        volumeCheckIntervalRef.current = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const volume = Math.round(average);
          if (volume > maxVolumeRef.current) {
            maxVolumeRef.current = volume;
          }
        }, 100);

        // 创建音频处理器（用于采集音频数据）
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        audioProcessorRef.current = processor;
        
        processor.onaudioprocess = (e) => {
          if (websocketRef.current?.readyState === WebSocket.OPEN && !isManualStopRef.current) {
            const inputData = e.inputBuffer.getChannelData(0);
            // 转换为 16-bit PCM
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            // 发送音频数据到腾讯云
            try {
              websocketRef.current.send(pcmData.buffer);
            } catch (err) {
              console.warn('发送音频数据失败:', err);
            }
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      }

      // 构建 WebSocket URL
      // 注意：如果 recognitionUrl 已经包含完整签名，直接使用
      // 否则需要生成签名（简化版，生产环境应通过后端获取）
      let wsUrl = voiceModel.recognitionUrl;
      
      // 如果 URL 不包含签名参数，尝试生成（仅用于测试）
      if (!wsUrl.includes('signature=') && !wsUrl.includes('?')) {
        const timestamp = Math.floor(Date.now() / 1000);
        const nonce = Math.floor(Math.random() * 1000000);
        // 注意：这里需要 SecretKey，但为了安全，生产环境应该通过后端获取签名
        // 这里假设 recognitionKey 是 SecretId，还需要 SecretKey（应该从后端获取）
        const signature = generateTencentCloudSignature(
          voiceModel.recognitionKey,
          voiceModel.recognitionKey, // 简化：实际应该是 SecretKey
          timestamp,
          nonce
        );
        wsUrl = `${wsUrl}?secretId=${voiceModel.recognitionKey}&timestamp=${timestamp}&nonce=${nonce}&signature=${signature}`;
      }
      
      console.log('🔌 连接腾讯云 WebSocket...', wsUrl.substring(0, 80) + '...');
      
      // 设置连接超时
      const connectTimeout = setTimeout(() => {
        if (websocketRef.current?.readyState !== WebSocket.OPEN) {
          console.error('❌ WebSocket 连接超时');
          if (websocketRef.current) {
            websocketRef.current.close();
          }
          // 尝试重连
          if (!isManualStopRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
            startTencentCloudASR(true);
          } else {
            setError('连接超时。请检查网络连接和配置信息。');
            setIsListening(false);
          }
        }
      }, 10000); // 10秒超时
      
      // 创建 WebSocket 连接
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        clearTimeout(connectTimeout);
        console.log('✅ 腾讯云 WebSocket 连接成功，等待握手响应...');
        // 注意：根据腾讯云文档，连接成功后后台会自动返回握手响应
        // 不需要发送初始化消息，等待后台返回 {"code":0,"message":"success","voice_id":"..."}
        setIsListening(true);
        hasResultRef.current = false;
        if (!isReconnect) {
          transcriptResultRef.current = { final: '', interim: '' };
        }
        reconnectAttemptsRef.current = 0; // 重置重连计数
        reconnectDelayRef.current = 1000; // 重置延迟
        
        // 设置识别超时（30秒）
        timeoutRef.current = setTimeout(() => {
          if (!hasResultRef.current && websocketRef.current) {
            console.warn('⏱️ 语音识别超时（30秒）');
            const result = transcriptResultRef.current;
            if (!result.final.trim() && !result.interim.trim()) {
              setError('录音超时（30秒）。\n\n请尝试：\n1. 确保麦克风正常工作\n2. 说话时声音清晰、音量适中\n3. 检查麦克风音量设置\n4. 在安静环境下使用');
            }
            // 发送结束消息后关闭连接
            if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
              try {
                websocketRef.current.send(JSON.stringify({ type: 'end' }));
              } catch (err) {
                console.warn('发送结束消息失败:', err);
              }
              setTimeout(() => {
                if (websocketRef.current) {
                  websocketRef.current.close();
                }
              }, 500);
            }
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 收到腾讯云消息:', data);

          // 处理握手响应（根据腾讯云文档格式）
          if (data.code === 0 && data.voice_id && !data.result) {
            console.log('✅ 握手成功，voice_id:', data.voice_id);
            // 握手成功，可以开始发送音频数据
            return;
          }

          // 处理识别结果（根据腾讯云文档格式）
          if (data.code === 0 && data.result) {
            const result = data.result;
            const text = result.voice_text_str || '';
            const isFinal = data.final === 1; // 最终结果判断

            if (text) {
              if (isFinal) {
                transcriptResultRef.current.final = text;
                hasResultRef.current = true;
                setTranscript(text);
                console.log('✅ 腾讯云最终识别结果:', text);
                
                // 清理超时
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                  timeoutRef.current = null;
                }
                
                // 根据腾讯云文档，收到最终结果后发送结束消息
                isManualStopRef.current = true;
                if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
                  try {
                    // 发送结束消息，通知后台结束识别
                    websocketRef.current.send(JSON.stringify({ type: 'end' }));
                    console.log('📤 已发送结束识别消息');
                    // 等待后台返回 final=1 后关闭连接
                    setTimeout(() => {
                      if (websocketRef.current) {
                        websocketRef.current.close();
                      }
                    }, 1000);
                  } catch (err) {
                    console.warn('发送结束消息失败:', err);
                    if (websocketRef.current) {
                      websocketRef.current.close();
                    }
                  }
                }
                if (onResult) {
                  setTimeout(() => onResult(text), 200);
                }
              } else {
                transcriptResultRef.current.interim = text;
                setTranscript(text);
                console.log('⏳ 腾讯云临时识别结果:', text);
              }
            } else if (isFinal) {
              // 收到 final=1 但没有文本，表示识别完成（后台已处理完所有音频）
              console.log('✅ 识别完成（final=1）');
              const finalText = transcriptResultRef.current.final.trim() || transcriptResultRef.current.interim.trim();
              if (finalText) {
                hasResultRef.current = true;
                setTranscript(finalText);
                if (onResult) {
                  setTimeout(() => onResult(finalText), 200);
                }
              }
              // 清理超时
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
              isManualStopRef.current = true;
              // 后台已返回 final=1，可以关闭连接
              if (websocketRef.current) {
                setTimeout(() => {
                  if (websocketRef.current) {
                    websocketRef.current.close();
                  }
                }, 500);
              }
            }
          } else if (data.code !== 0) {
            // 处理错误（根据腾讯云文档格式）
            const errorMsg = data.message || '未知错误';
            const errorCode = data.code;
            console.error('❌ 腾讯云识别错误:', errorCode, errorMsg);
            
            // 清理超时
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            
            // 根据错误码决定是否重连
            if (errorCode === 4002 || errorCode === 4001) {
              // 鉴权失败或参数不合法
              setError(`腾讯云配置错误: ${errorMsg}\n\n请检查：\n1. SecretId 是否正确\n2. 识别服务 URL 是否正确\n3. 签名是否正确\n4. 是否已开通实时语音识别服务`);
              setIsListening(false);
            } else if (errorCode === 4003) {
              // AppID 服务未开通
              setError(`服务未开通: ${errorMsg}\n\n请在腾讯云控制台开通实时语音识别服务`);
              setIsListening(false);
            } else if (errorCode === 4004) {
              // 资源包耗尽
              setError(`资源包耗尽: ${errorMsg}\n\n请购买资源包或开通后付费`);
              setIsListening(false);
            } else if (!isManualStopRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
              // 可恢复的错误，尝试重连
              console.log('🔄 尝试重连...');
              startTencentCloudASR(true);
            } else {
              setError(`腾讯云识别错误 (${errorCode}): ${errorMsg}`);
              setIsListening(false);
            }
          }
        } catch (err) {
          console.error('解析腾讯云响应失败:', err, event.data);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectTimeout);
        console.error('❌ 腾讯云 WebSocket 错误:', error);
        
        // 如果不是手动停止，尝试重连
        if (!isManualStopRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          console.log('🔄 连接错误，尝试重连...');
          startTencentCloudASR(true);
        } else {
          setError('腾讯云连接错误。请检查网络连接和配置信息。');
          setIsListening(false);
        }
      };

      ws.onclose = (event) => {
        clearTimeout(connectTimeout);
        console.log('🔌 腾讯云 WebSocket 连接已关闭', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        // 清理超时
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        // 如果不是手动停止且不是正常关闭，尝试重连
        if (!isManualStopRef.current && !event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          console.log('🔄 连接意外关闭，尝试重连...');
          startTencentCloudASR(true);
          return;
        }
        
        setIsListening(false);
        
        // 检查是否有结果
        const result = transcriptResultRef.current;
        const textToUse = result.final.trim() || result.interim.trim();
        if (textToUse && onResult && !isManualStopRef.current) {
          setTimeout(() => onResult(textToUse), 200);
        } else if (!textToUse && !hasResultRef.current && !isManualStopRef.current) {
          const volumeInfo = maxVolumeRef.current > 0 
            ? `\n\n💡 检测信息：\n- 检测到的最大音量: ${maxVolumeRef.current}（0-255）\n- ${maxVolumeRef.current < 20 ? '⚠️ 音量较低，请靠近麦克风并提高说话音量' : maxVolumeRef.current < 50 ? '✅ 音量正常' : '✅ 音量充足'}`
            : '\n\n⚠️ 未检测到任何音频输入，请检查麦克风是否正常工作';
          
          setError(`没有检测到语音。${volumeInfo}\n\n请尝试：\n1. 说话时保持麦克风距离10-20厘米\n2. 确保在安静环境下清晰说话\n3. 检查麦克风音量是否足够（系统设置中）\n4. 尝试说一些简单的词语，如"你好"、"测试"`);
        }
        
        // 清理资源（仅在完全停止时）
        if (isManualStopRef.current || reconnectAttemptsRef.current >= maxReconnectAttempts) {
          if (microphoneStreamRef.current) {
            microphoneStreamRef.current.getTracks().forEach(track => track.stop());
            microphoneStreamRef.current = null;
          }
          if (audioProcessorRef.current) {
            audioProcessorRef.current.disconnect();
            audioProcessorRef.current = null;
          }
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }
          if (volumeCheckIntervalRef.current) {
            clearInterval(volumeCheckIntervalRef.current);
            volumeCheckIntervalRef.current = null;
          }
        }
      };

    } catch (err: any) {
      console.error('❌ 启动腾讯云识别失败:', err);
      
      // 尝试重连
      if (!isManualStopRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
        console.log('🔄 启动失败，尝试重连...');
        startTencentCloudASR(true);
      } else {
        setError(`启动腾讯云识别失败: ${err.message}\n\n请检查：\n1. 麦克风权限是否已授予\n2. 腾讯云配置是否正确\n3. 网络连接是否正常`);
        setIsListening(false);
      }
    }
  }, [voiceModel, checkMicrophonePermission, onResult, generateTencentCloudSignature]);

  const startListening = useCallback(async () => {
    console.log('🎤 开始启动语音识别...');
    
    // 清理之前的状态
    setError('');
    setTranscript('');
    hasResultRef.current = false;
    retryCountRef.current = 0; // 重置重试计数
    maxVolumeRef.current = 0; // 重置最大音量记录
    
    // 清理之前的音频分析
    if (volumeCheckIntervalRef.current) {
      clearInterval(volumeCheckIntervalRef.current);
      volumeCheckIntervalRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    // 如果已有识别实例在运行，先停止
    if (recognitionRef.current) {
      console.log('⚠️ 检测到已有识别实例，先停止...');
      try {
        recognitionRef.current.stop();
        // 等待停止完成
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        console.warn('停止旧实例时出错:', e);
      }
      recognitionRef.current = null;
    }
    
    // 清理之前的超时
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // 根据配置选择识别方式
    if (voiceModel?.recognitionType === 'custom' && voiceModel.recognitionUrl) {
      // 使用腾讯云语音识别
      console.log('✅ 使用腾讯云语音识别');
      await startTencentCloudASR();
      return;
    }
    
    // 使用浏览器原生语音识别
    console.log('✅ 使用浏览器原生语音识别');
    
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
    
    console.log('✅ 浏览器支持语音识别，检查麦克风权限...');
    
    // 检查麦克风权限（必须先获取权限才能启动语音识别）
    const hasPermission = await checkMicrophonePermission();
    if (!hasPermission) {
      console.error('❌ 麦克风权限检查失败');
      setIsListening(false);
      return;
    }
    
    console.log('✅ 麦克风权限已通过，等待一小段时间确保权限生效...');
    // 等待一小段时间，确保权限完全生效
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 启动麦克风音量检测
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      // 定期检查音量
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      volumeCheckIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const volume = Math.round(average);
        if (volume > maxVolumeRef.current) {
          maxVolumeRef.current = volume;
        }
        // 实时音量日志（仅在开发时使用）
        if (volume > 10) {
          console.log('🎤 检测到音量:', volume);
        }
      }, 100);
    } catch (err) {
      console.warn('无法启动音量检测:', err);
    }
    
    console.log('✅ 创建语音识别实例...');
    
    // 创建新的识别实例
    let recognition;
    try {
      recognition = new SpeechRecognition();
      console.log('✅ 语音识别实例创建成功');
    } catch (err: any) {
      console.error('❌ 创建语音识别实例失败:', err);
      setError(`无法创建语音识别实例: ${err.message || '未知错误'}\n\n请尝试刷新页面或重启浏览器。`);
      setIsListening(false);
      return;
    }
    
    recognitionRef.current = recognition;
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';
    recognition.maxAlternatives = 1;
    
    console.log('✅ 语音识别配置完成:', {
      continuous: recognition.continuous,
      interimResults: recognition.interimResults,
      lang: recognition.lang
    });
    
    // 重置结果跟踪
    transcriptResultRef.current = { final: '', interim: '' };
    
    recognition.onstart = () => {
      console.log('✅ 语音识别已成功启动！');
      setIsListening(true);
      hasResultRef.current = false;
      transcriptResultRef.current = { final: '', interim: '' };
      
      // 设置超时时间（15秒）
      timeoutRef.current = setTimeout(() => {
        if (!hasResultRef.current && recognitionRef.current) {
          console.warn('⏱️ 语音识别超时（15秒）');
          try {
            recognitionRef.current.stop();
          } catch (e) {
            console.log('超时停止识别时出错:', e);
          }
          const result = transcriptResultRef.current;
          if (!result.final.trim() && !result.interim.trim()) {
            setError('录音超时（15秒）。\n\n请尝试：\n1. 确保麦克风正常工作\n2. 说话时声音清晰、音量适中\n3. 检查麦克风音量设置\n4. 在安静环境下使用\n5. 点击"重试"按钮');
          }
          setIsListening(false);
        }
      }, 15000); // 15秒超时
    };
    
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      // 累积所有结果（包括之前的结果）
      const currentResult = transcriptResultRef.current;
      let accumulatedFinal = currentResult.final || '';
      let accumulatedInterim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript += transcript;
          accumulatedFinal += transcript;
          hasResultRef.current = true;
          console.log('识别到最终结果片段:', transcript);
        } else {
          interimTranscript += transcript;
          accumulatedInterim += transcript;
        }
      }
      
      // 更新 ref 中的结果（累积所有结果）
      transcriptResultRef.current = {
        final: accumulatedFinal,
        interim: accumulatedInterim || interimTranscript
      };
      
      console.log('识别结果更新:', { 
        final: accumulatedFinal, 
        interim: accumulatedInterim || interimTranscript,
        newFinal: finalTranscript,
        newInterim: interimTranscript
      });
      
      // 更新显示的文本（优先显示最终结果）
      const displayText = accumulatedFinal || (accumulatedInterim || interimTranscript);
      if (displayText) {
        setTranscript(displayText);
      }
      
      // 如果有最终结果，停止识别并准备提交
      if (finalTranscript || accumulatedFinal) {
        const finalText = accumulatedFinal || finalTranscript;
        console.log('有最终结果，准备停止识别:', finalText);
        // 清理超时
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        // 确保 transcript 状态已更新
        setTranscript(finalText);
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
          // 检查网络状态
          const isOnline = navigator.onLine;
          const networkStatus = isOnline ? '✅ 网络在线' : '❌ 网络离线';
          const protocol = window.location.protocol;
          const isHttps = protocol === 'https:';
          
          errorMessage = `网络错误：无法连接到语音识别服务。\n\n${networkStatus}\n协议: ${isHttps ? '✅ HTTPS' : '⚠️ HTTP'}\n\n可能原因：\n1. 网络连接不稳定或已断开\n2. 防火墙或代理阻止了连接\n3. 语音识别服务（Google/Microsoft）暂时不可用\n4. 在某些地区，语音识别服务可能被限制访问\n\n解决方案：\n1. 检查网络连接是否正常（尝试访问其他网站）\n2. 尝试刷新页面后重试\n3. 检查浏览器是否使用代理（可能需要配置代理或VPN）\n4. 如果使用公司/学校网络，可能需要联系网络管理员开放相关服务\n5. 尝试使用VPN或更换网络环境\n6. 稍后重试（服务可能暂时不可用）\n\n💡 提示：浏览器语音识别需要连接到云端服务（Google或Microsoft），如果网络无法访问这些服务，语音识别将无法工作。`;
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
        // 如果是网络错误且设置了自动重试，延迟后自动重试（最多重试2次）
        if (shouldRetry && event.error === 'network' && retryCountRef.current < 2) {
          retryCountRef.current += 1;
          console.log(`🔄 网络错误，3秒后自动重试（第 ${retryCountRef.current} 次）...`);
          setTimeout(() => {
            console.log('🔄 自动重试语音识别...');
            if (!isListening && recognitionRef.current === null) {
              startListening();
            }
          }, 3000);
        } else if (shouldRetry && event.error === 'network' && retryCountRef.current >= 2) {
          console.log('❌ 网络错误重试次数已达上限，请手动重试');
          setError(errorMessage + '\n\n⚠️ 自动重试已失败，请点击"重试语音"按钮手动重试。');
        }
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
        // 立即设置 transcript，确保状态更新
        setTranscript(textToUse);
        
        // 如果有回调函数，直接调用（这是主要的提交方式）
        if (onResult) {
          console.log('🚀 通过回调直接提交识别结果:', textToUse);
          // 使用 setTimeout 确保 transcript 状态已更新
          setTimeout(() => {
            onResult(textToUse);
          }, 200);
        } else {
          // 如果没有回调，确保 transcript 状态已设置，等待 useEffect 处理
          console.log('⚠️ 没有 onResult 回调，等待 useEffect 处理');
        }
      } else {
        console.log('❌ 识别结束时没有结果');
        // 如果没有结果，检查是否有错误
        setTimeout(() => {
          const latestResult = transcriptResultRef.current;
          // 再次检查是否有结果（可能 onresult 事件延迟到达）
          const finalText = latestResult.final.trim() || latestResult.interim.trim();
          if (finalText) {
            console.log('延迟检查发现结果，设置 transcript:', finalText);
            setTranscript(finalText);
            if (onResult) {
              setTimeout(() => {
                onResult(finalText);
              }, 200);
            }
          } else {
            setError(prevError => {
              // 只有在没有错误且没有结果时才设置错误
              if (!prevError && !latestResult.final.trim() && !latestResult.interim.trim()) {
                // 检查是否有音量输入
                const volumeInfo = maxVolumeRef.current > 0 
                  ? `\n\n💡 检测信息：\n- 检测到的最大音量: ${maxVolumeRef.current}（0-255）\n- ${maxVolumeRef.current < 20 ? '⚠️ 音量较低，请靠近麦克风并提高说话音量' : maxVolumeRef.current < 50 ? '✅ 音量正常' : '✅ 音量充足'}`
                  : '\n\n⚠️ 未检测到任何音频输入，请检查麦克风是否正常工作';
                
                return `没有检测到语音。${volumeInfo}\n\n请尝试：\n1. 点击"重试"按钮\n2. 说话时保持麦克风距离10-20厘米\n3. 确保在安静环境下清晰说话\n4. 检查麦克风音量是否足够（系统设置中）\n5. 确保浏览器为最新版本\n6. 尝试说一些简单的词语，如"你好"、"测试"`;
              }
              return prevError;
            });
          }
          
          // 清理音频分析资源
          if (volumeCheckIntervalRef.current) {
            clearInterval(volumeCheckIntervalRef.current);
            volumeCheckIntervalRef.current = null;
          }
          if (microphoneStreamRef.current) {
            microphoneStreamRef.current.getTracks().forEach(track => track.stop());
            microphoneStreamRef.current = null;
          }
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }
        }, 500);
      }
      
      recognitionRef.current = null;
    };
    
    try {
      console.log('🚀 正在启动语音识别...');
      recognition.start();
      console.log('✅ 语音识别启动命令已发送');
    } catch (err: any) {
      console.error('❌ 启动语音识别失败:', err);
      
      // 清理超时
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      let errorMsg = '';
      
      if (err.message?.includes('already started') || err.message?.includes('started')) {
        errorMsg = '语音识别已在运行中。\n\n如果问题持续：\n1. 等待几秒后重试\n2. 刷新页面\n3. 检查浏览器控制台是否有其他错误';
      } else if (err.message?.includes('not-allowed') || err.message?.includes('permission')) {
        errorMsg = '麦克风权限被拒绝。\n\n请按以下步骤操作：\n1. 点击地址栏左侧的🔒或🎤图标\n2. 选择"允许"或"始终允许此站点使用麦克风"\n3. 刷新页面后重试';
      } else {
        errorMsg = `启动语音识别失败: ${err.message || '未知错误'}\n\n请确保：\n1. Edge/Chrome浏览器已更新到最新版本\n2. 麦克风硬件正常工作\n3. 没有其他程序占用麦克风\n4. 已授予浏览器麦克风权限\n5. 使用HTTPS连接（本地开发可用localhost）`;
      }
      
      setError(errorMsg);
      setIsListening(false);
      recognitionRef.current = null;
    }
  }, [checkMicrophonePermission, voiceModel, startTencentCloudASR]);
  
  const stopListening = useCallback(() => {
    // 清理超时
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // 停止浏览器原生识别
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('停止识别时出错:', e);
      }
      recognitionRef.current = null;
    }

    // 停止腾讯云 WebSocket 连接
    if (websocketRef.current) {
      try {
        isManualStopRef.current = true; // 标记为手动停止
        // 根据腾讯云文档，需要先发送结束消息
        if (websocketRef.current.readyState === WebSocket.OPEN) {
          try {
            websocketRef.current.send(JSON.stringify({ type: 'end' }));
            console.log('📤 已发送结束识别消息');
            // 等待一小段时间后关闭连接
            setTimeout(() => {
              if (websocketRef.current) {
                websocketRef.current.close();
              }
            }, 500);
          } catch (err) {
            console.warn('发送结束消息失败:', err);
            websocketRef.current.close();
          }
        } else {
          websocketRef.current.close();
        }
      } catch (e) {
        console.log('关闭 WebSocket 时出错:', e);
      }
      websocketRef.current = null;
    }
    
    // 清理音频分析资源
    if (volumeCheckIntervalRef.current) {
      clearInterval(volumeCheckIntervalRef.current);
      volumeCheckIntervalRef.current = null;
    }
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
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
      if (volumeCheckIntervalRef.current) {
        clearInterval(volumeCheckIntervalRef.current);
      }
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (audioProcessorRef.current) {
        audioProcessorRef.current.disconnect();
      }
      if (websocketRef.current) {
        websocketRef.current.close();
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
      alias: 'AI助手 - Qwen-TTS-Realtime (Cherry)',
      recognitionType: 'browser',
      synthesisType: 'custom',
      synthesisUrl: 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/realtime',
      synthesisKey: 'sk-c5e6833061944016adc237cc5bc92da8',
      synthesisVoice: 'Cherry',
      textLLM: {
        url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        key: 'sk-c5e6833061944016adc237cc5bc92da8',
        modelName: 'qwen-plus',
        systemPrompt: '你是一个温柔、友善的AI助手，说话语气温和，用词礼貌。请用中文回复。'
      }
    },
    {
      id: 'model_2',
      alias: 'AI助手 - Qwen-TTS-Realtime (Ethan)',
      recognitionType: 'browser',
      synthesisType: 'custom',
      synthesisUrl: 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/realtime',
      synthesisKey: 'sk-c5e6833061944016adc237cc5bc92da8',
      synthesisVoice: 'Ethan',
      textLLM: {
        url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        key: 'sk-c5e6833061944016adc237cc5bc92da8',
        modelName: 'qwen-plus',
        systemPrompt: '你是一个专业、严谨的AI助手，回答问题准确，逻辑清晰。请用中文回复。'
      }
    },
    {
      id: 'model_3',
      alias: '人类伙伴 - Qwen-TTS-Realtime (Serena)',
      recognitionType: 'browser',
      synthesisType: 'custom',
      synthesisUrl: 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/realtime',
      synthesisKey: 'sk-c5e6833061944016adc237cc5bc92da8',
      synthesisVoice: 'Serena',
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
  
  // 使用修复后的语音识别Hook（传入当前语音模型配置）
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
  }, assignedVoiceModel);
  
  // 同步状态
  useEffect(() => {
    setIsListening(speechListening);
    setRecognitionError(speechError);
    setBrowserSupport(speechSupported);
  }, [speechListening, speechError, speechSupported]);

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
    if (!supabase) {
      console.warn('⚠️ Supabase 未初始化，数据无法保存');
      return;
    }
    try {
      console.log('📤 上传数据到 Supabase:', {
        session_id: msg.sessionId,
        participant_name: msg.participantName,
        role: msg.role,
        content: msg.content.substring(0, 50) + '...',
        input_mode: msg.inputMode,
        latency: msg.latency
      });
      
      // @ts-ignore - Supabase 类型定义可能不完整，但运行时是正确的
      const { data, error } = await supabase.from('experiment_logs').insert({
        session_id: msg.sessionId,
        participant_name: msg.participantName,
        user_id: msg.userId,
        voice_model_id: msg.voiceModelId,
        condition: msg.condition,
        role: msg.role,
        content: msg.content,
        latency: msg.latency || 0,
        timestamp: new Date(msg.timestamp).toISOString(),
        input_mode: msg.inputMode, // 添加输入模式
        actual_model_used: msg.actualModelUsed, // 添加实际使用的模型
      } as any);
      
      if (error) {
        console.error('❌ Supabase 上传错误:', error);
        // 不抛出错误，避免影响用户体验
      } else {
        console.log('✅ 数据上传成功:', data);
      }
    } catch (error: any) { 
      console.error('❌ 上传失败:', error); 
      // 不抛出错误，避免影响用户体验
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

      // Qwen-TTS-Realtime 语音合成函数
      const startQwenTTSRealtime = async (text: string) => {
        if (!assignedVoiceModel.synthesisUrl || !assignedVoiceModel.synthesisKey) {
          console.error('❌ Qwen-TTS-Realtime 配置缺失', {
            hasUrl: !!assignedVoiceModel.synthesisUrl,
            hasKey: !!assignedVoiceModel.synthesisKey,
            keyLength: assignedVoiceModel.synthesisKey?.length
          });
          throw new Error('Qwen-TTS-Realtime API 配置不完整。请检查 TTS API URL 和 API Key 是否已正确配置。');
        }

        const apiKey = assignedVoiceModel.synthesisKey.trim();
        if (!apiKey || apiKey.length < 10) {
          console.error('❌ API Key 无效', { keyLength: apiKey.length });
          throw new Error('API Key 无效。请确保 API Key 已正确配置且不为空。');
        }

        try {
          console.log('🎤 使用 Qwen-TTS-Realtime 合成语音...', { 
            text: text.substring(0, 50),
            url: assignedVoiceModel.synthesisUrl,
            voice: assignedVoiceModel.synthesisVoice,
            keyPrefix: apiKey.substring(0, 5) + '...'
          });
          setInteractionState('speak');

          // 调用 Qwen-TTS-Realtime API (DashScope 格式)
          // DashScope 支持两种认证方式：Authorization Bearer 或 X-DashScope-API-Key
          const response = await fetch(assignedVoiceModel.synthesisUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`, // 主要认证方式
              'X-DashScope-API-Key': apiKey, // 备用认证方式（某些 API 可能需要）
            },
            body: JSON.stringify({
              model: 'qwen-tts-realtime',
              input: {
                text: text,
              },
              parameters: {
                voice: assignedVoiceModel.synthesisVoice || 'Cherry', // Cherry, Ethan, Chelsie, Serena
                format: 'wav', // wav, mp3, pcm
                sample_rate: 24000,
              }
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { message: errorText || `HTTP ${response.status}` };
            }
            
            // 详细的错误信息
            const errorMessage = errorData.message || errorData.error?.message || `HTTP ${response.status}`;
            console.error('❌ Qwen-TTS-Realtime API 错误:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData,
              hasKey: !!apiKey,
              keyLength: apiKey.length
            });
            
            // 如果是 API Key 错误，提供更详细的提示
            if (errorData.code === 'InvalidApiKey' || errorMessage.includes('API-key') || errorMessage.includes('API key')) {
              throw new Error(`API Key 错误: ${errorMessage}\n\n请检查：\n1. API Key 是否正确\n2. API Key 是否已过期\n3. 是否在管理员界面正确配置了 TTS API Key`);
            }
            
            throw new Error(`Qwen-TTS-Realtime 错误: ${errorMessage}`);
          }

          // 获取音频数据
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);

          audio.onplay = () => {
            console.log('🔊 Qwen-TTS-Realtime 开始播放');
            setInteractionState('speak');
          };

          audio.onended = () => {
            console.log('✅ Qwen-TTS-Realtime 播放完成');
            URL.revokeObjectURL(audioUrl);
            setInteractionState('idle');
          };

          audio.onerror = (e) => {
            console.error('❌ Qwen-TTS-Realtime 播放错误:', e);
            URL.revokeObjectURL(audioUrl);
            setInteractionState('idle');
          };

          await audio.play();
        } catch (error: any) {
          console.error('❌ Qwen-TTS-Realtime 合成失败:', error);
          setInteractionState('idle');
          throw error;
        }
      };

      // 浏览器原生语音合成函数
      const startBrowserSpeechSynthesis = (text: string) => {
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

      // 统一的语音合成函数
      const startSpeechSynthesis = async (text: string) => {
        if (assignedVoiceModel.synthesisType === 'custom' && assignedVoiceModel.synthesisUrl) {
          // 使用 Qwen-TTS-Realtime
          try {
            await startQwenTTSRealtime(text);
          } catch (error: any) {
            console.warn('Qwen-TTS-Realtime 失败，回退到浏览器原生 TTS:', error);
            // 回退到浏览器原生 TTS
            startBrowserSpeechSynthesis(text);
          }
        } else {
          // 使用浏览器原生 TTS
          startBrowserSpeechSynthesis(text);
        }
      };

      // 语音合成回复（语音模式下总是启用）
      if (selectedInputMode === 'voice') {
        console.log('🎤 准备语音合成回复:', partnerText.substring(0, 50) + '...');
        
        // 等待一小段时间确保状态稳定
        setTimeout(async () => {
          try {
            // 先取消之前的语音
            if (window.speechSynthesis.speaking) {
              console.log('⚠️ 检测到正在播放，先停止');
              window.speechSynthesis.cancel();
              // 等待停止完成
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            await startSpeechSynthesis(partnerText);
          } catch (err: any) {
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
      synthesisType: 'custom',
      synthesisUrl: 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/realtime',
      synthesisKey: 'sk-c5e6833061944016adc237cc5bc92da8',
      synthesisVoice: 'Cherry',
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
      const [isRunning, setIsRunning] = useState(false);
      
      const runDiagnostic = async () => {
        setIsRunning(true);
        const info = [];
        const userAgent = navigator.userAgent;
        const isEdge = /Edg\/\d+/.test(userAgent);
        const isChrome = /Chrome\/\d+/.test(userAgent) && !/Edg\/\d+/.test(userAgent);
        
        info.push(`🌐 浏览器: ${isEdge ? 'Microsoft Edge' : isChrome ? 'Google Chrome' : '其他'}`);
        info.push(`🔧 用户代理: ${userAgent}`);
        
        if (isEdge) {
          const edgeVersion = parseInt(/Edg\/(\d+)/.exec(userAgent)![1]);
          info.push(`📊 Edge版本: ${edgeVersion}`);
          info.push(edgeVersion >= 79 ? '✅ 版本支持语音识别' : '❌ 版本过低，请更新到79+');
        } else if (isChrome) {
          const chromeVersion = parseInt(/Chrome\/(\d+)/.exec(userAgent)![1]);
          info.push(`📊 Chrome版本: ${chromeVersion}`);
          info.push(chromeVersion >= 25 ? '✅ 版本支持语音识别' : '❌ 版本过低，请更新到25+');
        }
        
        // 检查网络连接
        info.push('\n📡 网络连接检测:');
        try {
          const onlineStatus = navigator.onLine ? '✅ 在线' : '❌ 离线';
          info.push(`- 网络状态: ${onlineStatus}`);
          
          // 测试连接到常见服务（使用图片加载方式，避免CORS问题）
          const testUrls = [
            { name: 'Google', url: 'https://www.google.com/favicon.ico' },
            { name: 'Microsoft', url: 'https://www.microsoft.com/favicon.ico' },
            { name: 'GitHub', url: 'https://github.com/favicon.ico' }
          ];
          
          for (const test of testUrls) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000);
              
              // 使用图片加载方式测试网络连接（避免CORS问题）
              await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                  clearTimeout(timeoutId);
                  resolve(true);
                };
                img.onerror = () => {
                  clearTimeout(timeoutId);
                  reject(new Error('加载失败'));
                };
                img.src = test.url + '?t=' + Date.now();
                
                // 超时处理
                setTimeout(() => {
                  if (!img.complete) {
                    controller.abort();
                    reject(new Error('超时'));
                  }
                }, 3000);
              });
              
              info.push(`- ${test.name}: ✅ 可访问`);
            } catch (err) {
              info.push(`- ${test.name}: ❌ 无法访问`);
            }
          }
        } catch (err: any) {
          info.push(`- 网络检测失败: ${err.message}`);
        }
        
        // 检查麦克风权限
        info.push('\n🎤 麦克风检测:');
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as any });
          info.push(`- 权限状态: ${permission.state}`);
          
          if (permission.state === 'prompt' || permission.state === 'granted') {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              info.push('- 麦克风访问: ✅ 可以访问');
              stream.getTracks().forEach(track => track.stop());
            } catch (err: any) {
              info.push(`- 麦克风访问: ❌ 失败 (${err.message})`);
            }
          }
        } catch (err: any) {
          info.push(`- 权限查询: ❌ 失败 (${err.message})`);
        }
        
        // 检查SpeechRecognition支持
        info.push('\n🗣️ 语音识别API:');
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        info.push(SpeechRecognition ? '✅ 支持SpeechRecognition API' : '❌ 不支持SpeechRecognition API');
        
        // 检查页面协议
        info.push('\n🔒 安全协议:');
        info.push(window.location.protocol === 'https:' 
          ? '✅ 使用HTTPS（推荐）' 
          : '⚠️ 使用HTTP（建议使用HTTPS）');
        
        // 检查是否在本地环境
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname === '';
        info.push(isLocalhost ? '✅ 本地环境（localhost可用）' : '🌐 远程环境');
        
        setDiagnosticInfo(info.join('\n'));
        setIsRunning(false);
      };
      
      return (
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-4 rounded-lg border border-blue-500 mb-6">
          <h3 className="font-bold mb-3 text-yellow-300 flex items-center gap-2">
            🔍 Edge浏览器诊断工具
          </h3>
          <button 
            onClick={runDiagnostic}
            disabled={isRunning}
            className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? '正在诊断...' : '运行完整诊断（包括网络检测）'}
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
                    
                    {/* 语音识别配置 */}
                    <div className="border-l-4 border-blue-500 pl-3">
                      <h5 className="text-sm font-semibold mb-2 text-blue-300">语音识别配置</h5>
                      <div className="space-y-2 mb-2">
                        <label className="block text-xs text-gray-400 mb-1">识别类型</label>
                        <select 
                          value={model.recognitionType || 'browser'} 
                          onChange={e => updateVoiceModel(model.id, 'recognitionType', e.target.value as 'browser' | 'custom')}
                          className="w-full bg-gray-700 p-2 rounded text-sm"
                        >
                          <option value="browser">浏览器原生（免费，但需VPN）</option>
                          <option value="custom">腾讯云（推荐：新用户5小时免费，无需VPN）</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          {model.recognitionType === 'browser' 
                            ? '⚠️ 使用浏览器原生 API，需要访问 Google/Microsoft 服务，可能需要 VPN'
                            : '✅ 腾讯云：新用户免费5小时，国内可访问，无需 VPN，超出后约3元/小时'}
                        </p>
                      </div>
                      
                      {model.recognitionType === 'custom' && (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">
                              识别服务 URL
                              <span className="text-red-400 ml-1">*</span>
                            </label>
                            <input 
                              value={model.recognitionUrl || ''} 
                              onChange={e => updateVoiceModel(model.id, 'recognitionUrl', e.target.value)} 
                              placeholder="wss://asr.cloud.tencent.com/asr/v2/..."
                              className="w-full bg-gray-700 p-2 rounded text-sm" 
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              腾讯云实时语音识别 WebSocket 地址
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">
                              SecretId
                              <span className="text-red-400 ml-1">*</span>
                            </label>
                            <input 
                              type="password"
                              value={model.recognitionKey || ''} 
                              onChange={e => updateVoiceModel(model.id, 'recognitionKey', e.target.value)} 
                              placeholder="AKIDxxxxxxxxxxxxx"
                              className="w-full bg-gray-700 p-2 rounded text-sm border-2 border-blue-500/30" 
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              提示：建议通过后端 API 获取临时密钥，不要在前端直接存储 SecretKey
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">识别模型</label>
                            <input 
                              value={model.recognitionModel || '16k_zh'} 
                              onChange={e => updateVoiceModel(model.id, 'recognitionModel', e.target.value)} 
                              placeholder="16k_zh"
                              className="w-full bg-gray-700 p-2 rounded text-sm" 
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              常用值：16k_zh（中文）、16k_zh_large（中文大模型）、16k_en（英文）
                            </p>
                          </div>
                          <div className="p-2 bg-green-900/30 rounded text-xs text-green-300">
                            <p className="font-semibold mb-1">💰 最省钱方案：</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              <li><strong>新用户免费5小时</strong>实时语音识别（0元）</li>
                              <li>超出后约 <strong>3元/小时</strong>（比浏览器原生+VPN更稳定）</li>
                              <li>国内可访问，<strong>无需 VPN</strong></li>
                            </ul>
                            <p className="font-semibold mt-2 mb-1">⚙️ 快速配置：</p>
                            <ol className="list-decimal list-inside space-y-1 ml-2">
                              <li>访问 <a href="https://console.cloud.tencent.com/cam/capi" target="_blank" rel="noopener noreferrer" className="underline text-green-400">腾讯云控制台</a> 获取 SecretId 和 SecretKey</li>
                              <li>开通 <a href="https://console.cloud.tencent.com/asr" target="_blank" rel="noopener noreferrer" className="underline text-green-400">实时语音识别服务</a>（免费试用）</li>
                              <li>填写上方配置信息即可使用</li>
                            </ol>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* 语音合成配置 */}
                    <div className="border-l-4 border-green-500 pl-3">
                      <h5 className="text-sm font-semibold mb-2 text-green-300">语音合成配置</h5>
                      <div className="space-y-2 mb-2">
                        <label className="block text-xs text-gray-400 mb-1">合成类型</label>
                        <select 
                          value={model.synthesisType || 'browser'} 
                          onChange={e => updateVoiceModel(model.id, 'synthesisType', e.target.value as 'browser' | 'custom')}
                          className="w-full bg-gray-700 p-2 rounded text-sm"
                        >
                          <option value="browser">浏览器原生 TTS</option>
                          <option value="custom">Qwen-TTS-Realtime</option>
                        </select>
                      </div>
                      
                      {model.synthesisType === 'custom' ? (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">TTS API URL</label>
                            <input 
                              value={model.synthesisUrl || ''} 
                              onChange={e => updateVoiceModel(model.id, 'synthesisUrl', e.target.value)} 
                              placeholder="https://dashscope.aliyuncs.com/api/v1/services/audio/tts/realtime"
                              className="w-full bg-gray-700 p-2 rounded text-sm" 
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">
                              TTS API Key 
                              <span className="text-red-400 ml-1">*</span>
                              {model.synthesisKey && (
                                <span className="text-green-400 ml-2 text-xs">
                                  ✓ 已配置 ({model.synthesisKey.length} 字符)
                                </span>
                              )}
                            </label>
                            <input 
                              type="password"
                              value={model.synthesisKey || ''} 
                              onChange={e => updateVoiceModel(model.id, 'synthesisKey', e.target.value)} 
                              placeholder="sk-xxxxxxxxxxxxx"
                              className="w-full bg-gray-700 p-2 rounded text-sm border-2 border-blue-500/30" 
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              提示：API Key 通常以 "sk-" 开头，可在 
                              <a 
                                href="https://dashscope.console.aliyun.com/api-key" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline ml-1"
                              >
                                DashScope 控制台
                              </a>
                              获取
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">音色 (Cherry/Ethan/Chelsie/Serena)</label>
                            <input 
                              value={model.synthesisVoice || 'Cherry'} 
                              onChange={e => updateVoiceModel(model.id, 'synthesisVoice', e.target.value)} 
                              placeholder="Cherry"
                              className="w-full bg-gray-700 p-2 rounded text-sm" 
                            />
                          </div>
                        </div>
                      ) : (
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
                      )}
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
                <span className="text-xs text-green-600 mt-1 font-semibold">✓ 无需VPN</span>
              </button>
              <button 
                onClick={switchToVoiceMode} 
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${selectedInputMode === 'voice' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <AudioLines className="mb-2 text-blue-500" size={24} />
                <span className="text-sm font-bold">语音模式</span>
                <span className="text-xs text-gray-500 mt-1">语音对话</span>
                <span className="text-xs text-yellow-600 mt-1 font-semibold">⚠️ 浏览器需VPN</span>
                <span className="text-xs text-green-600 mt-0.5 font-semibold">✓ 腾讯云免费5小时</span>
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
            
            {selectedInputMode === 'voice' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle size={16} />
                  关于语音识别网络要求
                </p>
                <ul className="text-yellow-700 text-xs space-y-1 list-disc list-inside ml-2">
                  <li>应用本身（访问 Vercel）：<strong>不需要 VPN</strong></li>
                  <li>浏览器原生语音识别：<strong>可能需要 VPN</strong>（免费但需访问 Google/Microsoft）</li>
                  <li><strong className="text-green-600">腾讯云语音识别（推荐）</strong>：<strong>不需要 VPN</strong>，新用户免费5小时</li>
                  <li>建议：在管理员界面配置腾讯云语音识别，<strong>最便捷且省钱</strong></li>
                  <li>备选：如果语音识别失败，可以切换到文本模式继续实验</li>
                </ul>
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
                  <span className="font-bold">语音识别问题</span>
                </div>
                <button 
                  onClick={() => setRecognitionError('')}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
              <p className="text-red-600 text-sm whitespace-pre-line mb-3">{recognitionError}</p>
              
              {/* 网络错误特殊提示 */}
              {recognitionError.includes('网络错误') && (
                <div className="mb-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                  <p className="text-yellow-800 text-xs font-semibold mb-2">🌐 网络错误解决方案：</p>
                  <div className="space-y-2">
                    <div className="bg-green-50 p-2 rounded border border-green-200">
                      <p className="text-green-800 text-xs font-semibold mb-1">✅ 推荐方案：使用腾讯云语音识别（无需 VPN）</p>
                      <ol className="text-green-700 text-xs list-decimal list-inside space-y-1 ml-2">
                        <li>点击右下角 ⚙️ 设置按钮</li>
                        <li>进入管理员界面</li>
                        <li>选择"识别类型"为"腾讯云"</li>
                        <li>填写腾讯云配置（新用户免费 5 小时）</li>
                        <li>保存后重新登录使用</li>
                      </ol>
                    </div>
                    <div className="bg-blue-50 p-2 rounded border border-blue-200">
                      <p className="text-blue-800 text-xs font-semibold mb-1">💡 其他方案：</p>
                      <ul className="text-blue-700 text-xs list-disc list-inside space-y-1 ml-2">
                        <li>使用 VPN 连接后重试</li>
                        <li>切换到文本模式继续实验</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mb-3 p-2 bg-red-100 rounded border border-red-200">
                <p className="text-red-700 text-xs font-semibold mb-1">💡 浏览器权限解决方案：</p>
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
                  onClick={() => {
                    setCurrentView('admin');
                    setRecognitionError('');
                  }}
                  className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 py-2 rounded text-sm flex items-center justify-center gap-1"
                >
                  <Settings size={14} /> 配置腾讯云
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
