/**
 * 腾讯云实时语音识别签名生成模块
 * 使用 TC3-HMAC-SHA256 签名算法
 */

import CryptoJS from "crypto-js";

function sha256Hex(msg: string) {
  return CryptoJS.SHA256(msg).toString(CryptoJS.enc.Hex);
}

function hmacSHA256(key: CryptoJS.lib.WordArray | string, msg: string) {
  return CryptoJS.HmacSHA256(msg, key).toString(CryptoJS.enc.Hex);
}

export interface TencentASRParams {
  appId: string;
  secretId: string;
  secretKey: string;
  engineModelType?: string;
  voiceFormat?: string;
  needvad?: string;
  filterDirty?: string;
  filterModal?: string;
  filterPunc?: string;
  convertNumMode?: string;
}

export function buildTencentASRUrl({
  appId,
  secretId,
  secretKey,
  engineModelType = "16k_zh",
  voiceFormat = "1",
  needvad = "1",
  filterDirty = "0",
  filterModal = "0",
  filterPunc = "0",
  convertNumMode = "1",
}: TencentASRParams): string {
  const host = "asr.cloud.tencent.com";
  const uri = `/asr/v2/${appId}`;

  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().split("T")[0].replace(/-/g, "");
  const expired = timestamp + 3600;
  const nonce = Math.floor(Math.random() * 10000000);
  const voiceId = `${Date.now()}_${nonce}`;

  const params: Record<string, string> = {
    secretid: secretId,
    engine_model_type: engineModelType,
    voice_id: voiceId,
    timestamp: String(timestamp),
    expired: String(expired),
    voice_format: voiceFormat,
    needvad: needvad,
    filter_dirty: filterDirty,
    filter_modal: filterModal,
    filter_punc: filterPunc,
    convert_num_mode: convertNumMode,
  };

  // build canonical query
  const queryString = Object.keys(params)
    .sort()
    .map(k => `${k}=${encodeURIComponent(params[k])}`)
    .join("&");

  const canonicalRequest = [
    "GET",
    uri,
    queryString,
    `host:${host}\n`,
    "host",
    sha256Hex(""),
  ].join("\n");

  const hashedCanonicalRequest = sha256Hex(canonicalRequest);

  const algorithm = "TC3-HMAC-SHA256";
  const credentialScope = `${date}/asr/tc3_request`;

  const stringToSign = [
    algorithm,
    String(timestamp),
    credentialScope,
    hashedCanonicalRequest,
  ].join("\n");

  const kDate = CryptoJS.HmacSHA256(date, "TC3" + secretKey);
  const kService = CryptoJS.HmacSHA256("asr", kDate);
  const kSigning = CryptoJS.HmacSHA256("tc3_request", kService);
  const signature = CryptoJS.HmacSHA256(stringToSign, kSigning).toString();

  const wsUrl =
    `wss://${host}${uri}?${queryString}` +
    `&algorithm=${algorithm}` +
    `&credential=${secretId}/${credentialScope}` +
    `&signature=${signature}`;

  return wsUrl;
}

