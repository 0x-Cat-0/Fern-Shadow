/**
 * 百度 AI 植物识别 API 服务
 * 文档: https://ai.baidu.com/ai-doc/IMAGERECOGNITION/Jk3h3tsy9
 */

// 百度 API 配置
const API_KEY = 'GuJmHsC0g2te3DBjhD3gfkW5';
const SECRET_KEY = 'VFcyusUhRuCKZvjC77N7Do9Jzqm3GNXS';

// Access Token 缓存
let cachedToken: string | null = null;
let tokenExpireTime: number = 0;

// 获取 Access Token
async function getAccessToken(): Promise<string> {
  // 如果缓存的 token 还未过期，直接返回
  if (cachedToken && Date.now() < tokenExpireTime) {
    return cachedToken;
  }

  const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${API_KEY}&client_secret=${SECRET_KEY}`;

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.access_token) {
      const token = data.access_token as string;
      cachedToken = token;
      // 提前 5 分钟过期
      tokenExpireTime = Date.now() + (data.expires_in - 300) * 1000;
      return token;
    } else {
      throw new Error(data.error || 'Failed to get access token');
    }
  } catch (error) {
    console.error('Failed to get access token:', error);
    throw error;
  }
}

// 植物识别结果
export interface PlantResult {
  name: string;          // 植物名称
  latinName?: string;     // 拉丁学名
  probability?: number;   // 置信度 0-1
  description?: string;   // 植物描述
}

// API 返回的原始结果
interface BaiduPlantResult {
  log_id: number;
  result: Array<{
    name: string;
    score: number;
    baike_info?: {
      baike_url?: string;
      image_url?: string;
      description?: string;
    };
  }>;
}

// 识别图片中的植物
export async function recognizePlant(imageBase64: string): Promise<PlantResult[]> {
  const accessToken = await getAccessToken();
  const apiUrl = `https://aip.baidubce.com/rest/2.0/image-classify/v1/plant?access_token=${accessToken}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `image=${encodeURIComponent(imageBase64)}&baike_num=1`,
    });

    console.log('=== Baidu API Response Status ===');
    console.log('status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('=== Baidu API Error ===');
      console.log('error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: BaiduPlantResult = await response.json();
    console.log('=== Baidu API Response Data ===');
    console.log(JSON.stringify(data, null, 2));

    if (data.result && data.result.length > 0) {
      return data.result.map((item) => ({
        name: item.name,
        probability: item.score,
        description: item.baike_info?.description,
      }));
    }

    return [];
  } catch (error) {
    console.error('Plant recognition failed:', error);
    throw error;
  }
}

// 将图片 URI 转换为 base64
export async function imageUriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // 移除 data:image/...;base64, 前缀
      const base64Data = base64.split(',')[1] || base64;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// 清除 token 缓存（用于调试或强制刷新）
export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpireTime = 0;
}