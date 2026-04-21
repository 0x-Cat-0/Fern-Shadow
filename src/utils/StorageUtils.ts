import {
  getInfoAsync,
  readDirectoryAsync,
  deleteAsync,
  cacheDirectory,
} from 'expo-file-system/legacy';

// 获取临时缓存大小（cacheDirectory目录）
export async function getCacheSize(): Promise<number> {
  try {
    const cacheDir = cacheDirectory;
    if (!cacheDir) return 0;

    const dirInfo = await getInfoAsync(cacheDir);
    if (!dirInfo.exists) {
      return 0;
    }

    const files = await readDirectoryAsync(cacheDir);
    let totalSize = 0;

    for (const fileName of files) {
      const filePath = `${cacheDir}${fileName}`;
      const fileInfo = await getInfoAsync(filePath);
      if (fileInfo.exists && !fileInfo.isDirectory) {
        const size = (fileInfo as any).size || (fileInfo as any).fileSize || 0;
        totalSize += size;
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Failed to get cache size:', error);
    return 0;
  }
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}

// 清除临时缓存（仅清除 cacheDirectory）
export async function clearCache(): Promise<void> {
  try {
    const cacheDir = cacheDirectory;
    if (!cacheDir) return;

    const dirInfo = await getInfoAsync(cacheDir);
    if (!dirInfo.exists) {
      return;
    }

    const files = await readDirectoryAsync(cacheDir);
    for (const fileName of files) {
      const filePath = `${cacheDir}${fileName}`;
      const fileInfo = await getInfoAsync(filePath);
      if (fileInfo.exists && !fileInfo.isDirectory) {
        await deleteAsync(filePath);
      }
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
    throw error;
  }
}