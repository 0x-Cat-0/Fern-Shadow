# 植物记录相机 App - 企业级开发文档

**版本**: 1.3
**更新日期**: 2026-04-06
**状态**: 待开发（UI设计已确认）

---

## 附录：UI 原型

- [首页原型](./plant_home_prototype.html) - 全部页面瀑布流
- [分组页面原型](./plant_category_prototype.html) - 分组三列布局 + 分组详情
- [个体记录原型](./plant_individual_prototype.html) - 个体详情页 + 时间线记录

---

## 一、项目概述

### 1.1 项目简介

| 项目名称 | 植物记录相机 |
|---------|------------|
| 项目类型 | Android 原生应用（Expo + React Native） |
| 核心功能 | 离线植物记录管理，支持拍照/相册添加植物分组、个体和生长记录 |
| 目标用户 | 植物爱好者、园艺用户 |
| 网络需求 | **完全离线**，无需任何网络连接 |

### 1.2 功能范围

**MVP 版本包含：**
- 分组管理（CRUD）
- 个体管理（CRUD）
- 记录管理（CRUD）
- 首页瀑布流展示
- 搜索功能
- 排序功能（默认/最热/最新）
- 图片管理（拍照/相册选择/级联删除）
- 浏览量统计

**待实现功能（v2.0）：**
- 编辑分组/个体/记录
- 批量删除
- 数据导出/备份
- 图片放大预览
- 空状态引导
- 深色模式自动切换（跟随系统）

### 1.3 UI 风格参考

- 小红书瀑布流风格
- 绿色主色调（植物主题）
- 圆角卡片设计

---

## 二、技术栈

### 2.1 核心技术

| 组件 | 技术选型 | 版本 | 说明 |
|------|---------|------|------|
| 框架 | Expo | SDK 55 | 官方推荐开发方式 |
| 语言 | TypeScript | ^5.0 | 类型安全 |
| 数据库 | expo-sqlite | ^15.x | SQLite 本地存储 |
| 文件系统 | expo-file-system | ^18.x | 图片文件管理 |
| 图片选择 | expo-image-picker | ^17.x | 替代 YImagePicker |
| 相机 | expo-camera | ^16.x | 拍照功能 |
| 导航 | @react-navigation/native | ^7.x | 页面导航 |
| 状态管理 | Zustand | ^5.x | 轻量级状态管理 |
| 瀑布流 | @react-native-seoul/masonry-list | ^1.x | 瀑布流列表 |
| 日期选择 | @react-native-community/datetimepicker | ^8.x | 日期选择器 |

### 2.2 项目结构

```
PlantRecorder/
├── app/                          # Expo Router 页面目录
│   ├── (tabs)/                   # Tab 导航组
│   │   ├── _layout.tsx           # Tab 布局
│   │   ├── index.tsx             # 首页（分组列表）
│   │   └── _layout.tsx           # Tab 内容布局
│   ├── group/
│   │   ├── [id].tsx              # 分组详情页
│   │   └── create.tsx            # 新建分组页
│   ├── individual/
│   │   ├── [id].tsx              # 个体详情页
│   │   └── create.tsx            # 新建个体页
│   ├── record/
│   │   └── create.tsx            # 新建记录页
│   └── _layout.tsx               # 根布局
├── src/
│   ├── components/               # 通用组件
│   │   ├── Card.tsx             # 瀑布流卡片
│   │   ├── ConfirmDialog.tsx    # 确认对话框
│   │   ├── EmptyState.tsx       # 空状态组件
│   │   ├── FAB.tsx               # 悬浮按钮
│   │   ├── Header.tsx            # 页面头部
│   │   ├── ImagePicker.tsx      # 图片选择器
│   │   ├── LoadingOverlay.tsx   # 加载遮罩
│   │   └── SearchBar.tsx         # 搜索栏
│   ├── database/                 # 数据库层
│   │   ├── index.ts             # 数据库初始化
│   │   ├── migrations.ts        # 数据迁移
│   │   └── repositories/        # 数据仓库
│   │       ├── GroupRepository.ts
│   │       ├── IndividualRepository.ts
│   │       └── RecordRepository.ts
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── useDatabase.ts       # 数据库初始化 hook
│   │   ├── useGroups.ts         # 分组列表 hook
│   │   ├── useIndividuals.ts    # 个体列表 hook
│   │   ├── useRecords.ts        # 记录列表 hook
│   │   └── useSearch.ts         # 搜索 hook
│   ├── services/                 # 业务服务
│   │   ├── ImageService.ts      # 图片管理服务
│   │   └── FileService.ts       # 文件操作服务
│   ├── stores/                   # Zustand 状态库
│   │   ├── appStore.ts          # 全局状态
│   │   └── uiStore.ts           # UI 状态
│   ├── theme/                    # 主题配置
│   │   ├── colors.ts            # 颜色规范
│   │   ├── typography.ts        # 字体规范
│   │   └── spacing.ts           # 间距规范
│   ├── types/                    # TypeScript 类型
│   │   └── index.ts             # 全局类型定义
│   └── utils/                    # 工具函数
│       ├── date.ts              # 日期格式化
│       └── generateId.ts        # ID 生成
├── assets/                       # 静态资源
│   └── images/                  # 图片资源
├── App.tsx                       # 应用入口
├── app.json                      # Expo 配置
├── package.json
└── tsconfig.json
```

---

## 三、数据库设计

### 3.1 ER 图

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   `groups`  │       │`individuals`│       │  `records`  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │──┐    │ id          │──┐    │ id          │
│ coverImage  │  │    │ groupId     │←─┘    │ individualId│←─┘
│ title       │  │    │ coverImage  │       │ imagePath   │
│ description │  │    │ title       │       │ title       │
│ viewCount   │  │    │ description │       │ description │
│ createdAt   │  │    │ createdAt   │       │ recordDate  │
│ updatedAt   │  │    │ updatedAt   │       │ createdAt   │
└─────────────┘  │    └─────────────┘       └─────────────┘
                 │           │
                 └───────────┘
              (1 对 N 关系)
