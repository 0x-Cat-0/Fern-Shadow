import { getInfoAsync, deleteAsync } from 'expo-file-system/legacy';

// 删除图片（仅用于删除用户手动选择的本地图片）
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