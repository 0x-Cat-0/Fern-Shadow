import {
  getInfoAsync,
  makeDirectoryAsync,
  copyAsync,
  deleteAsync,
  readDirectoryAsync,
  documentDirectory,
} from 'expo-file-system/legacy';

const IMAGE_DIRECTORY_NAME = 'images';

// 获取图片目录路径
export function getImageDirectoryPath(): string {
  return `${documentDirectory}${IMAGE_DIRECTORY_NAME}/`;
}

// 确保目录存在
async function ensureDirectoryExists(): Promise<void> {
  const dir = getImageDirectoryPath();
  const dirInfo = await getInfoAsync(dir);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(dir, { intermediates: true });
  }
}

// 从 URI 复制图片到文档目录
export async function copyImageToDocumentDirectory(sourceUri: string): Promise<string> {
  await ensureDirectoryExists();

  // 生成唯一文件名
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(sourceUri) || 'jpg';
  const filename = `${timestamp}_${random}.${extension}`;

  const destinationDir = getImageDirectoryPath();
  const destinationPath = `${destinationDir}${filename}`;

  // 复制文件
  await copyAsync({
    from: sourceUri,
    to: destinationPath,
  });

  return destinationPath;
}

// 批量复制图片到文档目录
export async function copyImagesToDocumentDirectory(sourceUris: string[]): Promise<string[]> {
  return Promise.all(sourceUris.map(uri => copyImageToDocumentDirectory(uri)));
}

// 删除图片
export async function deleteImage(imagePath: string): Promise<void> {
  try {
    const fileInfo = await getInfoAsync(imagePath);
    if (fileInfo.exists) {
      await deleteAsync(imagePath);
    }
  } catch (error) {
    console.warn('Failed to delete image:', error);
  }
}

// 删除多张图片
export async function deleteImages(imagePaths: string[]): Promise<void> {
  await Promise.all(imagePaths.map(path => deleteImage(path)));
}

// 获取文件扩展名
function getFileExtension(uri: string): string | null {
  const match = uri.match(/\.(\w+)(?:\?|$)/);
  return match ? match[1] : null;
}

// 检查图片是否存在
export async function imageExists(imagePath: string): Promise<boolean> {
  try {
    const fileInfo = await getInfoAsync(imagePath);
    return fileInfo.exists;
  } catch {
    return false;
  }
}

// 清理不再使用的图片
export async function cleanupUnusedImages(usedPaths: string[]): Promise<void> {
  try {
    await ensureDirectoryExists();
    const imageDir = getImageDirectoryPath();
    const files = await readDirectoryAsync(imageDir);
    const usedSet = new Set(usedPaths);

    for (const fileName of files) {
      const filePath = `${imageDir}${fileName}`;
      if (!usedSet.has(filePath)) {
        await deleteAsync(filePath);
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup unused images:', error);
  }
}