```

### 3.2 表结构

#### groups 表（分组）

```sql
CREATE TABLE IF NOT EXISTS `groups` (
  `id`            INTEGER PRIMARY KEY AUTOINCREMENT,
  `coverImagePath` TEXT NOT NULL,
  `title`         TEXT NOT NULL,
  `description`   TEXT DEFAULT '',
  `viewCount`     INTEGER DEFAULT 0,
  `createdAt`     INTEGER NOT NULL,
  `updatedAt`     INTEGER NOT NULL
);

CREATE INDEX idx_groups_createdAt ON `groups`(`createdAt`);
CREATE INDEX idx_groups_viewCount ON `groups`(`viewCount`);
CREATE INDEX idx_groups_title ON `groups`(`title`);
```

#### individuals 表（个体）

```sql
CREATE TABLE IF NOT EXISTS `individuals` (
  `id`            INTEGER PRIMARY KEY AUTOINCREMENT,
  `groupId`       INTEGER NOT NULL,
  `coverImagePath` TEXT NOT NULL,
  `title`         TEXT NOT NULL,
  `description`   TEXT DEFAULT '',
  `createdAt`     INTEGER NOT NULL,
  `updatedAt`     INTEGER NOT NULL,
  FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE CASCADE
);

CREATE INDEX idx_individuals_groupId ON `individuals`(`groupId`);
CREATE INDEX idx_individuals_createdAt ON `individuals`(`createdAt`);
CREATE INDEX idx_individuals_title ON `individuals`(`title`);
```

#### records 表（记录）

```sql
CREATE TABLE IF NOT EXISTS `records` (
  `id`            INTEGER PRIMARY KEY AUTOINCREMENT,
  `individualId`  INTEGER NOT NULL,
  `imagePath`     TEXT NOT NULL,
  `title`         TEXT NOT NULL,
  `description`   TEXT DEFAULT '',
  `recordDate`    INTEGER NOT NULL,
  `createdAt`     INTEGER NOT NULL,
  FOREIGN KEY (`individualId`) REFERENCES `individuals`(`id`) ON DELETE CASCADE
);

CREATE INDEX idx_records_individualId ON `records`(`individualId`);
CREATE INDEX idx_records_recordDate ON `records`(`recordDate`);
```

### 3.3 字段说明

| 表名 | 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|------|
| groups | id | INTEGER | PK, AI | 分组唯一标识 |
| groups | coverImagePath | TEXT | NOT NULL | 封面图片绝对路径 |
| groups | title | TEXT | NOT NULL | 分组标题 |
| groups | description | TEXT | DEFAULT '' | 分组描述 |
| groups | viewCount | INTEGER | DEFAULT 0 | 浏览次数 |
| groups | createdAt | INTEGER | NOT NULL | 创建时间戳（毫秒） |
| groups | updatedAt | INTEGER | NOT NULL | 更新时间戳（毫秒） |
| individuals | id | INTEGER | PK, AI | 个体唯一标识 |
| individuals | groupId | INTEGER | FK, NOT NULL | 所属分组 ID |
| individuals | coverImagePath | TEXT | NOT NULL | 封面图片绝对路径 |
| individuals | title | TEXT | NOT NULL | 个体标题 |
| individuals | description | TEXT | DEFAULT '' | 个体描述 |
| individuals | createdAt | INTEGER | NOT NULL | 创建时间戳 |
| individuals | updatedAt | INTEGER | NOT NULL | 更新时间戳 |
| records | id | INTEGER | PK, AI | 记录唯一标识 |
| records | individualId | INTEGER | FK, NOT NULL | 所属个体 ID |
| records | imagePath | TEXT | NOT NULL | 图片绝对路径 |
| records | title | TEXT | NOT NULL | 记录标题 |
| records | description | TEXT | DEFAULT '' | 记录描述 |
| records | recordDate | INTEGER | NOT NULL | 记录日期（毫秒） |
| records | createdAt | INTEGER | NOT NULL | 创建时间戳 |

---

## 四、文件存储结构

### 4.1 目录结构

```
[SD卡或应用私有目录]/
└── plant_data/
    ├── groups/
    │   └── {groupId}/
    │       ├── cover.jpg                    # 分组封面
    │       └── individuals/
    │           └── {individualId}/
    │               ├── cover.jpg            # 个体封面
    │               └── records/
    │                   └── {recordId}.jpg   # 记录图片
    └── temp/                                # 临时文件（可清空）
```

### 4.2 文件命名规范

| 类型 | 命名格式 | 示例 |
|------|---------|------|
| 分组封面 | `cover_{timestamp}.jpg` | `cover_1712390400000.jpg` |
| 个体封面 | `cover_{timestamp}.jpg` | `cover_1712390400000.jpg` |
| 记录图片 | `{recordId}_{timestamp}.jpg` | `1_1712390500000.jpg` |

### 4.3 路径管理

```typescript
// src/services/FileService.ts
const PLANT_DATA_DIR = `${FileSystem.documentDirectory}plant_data`;
const GROUPS_DIR = `${PLANT_DATA_DIR}/groups`;

function getGroupDir(groupId: number): string {
  return `${GROUPS_DIR}/${groupId}`;
}

function getIndividualDir(groupId: number, individualId: number): string {
  return `${GROUPS_DIR}/${groupId}/individuals/${individualId}`;
}

