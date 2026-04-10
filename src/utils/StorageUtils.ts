import {
  getInfoAsync,
  readDirectoryAsync,
  documentDirectory,
} from 'expo-file-system/legacy';

const IMAGE_DIRECTORY_NAME = 'images';

// 获取图片目录路径
function getImageDirectoryPath(): string {
  return `${documentDirectory}${IMAGE_DIRECTORY_NAME}/`;
}

// 获取存储信息
export async function getStorageInfo(): Promise<{
  used: number;
  total: number;
  imageCount: number;
}> {
  try {
    const imageDir = getImageDirectoryPath();

    // 检查目录是否存在
    const dirInfo = await getInfoAsync(imageDir);
    if (!dirInfo.exists) {
      return { used: 0, total: 0, imageCount: 0 };
    }

    // 读取目录下的所有文件
    const files = await readDirectoryAsync(imageDir);
    let used = 0;
    let imageCount = 0;

    for (const fileName of files) {
      const filePath = `${imageDir}${fileName}`;
      const fileInfo = await getInfoAsync(filePath);
      if (fileInfo.exists) {
        const size = (fileInfo as any).size || (fileInfo as any).fileSize || 0;
        used += size;
        imageCount++;
      }
    }

    return { used, total: used, imageCount };
  } catch (error) {
    console.error('Failed to get storage info:', error);
    return { used: 0, total: 0, imageCount: 0 };
  }
}

// 获取单个文件大小
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const fileInfo = await getInfoAsync(filePath);
    if (fileInfo.exists) {
      return (fileInfo as any).size || (fileInfo as any).fileSize || 0;
    }
  } catch {
    // 忽略错误
  }
  return 0;
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}