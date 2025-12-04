/**
 * 统一配置文件
 * 包含所有服务的 API Key、URL 和配置信息
 */

export interface ServiceConfig {
  // 腾讯云语音识别配置
  tencentCloud: {
    asr: {
      url: string; // WebSocket URL，格式：wss://asr.cloud.tencent.com/asr/v2/{AppId}
      appId: string; // 从 URL 中提取或单独配置
      secretId: string; // 腾讯云 SecretId
      secretKey: string; // 腾讯云 SecretKey
      engineModelType?: string; // 识别模型，默认：16k_zh
      voiceFormat?: string; // 音频格式，默认：1
      needvad?: string; // 是否需要VAD，默认：1
      filterDirty?: string; // 过滤脏话，默认：0
      filterModal?: string; // 过滤语气词，默认：0
      filterPunc?: string; // 过滤标点，默认：0
      convertNumMode?: string; // 数字转换模式，默认：1
    };
  };

  // 阿里云 DashScope 配置
  dashScope: {
    // 语音合成 (TTS)
    tts: {
      url: string; // TTS API URL
      apiKey: string; // DashScope API Key
      voice?: string; // 音色：Cherry, Ethan, Serena, Chelsie
    };
    
    // 文本 LLM
    llm: {
      url: string; // LLM API URL
      apiKey: string; // DashScope API Key
      modelName: string; // 模型名称，如：qwen-plus
    };
  };

  // Supabase 配置（可选，如果使用环境变量则不需要）
  supabase?: {
    url: string;
    anonKey: string;
  };
}

/**
 * 默认配置
 * 
 * ⚠️ 重要提示：
 * 1. 请将敏感信息替换为您的实际配置
 * 2. SecretId 和 SecretKey 必须是一对匹配的密钥
 * 3. 建议使用环境变量管理敏感信息（.env 文件）
 * 
 * 签名算法：TC3-HMAC-SHA256（腾讯云标准签名算法）
 */
export const defaultConfig: ServiceConfig = {
  tencentCloud: {
    asr: {
      url: 'wss://asr.cloud.tencent.com/asr/v2/1342201105',
      appId: '1342201105', // 从 URL 中提取
      secretId: 'AKIDDH9pIYdWHwkPAsPkustsiLm397va3JMC',
      secretKey: 'nNpJhuuzEQSGrGf0A7750pT0X3OVSRMI',
      engineModelType: '16k_zh',
      voiceFormat: '1',
      needvad: '1',
      filterDirty: '0',
      filterModal: '0',
      filterPunc: '0',
      convertNumMode: '1',
    },
  },
  dashScope: {
    tts: {
      url: 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/realtime',
      apiKey: 'sk-c5e6833061944016adc237cc5bc92da8',
      voice: 'Cherry',
    },
    llm: {
      url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      apiKey: 'sk-c5e6833061944016adc237cc5bc92da8',
      modelName: 'qwen-plus',
    },
  },
};

/**
 * 从环境变量或配置文件加载配置
 */
export function loadConfig(): ServiceConfig {
  // 优先使用环境变量
  const config: ServiceConfig = {
    tencentCloud: {
      asr: {
        url: import.meta.env.VITE_TENCENT_ASR_URL || defaultConfig.tencentCloud.asr.url,
        appId: import.meta.env.VITE_TENCENT_APP_ID || defaultConfig.tencentCloud.asr.appId,
        secretId: import.meta.env.VITE_TENCENT_SECRET_ID || defaultConfig.tencentCloud.asr.secretId,
        secretKey: import.meta.env.VITE_TENCENT_SECRET_KEY || defaultConfig.tencentCloud.asr.secretKey,
        engineModelType: import.meta.env.VITE_TENCENT_ENGINE_MODEL_TYPE || defaultConfig.tencentCloud.asr.engineModelType,
        voiceFormat: import.meta.env.VITE_TENCENT_VOICE_FORMAT || defaultConfig.tencentCloud.asr.voiceFormat,
        needvad: import.meta.env.VITE_TENCENT_NEED_VAD || defaultConfig.tencentCloud.asr.needvad,
        filterDirty: import.meta.env.VITE_TENCENT_FILTER_DIRTY || defaultConfig.tencentCloud.asr.filterDirty,
        filterModal: import.meta.env.VITE_TENCENT_FILTER_MODAL || defaultConfig.tencentCloud.asr.filterModal,
        filterPunc: import.meta.env.VITE_TENCENT_FILTER_PUNC || defaultConfig.tencentCloud.asr.filterPunc,
        convertNumMode: import.meta.env.VITE_TENCENT_CONVERT_NUM_MODE || defaultConfig.tencentCloud.asr.convertNumMode,
      },
    },
    dashScope: {
      tts: {
        url: import.meta.env.VITE_DASHSCOPE_TTS_URL || defaultConfig.dashScope.tts.url,
        apiKey: import.meta.env.VITE_DASHSCOPE_TTS_KEY || defaultConfig.dashScope.tts.apiKey,
        voice: import.meta.env.VITE_DASHSCOPE_TTS_VOICE || defaultConfig.dashScope.tts.voice,
      },
      llm: {
        url: import.meta.env.VITE_DASHSCOPE_LLM_URL || defaultConfig.dashScope.llm.url,
        apiKey: import.meta.env.VITE_DASHSCOPE_LLM_KEY || defaultConfig.dashScope.llm.apiKey,
        modelName: import.meta.env.VITE_DASHSCOPE_LLM_MODEL || defaultConfig.dashScope.llm.modelName,
      },
    },
  };

  // 如果配置了 Supabase 环境变量
  if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
    config.supabase = {
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    };
  }

  return config;
}

/**
 * 将配置转换为 VoiceModelConfig 格式（用于兼容现有代码）
 */
export function configToVoiceModelConfig(config: ServiceConfig, alias: string, systemPrompt: string) {
  return {
    id: `model_${Date.now()}`,
    alias: alias,
    recognitionType: 'custom' as const,
    recognitionUrl: config.tencentCloud.asr.url,
    recognitionKey: config.tencentCloud.asr.secretId,
    recognitionSecretKey: config.tencentCloud.asr.secretKey,
    recognitionModel: config.tencentCloud.asr.engineModelType,
    synthesisType: 'custom' as const,
    synthesisUrl: config.dashScope.tts.url,
    synthesisKey: config.dashScope.tts.apiKey,
    synthesisVoice: config.dashScope.tts.voice,
    textLLM: {
      url: config.dashScope.llm.url,
      key: config.dashScope.llm.apiKey,
      modelName: config.dashScope.llm.modelName,
      systemPrompt: systemPrompt,
    },
  };
}