function getRecordDir(groupId: number, individualId: number): string {
  return `${getIndividualDir(groupId, individualId)}/records`;
}
```

---

## 五、页面架构

### 5.1 页面列表

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页（全部） | `/` | 分组瀑布流 + 搜索 + 排序 |
| 分组页 | `/categories` | 三列分组列表 |
| 分组详情 | `/group/[id]` | 个体列表 + 分组信息 + 编辑 |
| 个体详情 | `/individual/[id]` | 记录列表 + 个体信息 |
| 新建分组 | `/group/create` | 创建分组表单 |
| 新建个体 | `/individual/create?groupId={id}` | 创建个体表单 |
| 新建记录 | `/record/create?individualId={id}` | 创建记录表单 |
| 编辑分组 | `/group/[id]/edit` | 编辑分组表单 |
| 个人中心 | `/profile` | 统计信息 |

### 5.2 页面流程图

```
┌─────────┐     ┌─────────┐
│  全部   │────→│  分组   │
└────┬────┘     └────┬────┘
     │               │
     │ 点击卡片       │ 点击卡片
     ▼               ▼
┌─────────────┐  ┌─────────────┐
│  分组详情    │  │  分组详情    │
└────┬────────┘  └────┬────────┘
     │                 │
     │ 点击个体         │ 点击个体
     ▼                 ▼
┌─────────────┐  ┌─────────────┐
│  个体详情    │  │  个体详情    │
└────┬────────┘  └────┬────────┘
     │                 │
     │ 点击 FAB        │ 点击 FAB
     ▼                 ▼
┌─────────────┐  ┌─────────────┐
│  新建记录    │  │  新建记录    │
└─────────────┘  └─────────────┘

┌─────────────┐     ┌─────────────┐
│  新建分组    │────→│  全部       │
└─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐
│  新建个体    │────→│  分组详情   │
└─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐
│  编辑分组    │────→│  分组详情   │
└─────────────┘     └─────────────┘
```

### 5.3 导航结构

```
Root Navigator (Stack)
├── MainTabs (Bottom Tab Navigator)
│   ├── Home (全部 - 首页)
│   ├── Categories (分组)
│   ├── Community (社区 - 预留)
│   └── Profile (我 - 个人中心)
├── GroupDetail (分组详情)
├── IndividualDetail (个体详情)
├── GroupEdit (编辑分组)
├── CreateGroup (新建分组)
├── CreateIndividual (新建个体)
└── CreateRecord (新建记录)
```

**底部导航栏布局：**
```
┌─────────────────────────────────┐
│ 全部   分组    ＋    社区   我   │
└─────────────────────────────────┘
```
- 全部/分组/社区/我：纯文字按钮，无图标
- ＋：红色圆形按钮，居中突出
- 消息提示：社区按钮右侧红点

---

## 六、UI 组件规范

### 6.1 颜色规范

```typescript
// src/theme/colors.ts

// 浅色模式颜色
export const lightColors = {
  primary: '#FF4040',        // 红色 - 主色调（按钮、FAB、强调）
  primaryDark: '#E03030',    // 深红色 - 按压状态
  primaryLight: '#FFE5E5',   // 浅红色 - 背景

  accent: '#4CAF50',         // 绿色 - 植物主题辅助色

  danger: '#FF4040',         // 红色 - 删除、错误
  dangerDark: '#E03030',     // 深红色

  background: '#F5F5F5',     // 页面背景
  surface: '#FFFFFF',       // 卡片背景
  border: '#F0F0F0',        // 边框

  textPrimary: '#333333',    // 主文字
  textSecondary: '#666666', // 次要文字
  textDisabled: '#999999',   // 辅助文字
  textInverse: '#FFFFFF',    // 反色文字

  tabActive: '#FF4040',      // Tab 选中下划线
  tabInactive: '#999999',    // Tab 未选中

  success: '#4CAF50',
  warning: '#FF9800',
  error: '#FF4040',
};

// 深色模式颜色
export const darkColors = {
  primary: '#FF6B6B',        // 浅红色 - 深色模式下更亮的红
  primaryDark: '#FF4040',    // 主红色
  primaryLight: '#CC3030',   // 深红色 - 背景

  accent: '#66BB6A',         // 浅绿色 - 植物主题

  danger: '#EF5350',         // 浅红色
  dangerDark: '#FF4040',     // 主红色

  background: '#121212',     // 深色背景
  surface: '#1E1E1E',       // 卡片背景
  border: '#333333',        // 边框

  textPrimary: '#FFFFFF',    // 主文字
  textSecondary: '#B0B0B0',  // 次要文字
  textDisabled: '#666666',   // 辅助文字
  textInverse: '#333333',    // 反色文字

  tabActive: '#FF6B6B',      // Tab 选中下划线
  tabInactive: '#666666',    // Tab 未选中

  success: '#66BB6A',
  warning: '#FFB74D',
  error: '#EF5350',
};

  tabActive: '#EF5350',      // Tab 选中下划线
  tabInactive: '#666666',    // Tab 未选中

  success: '#66BB6A',
  warning: '#FFB74D',
  error: '#EF5350',
};

