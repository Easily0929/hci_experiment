// Vercel Serverless Functions 类型定义
interface VercelRequest {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[]>;
  body?: any;
  cookies?: Record<string, string>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(data: any): VercelResponse;
  send(data: any): VercelResponse;
  end(): VercelResponse;
  setHeader(name: string, value: string): VercelResponse;
}

import crypto from 'crypto';

/**
 * 腾讯云 WebSocket 签名生成 API
 * 
 * 使用方法：
 * POST /api/tencent-signature
 * Body: {
 *   secretId: string,
 *   appId: string,
 *   params: {
 *     engine_model_type: string,
 *     voice_format: string,
 *     needvad: string,
 *     filter_dirty: string,
 *     filter_modal: string,
 *     filter_punc: string,
 *     convert_num_mode: string,
 *     timestamp: number,
 *     nonce: number,
 *     voice_id: string
 *   }
 * }
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { secretId, appId, params } = req.body;

    // 验证必需参数
    if (!secretId || !appId || !params) {
      return res.status(400).json({ 
        error: 'Missing required parameters: secretId, appId, params' 
      });
    }

    // 从环境变量获取 SecretKey（安全）
    const secretKey = process.env.TENCENT_CLOUD_SECRET_KEY;
    if (!secretKey) {
      console.error('TENCENT_CLOUD_SECRET_KEY environment variable is not set');
      return res.status(500).json({ 
        error: 'Server configuration error: SecretKey not configured' 
      });
    }

    // 构建参数字典（按字典序排序）
    const sortedParams: Record<string, string> = {
      engine_model_type: params.engine_model_type || '16k_zh',
      expired: ((params.timestamp || Math.floor(Date.now() / 1000)) + 300).toString(), // 5分钟后过期
      filter_dirty: params.filter_dirty || '0',
      filter_modal: params.filter_modal || '0',
      filter_punc: params.filter_punc || '0',
      needvad: params.needvad || '1',
      nonce: (params.nonce || Math.floor(Math.random() * 1000000)).toString(),
      secretid: secretId,
      timestamp: (params.timestamp || Math.floor(Date.now() / 1000)).toString(),
      voice_format: params.voice_format || '1',
      voice_id: params.voice_id || generateUUID(),
    };

    // 按字典序排序参数键
    const sortedKeys = Object.keys(sortedParams).sort();
    
    // 构建参数字符串
    const paramString = sortedKeys
      .map(key => `${key}=${encodeURIComponent(sortedParams[key])}`)
      .join('&');

    // 构建完整签名字符串
    const signString = `asr.cloud.tencent.com/asr/v2/${appId}?${paramString}`;

    // HMAC-SHA1 加密
    const hmac = crypto.createHmac('sha1', secretKey);
    hmac.update(signString);
    const signature = hmac.digest('base64');

    // URL 编码
    const finalSignature = encodeURIComponent(signature);

    // 返回签名和参数（用于构建 WebSocket URL）
    return res.status(200).json({
      signature: finalSignature,
      params: sortedParams,
      signString: signString, // 调试用，生产环境可移除
    });

  } catch (error: any) {
    console.error('签名生成错误:', error);
    return res.status(500).json({ 
      error: 'Failed to generate signature',
      message: error.message 
    });
  }
}

/**
 * 生成 UUID（简单版本，用于 voice_id）
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
