import { File, Directory, Paths } from 'expo-file-system';

const IMAGE_DIRECTORY_NAME = 'images';

// 获取图片目录
function getImageDirectory(): Directory {
  return new Directory(Paths.document, IMAGE_DIRECTORY_NAME);
}

// 确保目录存在
function ensureDirectoryExists(): void {
  const dir = getImageDirectory();
  if (!dir.exists) {
    dir.create();
  }
}

// 从 URI 复制图片到文档目录
export async function copyImageToDocumentDirectory(sourceUri: string): Promise<string> {
  ensureDirectoryExists();

  // 生成唯一文件名
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(sourceUri) || 'jpg';
  const filename = `${timestamp}_${random}.${extension}`;

  const destinationDir = getImageDirectory();
  const destinationFile = new File(destinationDir, filename);

  // 复制文件
  const sourceFile = new File(sourceUri);
  sourceFile.copy(destinationFile);

  return destinationFile.uri;
}

// 批量复制图片到文档目录
export async function copyImagesToDocumentDirectory(sourceUris: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const uri of sourceUris) {
    const newUri = await copyImageToDocumentDirectory(uri);
    results.push(newUri);
  }
  return results;
}

// 删除图片
export async function deleteImage(imagePath: string): Promise<void> {
  try {
    const file = new File(imagePath);
    if (file.exists) {
      file.delete();
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
    const file = new File(imagePath);
    return file.exists;
  } catch {
    return false;
  }
}

// 获取图片目录路径
export function getImageDirectoryPath(): string {
  return getImageDirectory().uri;
}

// 清理不再使用的图片（可选的维护函数）
export async function cleanupUnusedImages(usedPaths: string[]): Promise<void> {
  try {
    ensureDirectoryExists();
    const dir = getImageDirectory();
    const files = dir.list();
    const usedSet = new Set(usedPaths);

    for (const file of files) {
      if (file instanceof File && !usedSet.has(file.uri)) {
        file.delete();
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup unused images:', error);
  }
}