// 主题上下文
export const colors = {
  light: lightColors,
  dark: darkColors,
};
```

**主题切换方案：**
- 使用 React Context 管理主题状态
- 系统级自动切换：`useColorScheme()` Hook
- 手动切换：支持用户手动选择主题
- 持久化：`AsyncStorage` 存储用户偏好

### 6.2 字体规范

```typescript
// src/theme/typography.ts
export const typography = {
  // 字号
  fontSize: {
    xs: 12,
    sm: 13,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    xxl: 20,
  },

  // 字重
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};
```

### 6.3 间距规范

```typescript
// src/theme/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const layout = {
  pagePadding: 16,
  cardGap: 12,
  cardRadius: 8,
  imageAspectRatio: 1, // 1:1 正方形
  tabUnderlineWidth: 28,
  tabUnderlineHeight: 3,
  bottomNavHeight: 60,
  fabSize: 50,
  fabRadius: 25,
  headerHeight: 56,
  avatarSize: 100,
};
```

### 6.4 组件清单

| 组件名 | 说明 | 依赖 |
|--------|------|------|
| Card | 瀑布流卡片 | Image, Text |
| FAB | 悬浮按钮 | TouchableOpacity |
| Header | 页面头部 | 返回按钮、标题、删除按钮 |
| SearchBar | 搜索栏 | TextInput |
| ImagePicker | 图片选择器 | 相机/相册选择弹窗 |
| ConfirmDialog | 确认对话框 | Modal |
| EmptyState | 空状态 | Image, Text |
| LoadingOverlay | 加载遮罩 | ActivityIndicator |
| BottomSheet | 底部弹窗 | Modal, Animated |
| DatePicker | 日期选择器 | DateTimePicker |
| TabBar | Tab 切换栏 | TouchableOpacity |
| GroupCard | 分组卡片 | Card |
| IndividualCard | 个体卡片 | Card |
| RecordItem | 记录项 | Image, Text |
| Badge | 标签 | View, Text |
| Avatar | 封面头像 | Image |

---

## 七、核心功能详细设计

### 7.1 首页（全部）

**功能描述：**
展示所有分组，支持搜索、排序、创建新分组。

**布局：**
```
┌─────────────────────────────────┐
│ ♡  [默认] [最热] [最新]    🔍  │  ← 顶部栏
├─────────────────────────────────┤
│ ┌────────┐  ┌────────┐        │
│ │        │  │        │        │  ← 双列瀑布流
│ │  封面  │  │  封面  │        │
│ │────────│  │────────│        │
│ │  标题  │  │  标题  │        │
│ │  描述  │  │  描述  │        │
│ │ 作者 ♡ │  │ 作者 ♡ │        │
│ └────────┘  └────────┘        │
│ ...                             │
│                          ┌───┐ │
│                          │ + │ │  ← 红色加号
├─────────────────────────────────┤
│ 全部  分组  ＋  社区  我         │  ← 底部导航
└─────────────────────────────────┘
```

**顶部栏说明：**
| 位置 | 内容 | 说明 |
|------|------|------|
| 左 | 收藏图标 | 心形图标 |
| 中 | Tab栏 | 默认 / 最热 / 最新（红色下划线指示选中） |
| 右 | 搜索按钮 | 放大镜图标 |

**瀑布流卡片：**
- 自适应图片比例（正方形/横向矩形）
- 标题（单行省略）
- 描述（2行省略）
- 作者名 + 浏览数（右下角）

**底部导航栏：**
| 按钮 | 说明 |
|------|------|
| 全部 | 首页，当前页 |
| 分组 | 进入分组页面 |
| ＋ | 红色圆形按钮，弹出新建选项 |
| 社区 | 功能待开发（显示红点提示） |
| 我 | 个人中心页面 |

**Tab 排序逻辑：**
| Tab | SQL ORDER BY |
|-----|--------------|
| 默认 | `RANDOM()` |
| 最热 | `viewCount DESC` |
| 最新 | `createdAt DESC` |

**搜索逻辑：**
```sql
-- 搜索分组标题 + 个体标题 + 描述
SELECT DISTINCT g.* FROM `groups` g
LEFT JOIN `individuals` i ON i.groupId = g.id
WHERE g.title LIKE '%keyword%'
   OR g.description LIKE '%keyword%'
   OR i.title LIKE '%keyword%'
