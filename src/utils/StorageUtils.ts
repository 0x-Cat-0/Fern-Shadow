import {
  getInfoAsync,
  readDirectoryAsync,
  deleteAsync,
  documentDirectory,
  cacheDirectory,
} from 'expo-file-system/legacy';

const IMAGE_DIRECTORY_NAME = 'images';

// 获取图片目录路径
function getImageDirectoryPath(): string {
  return `${documentDirectory}${IMAGE_DIRECTORY_NAME}/`;
}

// 获取已保存图片大小（documents/images/目录）
export async function getImageLibrarySize(): Promise<{
  used: number;
  imageCount: number;
}> {
  try {
    const imageDir = getImageDirectoryPath();
    const dirInfo = await getInfoAsync(imageDir);
    if (!dirInfo.exists) {
      return { used: 0, imageCount: 0 };
    }

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

    return { used, imageCount };
  } catch (error) {
    console.error('Failed to get image library size:', error);
    return { used: 0, imageCount: 0 };
  }
}

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
      // 跳过 images 目录（用户保存的图片）
      if (fileName === IMAGE_DIRECTORY_NAME) continue;
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

// 获取存储信息（兼容旧接口）
export async function getStorageInfo(): Promise<{
  used: number;
  total: number;
  imageCount: number;
}> {
  const imageLibrary = await getImageLibrarySize();
  return {
    used: imageLibrary.used,
    total: imageLibrary.used,
    imageCount: imageLibrary.imageCount,
  };
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

// 清除临时缓存（仅清除 cacheDirectory，不影响 documents/images/）
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
      // 跳过 images 目录（用户保存的图片）
      if (fileName === IMAGE_DIRECTORY_NAME) continue;
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

// 清除图片目录（已保存的图片）
export async function clearImageDirectory(): Promise<void> {
  try {
    const imageDir = getImageDirectoryPath();
    const dirInfo = await getInfoAsync(imageDir);
    if (!dirInfo.exists) {
      return;
    }

    const files = await readDirectoryAsync(imageDir);
    for (const fileName of files) {
      const filePath = `${imageDir}${fileName}`;
      const fileInfo = await getInfoAsync(filePath);
      if (fileInfo.exists) {
        await deleteAsync(filePath);
      }
    }
  } catch (error) {
    console.error('Failed to clear image directory:', error);
    throw error;
  }
}