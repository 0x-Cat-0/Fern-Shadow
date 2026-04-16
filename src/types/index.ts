export interface Group {
  id: number;
  coverImagePath: string;
  title: string;
  description: string;
  viewCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Individual {
  id: number;
  coverImagePath: string;
  title: string;
  description: string;
  viewCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Record {
  id: number;
  individualId: number;
  imagePath: string | string[];
  imageAssetIds: string | string[];  // 相册 assetId 列表
  title: string;
  description: string;
  recordDate: number;
  createdAt: number;
}

export type SortType = 'default' | 'hot' | 'least_hot' | 'latest' | 'oldest';

export type CreateGroupDto = Pick<Group, 'coverImagePath' | 'title' | 'description'>;
export type UpdateGroupDto = Partial<Pick<Group, 'coverImagePath' | 'title' | 'description'>>;

export type CreateIndividualDto = Pick<Individual, 'coverImagePath' | 'title' | 'description'> & { groupIds?: number[] };
export type UpdateIndividualDto = Partial<Pick<Individual, 'coverImagePath' | 'title' | 'description'>>;

export type CreateRecordDto = Pick<Record, 'individualId' | 'imagePath' | 'imageAssetIds' | 'title' | 'description' | 'recordDate'>;
export type UpdateRecordDto = Partial<Pick<Record, 'imagePath' | 'imageAssetIds' | 'title' | 'description' | 'recordDate'>>;

export type ThemeMode = 'light' | 'dark' | 'system';

export type RootStackParamList = {
  TabContainer: undefined;
  MainHome: undefined;
  Community: undefined;
  PlantRecognition: undefined;
  Profile: undefined;
  GroupList: undefined;
  GroupDetail: { groupId: number };
  IndividualDetail: { individualId: number };
  CreateGroup: undefined;
  EditGroup: { groupId: number };
  CreateIndividual: { imageSource?: 'camera' | 'library' };
  EditIndividual: { individualId: number };
  CreateRecord: { individualId: number };
  EditRecord: { recordId: number };
  StorageManagement: undefined;
};