ORDER BY g.createdAt DESC;
```

**浏览量更新：**
- 进入分组详情页时执行：`UPDATE groups SET viewCount = viewCount + 1 WHERE id = ?`

**编辑模式：**
- 双击或长按卡片 → 进入编辑模式
- 编辑模式下所有卡片右上角显示编辑按钮
- 点击编辑按钮 → 进入编辑分组页面

### 7.2 分组页（分类）

**功能描述：**
以三列网格展示所有分组，分组卡片带有彩色顶边标识。

**布局：**
```
┌─────────────────────────────────┐
│ ♡  [默认] [最热] [最新]    🔍  │  ← 顶部栏（与首页一致）
├─────────────────────────────────┤
│ ┌──────┐┌──────┐┌──────┐      │
│ │▔▔▔▔▔││▔▔▔▔▔││▔▔▔▔▔│      │  ← 彩色顶边（绿/橙/蓝）
│ │ 封面 ││ 封面 ││ 封面 │      │
│ │ 标题 ││ 标题 ││ 标题 │      │  ← 三列布局
│ │ 数量 ││ 数量 ││ 数量 │      │
│ └──────┘└──────┘└──────┘      │
│ ...                             │
├─────────────────────────────────┤
│ 全部  分组  ＋  社区  我         │  ← 底部导航
└─────────────────────────────────┘
```

**分组卡片：**
- 图片比例：1:1.2（竖向矩形）
- 顶部彩色条带：3色循环（绿色/橙色/蓝色）
- 卡片内容：封面图 + 分组名 + 个体数量

**点击分组卡片 → 进入分组详情页**

### 7.3 分组详情页

**功能描述：**
展示分组信息及下属所有个体，支持编辑分组、创建新个体。

**布局：**
```
┌─────────────────────────────────┐
│ ←      分组标题           ✏️   │  ← Header（编辑按钮）
├─────────────────────────────────┤
│ ┌──────┐  分组标题            │
│ │ 封面  │  收录 N 个个体...   │
│ │ 80x80│  N 个体 · M 次浏览  │
│ └──────┘                       │
├─────────────────────────────────┤
│ 个体列表                        │
│ ┌────────┐  ┌────────┐        │
│ │  封面  │  │  封面  │        │
│ │────────│  │────────│        │
│ │  标题  │  │  标题  │        │  ← 双列瀑布流
│ │  记录数│  │  记录数│        │
│ └────────┘  └────────┘        │
│ ...                        ┌───┐│
│                          │ + │ │  ← 红色加号
├─────────────────────────────────┤
│ 全部  分组  ＋  社区  我         │
└─────────────────────────────────┘
```

**分组信息卡片：**
- 左侧：80x80 封面图，圆角
- 右侧：分组标题 + 描述 + 统计信息

**个体列表：**
- 与首页一致的瀑布流样式（双列自适应）
- 卡片内容：封面图 + 标题 + 记录数

**编辑按钮：**
- 点击 → 进入编辑分组页面（修改封面、标题、描述、删除分组）

**删除确认：**
- 弹窗提示："确定要删除该分组吗？分组下的所有个体和记录也会被删除。"
- 确认后执行：删除分组（级联删除个体、记录、图片）

### 7.4 个体详情页

**功能描述：**
展示个体信息及下属所有记录，记录以时间线形式展示。

**布局：**
```
┌─────────────────────────────────┐
│ ←      个体标题         ✏️ ⋮  │  ← Header（编辑、更多）
├─────────────────────────────────┤
│ ┌────────┐  个体标题            │
│ │        │  个体描述...        │
│ │ 封面   │  N 条记录 · M 次浏览│
│ └────────┘                      │
├─────────────────────────────────┤
│                                  │
│ 03月31日│ ● 新叶子              │
│         │   又长了一片新叶子    │
│         │   [图片][图片]        │
│         │                       │
│ 03月25日│ ● 换水               │
│         │   给绿萝换了水        │
│         │   [图片]              │
│         │                       │
│ 03月20日│ ● 发现新芽            │
│         │   根部冒出小芽        │
│         │   [图片][图片][图片]  │
│                          ┌───┐ │
├─────────────────────────────────┤
│ 全部  分组  ＋  社区  我         │
└─────────────────────────────────┘
```

**时间线布局规格：**
| 元素 | 样式 |
|------|------|
| 垂直线 | 1px，灰色 (#e0e0e0)，位于日期和节点之间 |
| 节点 | 8px 圆点，灰色，首个记录为红色 (#FF4040) |
| 日期 | 11px，灰色 (#999)，宽度 45px，右对齐 |
| 节点左侧距 | 51px（垂直线位置） |
| 内容左侧距 | 70px（节点右侧） |
| 标题 | 14px，加粗，深灰 (#333) |
| 描述 | 12px，灰色 (#999) |
| 图片 | 80x80，正方形，4px 间距，最多 3 列 |

**个体信息卡片：**
- 左侧：80x80 封面图，圆角
- 右侧：标题 + 描述 + 统计信息

**记录列表查询：**
```sql
SELECT * FROM records
WHERE individualId = ?
ORDER BY recordDate DESC;
```

**编辑功能：**
- 点击右上角编辑按钮 → 进入编辑页面
- 可修改：封面图片、标题、描述
- 底部有删除按钮

**添加记录：**
- 点击底部加号按钮 → 弹出添加记录选项

### 7.5 新建分组页

**布局：**
```
┌─────────────────────────────────┐
│  ←        新建分组              │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │      📷 点击选择图片     │   │
│  └─────────────────────────┘   │
│  标题 *                         │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  └─────────────────────────┘   │
│  描述                           │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │         保存              │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

**表单验证：**
- 图片：必填
- 标题：必填，最大50字符
- 描述：选填，最大500字符

**提交逻辑：**
1. 复制图片到 `plant_data/groups/{groupId}/cover_{timestamp}.jpg`
2. 插入数据库记录
3. 返回首页并刷新

### 7.6 新建个体页

**额外字段：**
- 所属分组（必选，从路由参数或选择器获取）

**布局：**
```
┌─────────────────────────────────┐
│  ←        新建个体              │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │      📷 点击选择图片     │   │
│  └─────────────────────────┘   │
│  所属分组 *                     │
│  [分组1] [分组2] [分组3] →     │  ← 横向滚动标签
│  标题 *                         │
│  ...                            │
└─────────────────────────────────┘
```

### 7.7 新建记录页

**布局：**
```
┌─────────────────────────────────┐
│  ←        新建记录              │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │      📷 点击选择图片     │   │
│  └─────────────────────────┘   │
│  记录日期 *                     │
│  ┌─────────────────────────┐   │
│  │ 2024年1月15日        📅 │   │
│  └─────────────────────────┘   │
│  标题 *                         │
│  ...                            │
└─────────────────────────────────┘
```

---

## 七、交互规范与异常处理

### 7.1 加载状态

#### 全局加载状态
```typescript
// 场景：页面初始加载、数据提交时
interface LoadingState {
  isGlobalLoading: boolean;  // 全局遮罩
  isContentLoading: boolean; // 内容区局部加载
  loadingMessage: string;    // 加载提示文字
}
```

| 场景 | 展示形式 | 提示文字 |
|------|---------|---------|
| 首页首次加载 | 全局遮罩 + 骨架屏 | "加载中..." |
| 下拉刷新 | 内容区顶部旋转指示器 | - |
| 搜索中 | 内容区局部加载 | "搜索中..." |
| 表单提交 | 全局遮罩 + 禁用按钮 | "保存中..." |
| 删除操作 | 全局遮罩 | "删除中..." |
| 图片保存 | 全局遮罩 + 进度 | "保存图片..." |

#### 骨架屏规范
```typescript
// 首页骨架屏：瀑布流卡片占位
const HomeSkeleton = () => (
  <View style={styles.masonryList}>
    {[1, 2, 3, 4].map((i) => (
      <View key={i} style={styles.skeletonCard}>
        <View style={styles.skeletonImage} />
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonDesc} />
      </View>
    ))}
  </View>
);
```

### 7.2 错误处理

