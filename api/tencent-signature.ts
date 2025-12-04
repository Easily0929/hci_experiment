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

    // 生成时间戳和随机数（如果未提供）
    const timestamp = params.timestamp || Math.floor(Date.now() / 1000);
    const nonce = params.nonce || Math.floor(Math.random() * 1000000);
    const expired = timestamp + 300; // 5分钟后过期

    // 构建参数字典（按字典序排序）
    const sortedParams: Record<string, string> = {
      engine_model_type: params.engine_model_type || '16k_zh',
      expired: expired.toString(),
      filter_dirty: params.filter_dirty || '0',
      filter_modal: params.filter_modal || '0',
      filter_punc: params.filter_punc || '0',
      needvad: params.needvad || '1',
      nonce: nonce.toString(),
      secretid: secretId, // 注意：腾讯云要求小写 secretid
      timestamp: timestamp.toString(),
      voice_format: params.voice_format || '1',
      voice_id: params.voice_id || generateUUID(),
    };

    // 按字典序排序参数键
    const sortedKeys = Object.keys(sortedParams).sort();
    
    // 构建参数字符串（注意：值需要 URL 编码）
    const paramString = sortedKeys
      .map(key => {
        const value = sortedParams[key];
        // 确保值被正确编码
        return `${key}=${encodeURIComponent(value)}`;
      })
      .join('&');

    // 构建完整签名字符串（注意：不包含协议和端口）
    const signString = `asr.cloud.tencent.com/asr/v2/${appId}?${paramString}`;

    // 调试日志（生产环境可移除）
    console.log('签名调试信息:', {
      signString: signString.substring(0, 200) + '...', // 只显示前200字符
      secretKeyLength: secretKey.length,
      secretKeyPrefix: secretKey.substring(0, 5) + '...',
      secretId: secretId,
      appId: appId,
    });

    // HMAC-SHA1 加密
    const hmac = crypto.createHmac('sha1', secretKey);
    hmac.update(signString, 'utf8'); // 明确指定编码
    const signature = hmac.digest('base64');

    // URL 编码
    const finalSignature = encodeURIComponent(signature);

    // 返回签名和参数（用于构建 WebSocket URL）
    return res.status(200).json({
      signature: finalSignature,
      params: sortedParams,
      // 调试信息（生产环境可移除）
      debug: {
        signStringLength: signString.length,
        signatureLength: finalSignature.length,
        hasSecretKey: !!secretKey,
      },
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