#### 错误类型定义
```typescript
// src/types/errors.ts
enum ErrorCode {
  // 数据库错误
  DB_INIT_FAILED = 'DB_001',
  DB_QUERY_FAILED = 'DB_002',
  DB_INSERT_FAILED = 'DB_003',
  DB_UPDATE_FAILED = 'DB_004',
  DB_DELETE_FAILED = 'DB_005',

  // 文件系统错误
  FILE_COPY_FAILED = 'FILE_001',
  FILE_DELETE_FAILED = 'FILE_002',
  FILE_NOT_FOUND = 'FILE_003',
  FILE_PERMISSION_DENIED = 'FILE_004',

  // 图片错误
  IMAGE_PICK_CANCELLED = 'IMG_001',
  IMAGE_PICK_FAILED = 'IMG_002',
  IMAGE_TOO_LARGE = 'IMG_003',
  CAMERA_PERMISSION_DENIED = 'IMG_004',

  // 业务错误
  VALIDATION_FAILED = 'BIZ_001',
  NOT_FOUND = 'BIZ_002',
  DUPLICATE_ENTRY = 'BIZ_003',
}

interface AppError {
  code: ErrorCode;
  message: string;
  details?: any;
  timestamp: number;
}
```

#### 错误处理策略

| 错误场景 | 处理方式 | 用户反馈 |
|---------|---------|---------|
| 数据库初始化失败 | 重试 3 次，仍失败显示错误页 | "数据库初始化失败，请重启应用" |
| 图片选择失败 | 提示用户重试 | "图片选择失败，请重试" |
| 相机权限被拒绝 | 引导去设置页面开启 | "相机权限被拒绝，请在设置中开启" |
| 相册权限被拒绝 | 引导去设置页面开启 | "相册权限被拒绝，请在设置中开启" |
| 图片保存失败 | 回滚数据库操作，提示用户 | "图片保存失败，请检查存储空间" |
| 删除失败 | 提示用户重试 | "删除失败，请重试" |
| 存储空间不足 | 阻止保存操作 | "存储空间不足，请清理后重试" |

#### 全局错误边界
```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
    // 可上报至错误监控服务
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text>出错了</Text>
          <Text>{this.state.error?.message}</Text>
          <Button title="重试" onPress={() => this.setState({ hasError: false })} />
        </View>
      );
    }
    return this.props.children;
  }
}
```

### 7.3 Toast 提示规范

#### Toast 类型与显示规则
```typescript
interface ToastConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number;  // 毫秒
  position: 'top' | 'center' | 'bottom';
  action?: { label: string; onPress: () => void };
}
```

| 操作 | Toast 类型 | 提示文字 | 显示时长 |
|------|----------|---------|---------|
| 保存成功 | success | "保存成功" | 2000ms |
| 删除成功 | success | "删除成功" | 2000ms |
| 保存失败 | error | "保存失败，请重试" | 3000ms |
| 删除失败 | error | "删除失败，请重试" | 3000ms |
| 图片选择取消 | - | 不显示 | - |
| 表单验证失败 | warning | 具体字段错误 | 2000ms |
| 存储空间不足 | error | "存储空间不足" | 4000ms |

#### Toast 位置规则
| 场景 | 位置 | 原因 |
|------|------|------|
| 首页/列表页 | bottom | 不遮挡主要内容 |
| 表单页 | top | 需要用户立即看到反馈 |
| 模态框内 | center | 在模态框内显示 |

### 7.4 空状态规范

#### 空状态类型
```typescript
enum EmptyStateType {
  NO_GROUPS = 'NO_GROUPS',      // 无分组
  NO_INDIVIDUALS = 'NO_INDIVIDUALS',  // 无个体
  NO_RECORDS = 'NO_RECORDS',    // 无记录
  NO_SEARCH_RESULTS = 'NO_SEARCH_RESULTS',  // 搜索无结果
  LOAD_FAILED = 'LOAD_FAILED',  // 加载失败
}
```

#### 空状态组件
```typescript
// src/components/EmptyState.tsx
const emptyStateConfig: Record<EmptyStateType, EmptyStateProps> = {
  [EmptyStateType.NO_GROUPS]: {
    image: require('@/assets/empty_groups.png'),
    title: '还没有分组',
    description: '点击右下角 + 按钮创建第一个分组',
    actionLabel: '新建分组',
  },
  [EmptyStateType.NO_INDIVIDUALS]: {
    image: require('@/assets/empty_individuals.png'),
    title: '还没有个体',
    description: '点击右下角 + 按钮添加第一个个体',
    actionLabel: '新建个体',
  },
  [EmptyStateType.NO_RECORDS]: {
    image: require('@/assets/empty_records.png'),
    title: '还没有记录',
    description: '点击右下角 + 按钮添加第一条记录',
    actionLabel: '新建记录',
  },
  [EmptyStateType.NO_SEARCH_RESULTS]: {
    image: require('@/assets/empty_search.png'),
    title: '未找到结果',
    description: '尝试更换关键词搜索',
    actionLabel: null,
  },
  [EmptyStateType.LOAD_FAILED]: {
    image: require('@/assets/load_failed.png'),
    title: '加载失败',
    description: '请检查存储权限后重试',
    actionLabel: '重新加载',
  },
};
```

### 7.5 动画规范

#### 页面转场动画
```typescript
// src/navigation/animations.ts
const screenOptions = {
  cardStyleInterpolator: ({ current }) => ({
    cardStyle: {
      opacity: current.progress,
    },
  }),
  transitionSpec: {
    open: { animation: 'timing', config: { duration: 250 } },
    close: { animation: 'timing', config: { duration: 200 } },
  },
};
```

| 页面跳转 | 动画类型 | 时长 |
|---------|---------|------|
| Stack 页面切换 | 横向滑动 | 250ms |
| Tab 切换 | 无动画 | - |
| Modal 弹出 | 底部滑入 | 300ms |
| Modal 关闭 | 底部滑出 | 250ms |

#### 组件动画
```typescript
// FAB 展开动画
const fabAnimation = {
  duration: 200,
  useNativeDriver: true,
};

// 卡片点击反馈
const cardPressAnimation = {
  duration: 100,
  scale: 0.98,
};

// 删除确认弹窗
const deleteDialogAnimation = {
  enter: { type: 'timing', duration: 200 },
  exit: { type: 'timing', duration: 150 },
};
```

#### 骨架屏动画
```typescript
// 骨架屏闪烁动画
const skeletonAnimation = {
  duration: 1000,
  iterations: 'loop',
  easing: 'ease-in-out',
};
// 效果：骨架屏占位区域从 #E0E0E0 到 #F5F5F5 渐变闪烁
```

### 7.6 边界情况处理

| 场景 | 处理方式 |
|------|---------|
| 首页无分组 | 显示空状态 + 引导创建 |
| 分组无个体 | 显示空状态 + 引导添加 |
| 个体无记录 | 显示空状态 + 引导添加 |
| 搜索无结果 | 显示空状态 + 关键词提示 |
| 图片加载失败 | 显示占位图 + 重试按钮 |
| 图片被删除（文件不存在） | 显示占位图 + 提示图片已失效 |
| 记录日期为未来 | 允许创建，记录日期可大于当前日期 |
| 标题/描述超长 | 前端限制输入字符数，后端做截断 |
| 快速连续点击保存 | 防抖处理：500ms 内只响应一次 |
| 应用被杀死（保存中） | 下次启动检测并清理未完成的任务 |
| 数据库损坏 | 检测并尝试修复，失败则重建数据库 |

### 7.7 表单验证规范

#### 验证规则
```typescript
// src/utils/validation.ts
const validationRules = {
  title: {
    required: true,
    minLength: 1,
    maxLength: 50,
    trim: true,
    message: '标题不能为空，最多50个字符',
  },
  description: {
    required: false,
    maxLength: 500,
    trim: true,
    message: '描述最多500个字符',
  },
  groupId: {
    required: true,
    message: '请选择所属分组',
  },
  image: {
    required: true,
    message: '请选择一张图片',
  },
  recordDate: {
    required: true,
    message: '请选择记录日期',
  },
};
```

#### 实时验证 vs 提交验证
| 字段 | 验证时机 | 反馈形式 |
|------|---------|---------|
| 标题 | 实时验证（onChange） | 输入框下方红色提示 |
| 描述 | 提交时验证 | Toast 提示 |
| 图片 | 提交时验证 | Toast 提示 |
| 分组选择 | 实时验证 | 选项下方红色提示 |

### 7.8 权限请求规范

#### 权限列表
```typescript
const permissions = [
  { name: 'camera', reason: '拍摄植物照片' },
  { name: 'photoLibrary', reason: '从相册选择照片' },
];
```

#### 权限请求流程
```
用户点击拍照/相册
       │
       ▼
  权限已授权？ ──否──→ 请求权限
       │是                    │
       ▼                      ▼
  执行操作              权限被拒绝？
       │                是         否
       │                  ▼         ▼
       │            显示引导弹窗   执行操作
       │            引导去设置
       ▼
  成功/失败处理
```

#### 权限引导弹窗
```
┌─────────────────────────────────┐
│         需要权限                │
│                                 │
│  植物记录相机需要访问您的相机/    │
│  相册来拍摄或选择植物照片。      │
│                                 │
│  ┌─────────────────────────┐   │
│  │       去设置            │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │       取消              │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

---

## 八、状态管理

### 8.1 Zustand Store 设计

```typescript
// src/stores/appStore.ts
interface AppState {
  // 数据
  groups: Group[];
  currentGroup: Group | null;
  individuals: Individual[];
  currentIndividual: Individual | null;
  records: Record[];
  searchResults: Group[];
  isSearching: boolean;

  // 排序
  sortBy: 'default' | 'hot' | 'latest';

  // Actions
  loadGroups: () => Promise<void>;
  searchGroups: (keyword: string) => Promise<void>;
  setSortBy: (sort: SortType) => void;
  incrementViewCount: (groupId: number) => Promise<void>;
  deleteGroup: (groupId: number) => Promise<void>;
  // ... 其他 action
}

// src/stores/uiStore.ts
interface UIState {
  isLoading: boolean;
  fabExpanded: boolean;
  deleteConfirmVisible: boolean;
  deleteTarget: { type: 'group' | 'individual' | 'record'; id: number } | null;

  showLoading: () => void;
  hideLoading: () => void;
  toggleFab: () => void;
  showDeleteConfirm: (target: DeleteTarget) => void;
  hideDeleteConfirm: () => void;
}
```

### 8.2 Repository 模式

```typescript
// src/database/repositories/GroupRepository.ts
class GroupRepository {
  async findAll(sortBy: SortType = 'default'): Promise<Group[]> {
    const orderBy = {
      default: 'RANDOM()',
      hot: 'viewCount DESC',
      latest: 'createdAt DESC',
    }[sortBy];

    return this.db.executeSql(
      `SELECT * FROM \`groups\` ORDER BY ${orderBy}`
    ).then(([results]) => this.rowsToArray(results));
  }

  async search(keyword: string): Promise<Group[]> {
    return this.db.executeSql(`
      SELECT DISTINCT g.* FROM \`groups\` g
      LEFT JOIN \`individuals\` i ON i.groupId = g.id
      WHERE g.title LIKE ? OR g.description LIKE ? OR i.title LIKE ?
    `, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);
  }

  async create(data: CreateGroupDto): Promise<Group> { /* ... */ }
  async update(id: number, data: UpdateGroupDto): Promise<void> { /* ... */ }
  async delete(id: number): Promise<void> { /* ... */ }
  async incrementViewCount(id: number): Promise<void> { /* ... */ }
}
```

---

## 九、图片服务

### 9.1 ImageService

```typescript
// src/services/ImageService.ts
class ImageService {
  // 选择图片（相机或相册）
  async pickImage(): Promise<string | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  }

  // 拍照
  async takePhoto(): Promise<string | null> {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') return null;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  }

  // 复制图片到应用目录
  async saveImage(sourceUri: string, destPath: string): Promise<string> {
    await FileSystem.makeDirectoryAsync(
      path.dirname(destPath),
      { intermediates: true }
    );
    await FileSystem.copyAsync({ from: sourceUri, to: destPath });
    return destPath;
  }

  // 删除图片
  async deleteImage(imagePath: string): Promise<void> {
    const exists = await FileSystem.getInfoAsync(imagePath);
    if (exists.exists) {
      await FileSystem.deleteAsync(imagePath);
    }
  }

  // 级联删除分组所有图片
  async deleteGroupImages(groupId: number): Promise<void> {
    const groupDir = `${GROUPS_DIR}/${groupId}`;
    const exists = await FileSystem.getInfoAsync(groupDir);
    if (exists.exists) {
      await FileSystem.deleteAsync(groupDir);
    }
  }
}
```

---

## 十、级联删除流程

### 10.1 删除分组

```typescript
async function deleteGroup(groupId: number) {
  // 1. 删除数据库记录（级联删除个体和记录）
  await groupRepository.delete(groupId);

  // 2. 删除所有相关图片
  await imageService.deleteGroupImages(groupId);
}
```

### 10.2 删除个体

```typescript
async function deleteIndividual(individualId: number) {
  // 1. 获取 groupId（用于删除图片）
  const individual = await individualRepository.findById(individualId);

  // 2. 删除数据库记录（级联删除记录）
  await individualRepository.delete(individualId);

  // 3. 删除所有相关图片
  await imageService.deleteIndividualImages(individual.groupId, individualId);
}
```

### 10.3 删除记录

```typescript
async function deleteRecord(recordId: number) {
  // 1. 获取 record（用于删除图片）
  const record = await recordRepository.findById(recordId);

  // 2. 删除数据库记录
  await recordRepository.delete(recordId);

  // 3. 删除图片
  await imageService.deleteImage(record.imagePath);
}
```

---

## 十一、数据库初始化

```typescript
// src/database/index.ts
const DATABASE_NAME = 'plant_recorder.db';
const DATABASE_VERSION = 1;

let db: SQLite.SQLiteDatabase;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS \`groups\` (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      coverImagePath TEXT NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT DEFAULT '',
      viewCount     INTEGER DEFAULT 0,
      createdAt     INTEGER NOT NULL,
      updatedAt     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS \`individuals\` (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      groupId       INTEGER NOT NULL,
      coverImagePath TEXT NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT DEFAULT '',
      createdAt     INTEGER NOT NULL,
      updatedAt     INTEGER NOT NULL,
      FOREIGN KEY (groupId) REFERENCES \`groups\`(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS \`records\` (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      individualId  INTEGER NOT NULL,
      imagePath     TEXT NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT DEFAULT '',
      recordDate    INTEGER NOT NULL,
      createdAt     INTEGER NOT NULL,
      FOREIGN KEY (individualId) REFERENCES \`individuals\`(id) ON DELETE CASCADE
    );
  `);

  return db;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('Database not initialized');
  return db;
}
```

---

## 十二、开发规范

### 12.1 代码规范

- **TypeScript**: 严格模式，所有类型显式声明
- **命名规范**:
  - 组件: PascalCase (e.g., `GroupCard.tsx`)
  - 工具函数: camelCase (e.g., `formatDate.ts`)
  - 常量: UPPER_SNAKE_CASE (e.g., `MAX_TITLE_LENGTH`)
  - 类型/接口: PascalCase (e.g., `interface GroupProps`)
- **组件规范**:
  - 使用函数组件 + Hooks
  - Props 类型单独定义
  - 组件文件不超过 200 行

### 12.2 Git 规范

- **分支命名**: `feature/xxx`, `fix/xxx`, `docs/xxx`
- **提交信息**: `type: description` (type: feat/fix/docs/style/refactor/test)
- **PR 要求**: 必须通过 lint 检查才能合并

### 12.3 目录规范

```
每新增一个页面/组件，需创建对应目录：
GroupCard/
├── GroupCard.tsx
├── GroupCardProps.ts
└── index.ts
```

---

## 十三、测试计划

### 13.1 单元测试

| 模块 | 测试内容 |
|------|---------|
| Repository | CRUD 操作、查询逻辑 |
| ImageService | 图片复制、删除 |
| date utils | 日期格式化 |

### 13.2 集成测试

| 功能 | 测试场景 |
|------|---------|
| 创建分组 | 正常创建、图片为空、标题为空 |
| 删除分组 | 确认弹窗、级联删除 |
| 搜索 | 空关键字、精确匹配、模糊匹配 |
| 排序 | 默认、最热、最新切换 |

---

## 十四、待确认事项

以下事项需要在开发前确认：

- [x] 是否需要支持深色模式？ → **需要**（v1.0 支持）
- [ ] 是否需要图片压缩配置？
- [ ] 最大图片存储容量限制？
- [x] 是否需要数据导出功能（JSON/CSV）？ → **不需要**（v2.0 再考虑）
- [ ] 是否需要预留国际化接口（后续支持英文）？

### 深色模式实现方案

```typescript
// src/theme/ThemeProvider.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem('themeMode').then((saved) => {
      if (saved) setThemeMode(saved as ThemeMode);
    });
  }, []);

  const theme = themeMode === 'system'
    ? (systemColorScheme ?? 'light')
    : themeMode;

  const value = { theme, themeMode, setThemeMode };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
```

---

## 十五、里程碑

| 阶段 | 内容 | 预计工作量 |
|------|------|----------|
| Phase 1 | 项目搭建、数据库、基础组件 | 3 天 |
| Phase 2 | 首页 + 搜索 + 排序 | 2 天 |
| Phase 3 | 分组详情 + 新建分组 | 2 天 |
| Phase 4 | 个体详情 + 新建个体 | 2 天 |
| Phase 5 | 记录详情 + 新建记录 | 2 天 |
| Phase 6 | 删除功能 + 级联清理 | 1 天 |
| Phase 7 | 测试 + Bug 修复 | 2 天 |
| **总计** | | **14 天** |

---

*文档版本：1.0*
*创建日期：2026-04-06*
