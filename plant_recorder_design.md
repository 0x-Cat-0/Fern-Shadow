# 植物记录相机 App - 企业级开发文档

**版本**: 2.0
**更新日期**: 2026-04-08
**状态**: 已完成 Phase 1 开发

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

**已完成功能：**
- ✅ 分组管理（CRUD）- 创建、编辑、删除分组
- ✅ 个体管理（CRUD）- 创建、编辑、删除个体
- ✅ 记录管理（CRUD）- 创建、删除记录
- ✅ 首页瀑布流展示 - 双列瀑布流布局
- ✅ 分组页面 - 三列网格布局
- ✅ 搜索功能 - 按标题/描述搜索
- ✅ 排序功能（默认/最热/最新）
- ✅ 图片管理（拍照/相册选择/按日期分组/删除）
- ✅ 浏览量统计
- ✅ 封面设置 - 可选择任意图片设为封面
- ✅ 个体-分组多对多关系管理

**待实现功能（v2.0）：**
- [ ] 批量删除
- [ ] 数据导出/备份
- [ ] 图片放大预览
- [ ] 深色模式自动切换（跟随系统）

### 1.3 UI 风格参考

- 小红书瀑布流风格
- 红色主色调（#ff4757）
- 白色背景 + 淡灰色分隔线
- 圆角卡片设计（8px）
- 淡入淡出弹窗动画

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
| 状态管理 | React useState/useCallback | - | 函数组件 Hooks |
| 瀑布流 | @react-native-seoul/masonry-list | ^1.x | 瀑布流列表 |
| 安全区域 | react-native-safe-area-context | ^4.x | 适配异形屏 |

### 2.2 项目结构

```
PlantRecorder/
├── src/
│   ├── screens/                    # 页面组件
│   │   ├── MainScreen.tsx        # 首页（全部/分组）
│   │   ├── GroupDetailScreen.tsx  # 分组详情页
│   │   ├── IndividualDetailScreen.tsx  # 个体详情页
│   │   ├── CreateGroupScreen.tsx  # 创建分组页
│   │   ├── CreateIndividualScreen.tsx  # 创建个体页
│   │   ├── EditGroupScreen.tsx    # 编辑分组页
│   │   └── EditIndividualScreen.tsx  # 编辑个体页
│   ├── components/                 # 通用组件
│   │   ├── Card.tsx             # 瀑布流卡片
│   │   ├── ConfirmDialog.tsx  # 确认对话框
│   │   ├── EmptyState.tsx     # 空状态组件
│   │   ├── FAB.tsx            # 悬浮按钮
│   │   ├── Header.tsx          # 页面头部
│   │   ├── ImagePickerButton.tsx  # 图片选择按钮
│   │   ├── LoadingOverlay.tsx  # 加载遮罩
│   │   └── SearchBar.tsx       # 搜索栏
│   ├── database/                 # 数据库层
│   │   ├── index.ts           # 数据库初始化
│   │   ├── migrations.ts      # 数据迁移
│   │   └── repositories/      # 数据仓库
│   │       ├── GroupRepository.ts
│   │       ├── IndividualRepository.ts
│   │       └── RecordRepository.ts
│   ├── hooks/                    # 自定义 Hooks
│   │   └── useTheme.ts       # 主题 Hook
│   ├── theme/                   # 主题配置
│   │   ├── colors.ts         # 颜色规范
│   │   ├── typography.ts     # 字体规范
│   │   └── spacing.ts         # 间距规范
│   ├── types/                   # TypeScript 类型
│   │   └── index.ts          # 全局类型定义
│   └── utils/                  # 工具函数
│       └── ImageStorage.ts    # 图片存储工具
├── assets/
│   └── icons/                  # 图标资源
│       ├── 编辑.png
│       ├── 相机.png
│       └── 返回.png
├── App.tsx                      # 应用入口
├── app.json                     # Expo 配置
├── package.json
└── tsconfig.json
```

---

## 三、数据库设计

### 3.1 ER 图

```
┌─────────────┐       ┌─────────────────────┐       ┌─────────────┐
│   `groups`  │       │`group_individuals`  │       │`individuals`│
├─────────────┤       ├─────────────────────┤       ├─────────────┤
│ id          │──┐    │ groupId            │──┐    │ id          │
│ coverImage │  │    │ individualId       │  │    │ coverImage  │
│ title       │  └───→│ createdAt          │  └───→│ title       │
│ description │       └─────────────────────┘       │ description │
│ viewCount   │                                    │ viewCount   │
│ createdAt   │                                    │ createdAt   │
│ updatedAt   │                                    │ updatedAt   │
└─────────────┘                                    └─────────────┘
                                                        │
                                                        ↓
                                                ┌─────────────┐
                                                │  `records`  │
                                                ├─────────────┤
                                                │ id          │
                                                │ individualId│←─┘
                                                │ imagePath   │
                                                │ title       │
                                                │ description │
                                                │ recordDate  │
                                                │ createdAt   │
                                                └─────────────┘
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
  `coverImagePath` TEXT NOT NULL,
  `title`         TEXT NOT NULL,
  `description`   TEXT DEFAULT '',
  `viewCount`     INTEGER DEFAULT 0,
  `createdAt`     INTEGER NOT NULL,
  `updatedAt`     INTEGER NOT NULL
);

CREATE INDEX idx_individuals_createdAt ON `individuals`(`createdAt`);
CREATE INDEX idx_individuals_title ON `individuals`(`title`);
```

#### group_individuals 表（分组-个体多对多关系）

```sql
CREATE TABLE IF NOT EXISTS `group_individuals` (
  `groupId`       INTEGER NOT NULL,
  `individualId`  INTEGER NOT NULL,
  `createdAt`     INTEGER NOT NULL,
  PRIMARY KEY (`groupId`, `individualId`)
);
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
  `createdAt`     INTEGER NOT NULL
);

CREATE INDEX idx_records_individualId ON `records`(`individualId`);
CREATE INDEX idx_records_recordDate ON `records`(`recordDate`);
```

### 3.3 字段说明

| 表名 | 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|------|
| groups | id | INTEGER | PK, AI | 分组唯一标识 |
| groups | coverImagePath | TEXT | NOT NULL | 封面图片 URI |
| groups | title | TEXT | NOT NULL | 分组标题 |
| groups | description | TEXT | DEFAULT '' | 分组描述 |
| groups | viewCount | INTEGER | DEFAULT 0 | 浏览次数 |
| groups | createdAt | INTEGER | NOT NULL | 创建时间戳（毫秒） |
| groups | updatedAt | INTEGER | NOT NULL | 更新时间戳（毫秒） |
| individuals | id | INTEGER | PK, AI | 个体唯一标识 |
| individuals | coverImagePath | TEXT | NOT NULL | 封面图片 URI |
| individuals | title | TEXT | NOT NULL | 个体标题 |
| individuals | description | TEXT | DEFAULT '' | 个体描述 |
| individuals | viewCount | INTEGER | DEFAULT 0 | 浏览次数 |
| individuals | createdAt | INTEGER | NOT NULL | 创建时间戳 |
| individuals | updatedAt | INTEGER | NOT NULL | 更新时间戳 |
| group_individuals | groupId | INTEGER | PK, FK | 分组 ID |
| group_individuals | individualId | INTEGER | PK, FK | 个体 ID |
| group_individuals | createdAt | INTEGER | NOT NULL | 添加时间戳 |
| records | id | INTEGER | PK, AI | 记录唯一标识 |
| records | individualId | INTEGER | FK, NOT NULL | 所属个体 ID |
| records | imagePath | TEXT | NOT NULL | 图片路径（JSON数组或字符串） |
| records | title | TEXT | NOT NULL | 记录标题 |
| records | description | TEXT | DEFAULT '' | 记录描述 |
| records | recordDate | INTEGER | NOT NULL | 记录日期（毫秒） |
| records | createdAt | INTEGER | NOT NULL | 创建时间戳 |

---

## 四、文件存储结构

### 4.1 目录结构

```
[应用私有目录]/
├── plant_images/                 # 植物图片存储目录
│   ├── groups/                  # 分组封面
│   │   └── {timestamp}_{uuid}.jpg
│   ├── individuals/             # 个体封面
│   │   └── {timestamp}_{uuid}.jpg
│   └── records/                 # 记录图片
│       └── {timestamp}_{uuid}.jpg
└── databases/
    └── plant_recorder.db        # SQLite 数据库
```

### 4.2 图片命名规范

| 类型 | 命名格式 | 示例 |
|------|---------|------|
| 分组封面 | `{timestamp}_{uuid}.jpg` | `1712390400000_abc123.jpg` |
| 个体封面 | `{timestamp}_{uuid}.jpg` | `1712390500000_def456.jpg` |
| 记录图片 | `{timestamp}_{uuid}.jpg` | `1712390600000_ghi789.jpg` |

---

## 五、页面架构

### 5.1 页面列表

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页（全部） | MainScreen | 分组瀑布流 + 搜索 + 排序 |
| 分组页 | MainScreen (tabs) | 三列分组网格 |
| 分组详情 | GroupDetail | 个体列表 + 分组信息 |
| 个体详情 | IndividualDetail | 记录时间线 + 个体信息 |
| 创建分组 | CreateGroup | 创建分组表单 |
| 创建个体 | CreateIndividual | 创建个体表单 |
| 编辑分组 | EditGroup | 编辑分组表单 |
| 编辑个体 | EditIndividual | 编辑个体表单 |

### 5.2 导航结构

```
Root Navigator (Stack)
├── MainScreen (Tab Navigator)
│   ├── 全部 (GroupsView)
│   ├── 分组 (CategoriesView)
│   ├── ＋ (CreateOptions - 底部弹出)
│   ├── 社区 (预留)
│   └── 我 (Profile - 预留)
├── GroupDetail (分组详情)
├── IndividualDetail (个体详情)
├── CreateGroup (创建分组)
├── CreateIndividual (创建个体)
├── EditGroup (编辑分组)
└── EditIndividual (编辑个体)
```

**底部导航栏布局：**
```
┌─────────────────────────────────┐
│  全部    分组    ＋    社区    我 │
└─────────────────────────────────┘
```
- 全部/分组：切换视图
- ＋：弹出创建选项（创建分组/创建个体）
- 社区/我：预留页面

### 5.3 页面流程图

```
┌─────────┐     ┌─────────┐
│  全部   │────→│  分组   │
└────┬────┘     └────┬────┘
     │               │
     │ 点击卡片       │ 点击卡片
     ↓               ↓
┌─────────────┐  ┌─────────────┐
│  分组详情    │  │  分组详情    │
└────┬────────┘  └────┬────────┘
     │                 │
     │ 点击个体         │ 点击个体
     ↓                 ↓
┌─────────────┐  ┌─────────────┐
│  个体详情    │  │  个体详情    │
└─────────────┘  └─────────────┘

点击 ＋ 按钮
     ↓
┌─────────────┐     ┌─────────────┐
│  创建分组    │────→│  分组详情   │
└─────────────┘     └─────────────┘
     │
     ↓
┌─────────────┐     ┌─────────────┐
│  创建个体    │────→│  个体详情   │
└─────────────┘     └─────────────┘

点击编辑按钮
     ↓
┌─────────────┐     ┌─────────────┐
│  编辑分组    │────→│  分组详情   │
└─────────────┘     └─────────────┘
     或
┌─────────────┐     ┌─────────────┐
│  编辑个体    │────→│  个体详情   │
└─────────────┘     └─────────────┘
```

---

## 六、UI 组件规范

### 6.1 颜色规范

```typescript
// 浅色模式颜色 - 已实现
export const lightColors = {
  primary: '#ff4757',        // 红色 - 主色调（按钮、FAB、强调）
  primaryDark: '#ff3344',     // 深红色 - 按压状态
  primaryLight: '#ffe5e5',    // 浅红色 - 背景

  accent: '#4CAF50',          // 绿色 - 植物主题辅助色

  danger: '#ff4757',          // 红色 - 删除、错误
  dangerDark: '#ff3344',      // 深红色

  background: '#ffffff',      // 页面背景（白色）
  surface: '#ffffff',         // 卡片背景
  border: '#f0f0f0',         // 边框

  textPrimary: '#333333',     // 主文字
  textSecondary: '#666666',   // 次要文字
  textDisabled: '#999999',    // 辅助文字
  textInverse: '#ffffff',     // 反色文字

  tabActive: '#ff4757',       // Tab 选中下划线
  tabInactive: '#999999',     // Tab 未选中

  success: '#4CAF50',
  warning: '#FF9800',
  error: '#ff4757',
};
```

**主题切换方案：**
- 当前版本仅支持浅色模式
- 深色模式待实现（v2.0）

### 6.2 字体规范

```typescript
export const typography = {
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    xxl: 20,
  },
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
  cardGap: 8,
  cardRadius: 8,
  imageAspectRatio: 1,
  bottomNavHeight: 60,
  fabSize: 50,
  fabRadius: 25,
  headerHeight: 50,
};
```

### 6.4 创建/编辑页面样式规范

**页面布局：**
```
┌─────────────────────────────────┐
│ ←        页面标题               │  Header (白色背景)
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │      📷 + 图标 80x80        │ │  图片区域
│ └─────────────────────────────┘ │
│                                   │
│ 添加标题                          │  标题输入（18px 加粗）
│ ─────────────────────────────────│
│ 添加正文或发语音                   │  描述输入（15px）
│ ─────────────────────────────────│
│                                   │
│ ┌─────────────────────────────┐ │
│ │  分隔线 (1px #f0f0f0)      │ │
│ └─────────────────────────────┘ │
│                                   │
│ 所属分组                      ›  │  选项（白色背景）
│                                   │
├─────────────────────────────────┤
│  ┌─────────┐  ┌─────────────┐  │  底部按钮
│  │  取消   │  │    保存      │  │  取消：白色+灰边框
│  └─────────┘  └─────────────┘  │  保存：红色背景
└─────────────────────────────────┘
```

---

## 七、核心功能详细设计

### 7.1 首页（全部/分组）

**功能描述：**
展示所有分组，支持搜索、排序、创建新分组。

**布局：**
```
┌─────────────────────────────────┐
│ ←      全部              🔍   │  Header
├─────────────────────────────────┤
│ ♡  [默认] [最热] [最新]        │  Tab 栏
├─────────────────────────────────┤
│ ┌────────┐  ┌────────┐        │
│ │        │  │        │        │  双列瀑布流
│ │  封面  │  │  封面  │        │
│ │────────│  │────────│        │
│ │  标题  │  │  标题  │        │
│ └────────┘  └────────┘        │
│ ...                             │
│                          ┌───┐ │
│                          │ + │ │  红色加号
├─────────────────────────────────┤
│ 全部  分组  ＋  社区  我         │  底部导航
└─────────────────────────────────┘
```

**瀑布流卡片：**
- 自适应图片比例
- 标题（单行省略）
- 长按显示编辑/删除按钮
- 点击卡片 → 进入分组详情

**编辑模式：**
- 长按卡片 → 进入编辑模式
- 显示编辑/删除按钮浮层
- 点击按钮外区域 → 取消编辑模式

**搜索逻辑：**
```sql
SELECT * FROM `groups`
WHERE title LIKE ? OR description LIKE ?
ORDER BY createdAt DESC;
```

### 7.2 分组详情页

**功能描述：**
展示分组信息及下属所有个体，支持编辑分组、添加/移除个体。

**布局：**
```
┌─────────────────────────────────┐
│ ←      分组标题         📷      │  📷 编辑图标
├─────────────────────────────────┤
│ ┌──────┐  分组标题            │
│ │ 封面  │  描述...            │
│ │ 80x80│  N 个体 · M 次浏览  │
│ └──────┘                       │
├─────────────────────────────────┤
│ 🔍 搜索个体                      │
├─────────────────────────────────┤
│ ┌────────┐  ┌────────┐        │
│ │  封面  │  │  封面  │        │
│ │  标题  │  │  标题  │        │
│ │ N记录  │  │ N记录  │        │
│ └────────┘  └────────┘        │
│ ...                        ┌───┐│
│                          │ + │ │  添加个体
├─────────────────────────────────┤
│ 全部  分组  ＋  社区  我         │
└─────────────────────────────────┘
```

**添加个体弹窗：**
- 淡入淡出动画
- 点击空白区域 = 点击确定
- 显示所有个体列表（勾选已添加的）
- 取消勾选 = 从分组移除

### 7.3 个体详情页

**功能描述：**
展示个体信息及下属所有记录，记录以时间线形式展示。

**布局：**
```
┌─────────────────────────────────┐
│ ←      个体标题         📷      │  📷 编辑图标
├─────────────────────────────────┤
│ ┌────────┐  个体标题            │
│ │  封面  │  描述...            │
│ │ 80x80  │  N 条记录 · M 次浏览│
│ └────────┘                      │
├─────────────────────────────────┤
│ 时间线                          │
│                                  │
│ 03月31日│ ● 新叶子              │
│         │   又长了一片新叶子    │
│         │   [图片][图片]        │
│         │                       │
│ 03月25日│ ● 换水               │
│         │   [图片]              │
│                          ┌───┐ │
├─────────────────────────────────┤
│ 全部  分组  ＋  社区  我         │
└─────────────────────────────────┘
```

**时间线布局规格：**
| 元素 | 样式 |
|------|------|
| 垂直线 | 1px，灰色 (#e0e0e0)，位于日期和节点之间 |
| 节点 | 8px 圆点，灰色，首个记录为红色 (#ff4757) |
| 日期 | 12px，灰色 (#999)，宽度 60px，右对齐 |
| 内容左侧距 | 70px（节点右侧） |
| 标题 | 14px，加粗，深灰 (#333) |
| 描述 | 12px，灰色 (#666) |
| 图片 | 80x80，正方形，4px 间距 |

### 7.4 创建/编辑分组页

**功能描述：**
创建或编辑分组，可选择封面图、设置标题描述、选择要添加的个体。

**布局：**
```
┌─────────────────────────────────┐
│ ←      创建/编辑分组            │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │      📷 +  80x80           │ │  点击选择封面
│ └─────────────────────────────┘ │
│                                   │
│ 添加标题                          │  标题输入
│ ─────────────────────────────────│
│ 添加正文或发语音                   │  描述输入
│ ─────────────────────────────────│
│                                   │
│ ┌─────────────────────────────┐ │
│ │  分隔线 (1px #f0f0f0)      │ │
│ └─────────────────────────────┘ │
│                                   │
│ 选择植物                      ›  │  点击选择个体
│                                   │
├─────────────────────────────────┤
│  ┌─────────┐  ┌─────────────┐  │
│  │  取消   │  │    保存      │  │
│  └─────────┘  └─────────────┘  │
└─────────────────────────────────┘
```

### 7.5 创建/编辑个体页

**功能描述：**
创建或编辑个体，显示所有记录图片、设置标题描述、选择所属分组。

**布局：**
```
┌─────────────────────────────────┐
│ ←      创建/编辑个体             │
├─────────────────────────────────┤
│ ┌────┐┌────┐┌────┐┌────┐     │
│ │img ││img ││img ││ + │     │  横向滚动图片
│ └────┘└────┘└────┘└────┘     │
│                                   │
│ 添加标题                          │
│ ─────────────────────────────────│
│ 添加正文或发语音                   │
│ ─────────────────────────────────│
│                                   │
│ ┌─────────────────────────────┐ │
│ │  分隔线 (1px #f0f0f0)      │ │
│ └─────────────────────────────┘ │
│                                   │
│ 所属分组                      ›  │
│                                   │
├─────────────────────────────────┤
│  ┌─────────┐  ┌─────────────┐  │
│  │  取消   │  │    保存      │  │
│  └─────────┘  └─────────────┘  │
└─────────────────────────────────┘
```

**图片区域说明：**
- 有图片时：横向滚动，80x80 正方形，点击设为封面，长按删除
- 无图片时：显示 "+" 占位符
- 最右侧：添加按钮 "+"

---

## 八、图片服务

### 8.1 图片选择流程

```typescript
// 1. 请求权限
const requestPermission = async (type: 'camera' | 'library') => {
  if (type === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相机权限才能拍照');
      return false;
    }
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相册权限才能选择图片');
      return false;
    }
  }
  return true;
};

// 2. 拍照
const takePhoto = async () => {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 1,
  });
  // 返回 result.assets[0].uri
};

// 3. 从相册选择
const pickImages = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 1,
    exif: true,  // 获取 EXIF 数据用于日期分组
  });
  // 返回 result.assets[]
};
```

### 8.2 图片复制到私有目录

```typescript
import * as FileSystem from 'expo-file-system';

export async function copyImageToDocumentDirectory(sourceUri: string): Promise<string> {
  const timestamp = Date.now();
  const uuid = Math.random().toString(36).substring(2, 15);
  const filename = `${timestamp}_${uuid}.jpg`;
  const destUri = `${FileSystem.documentDirectory}plant_images/${filename}`;

  // 确保目录存在
  const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}plant_images`);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}plant_images`, {
      intermediates: true,
    });
  }

  // 复制图片
  await FileSystem.copyAsync({
    from: sourceUri,
    to: destUri,
  });

  return destUri;
}
```

### 8.3 图片日期分组

```typescript
// 按 EXIF 日期或创建时间分组
const getImageCreationTime = (asset: ImagePicker.ImagePickerAsset): number => {
  let timestamp: number = Date.now();
  const assetAny = asset as any;

  // 优先使用 creationTime
  if (assetAny.creationTime) {
    timestamp = assetAny.creationTime;
  }
  // 尝试从 EXIF 读取 DateTimeOriginal
  else if (assetAny.exif?.DateTimeOriginal) {
    const dateStr = assetAny.exif.DateTimeOriginal;
    const parsed = new Date(dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
    if (!isNaN(parsed.getTime())) {
      timestamp = parsed.getTime();
    }
  }
  return timestamp;
};

// 按日期分组
const groupImagesByDate = (images: SelectedImage[]): Map<string, SelectedImage[]> => {
  const groups = new Map<string, SelectedImage[]>();
  for (const img of images) {
    if (img.creationTime) {
      const date = new Date(img.creationTime);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      // ...
    }
  }
  return groups;
};
```

---

## 九、级联删除流程

### 9.1 删除分组

```typescript
async function deleteGroup(groupId: number) {
  // 1. 删除数据库记录
  await GroupRepository.delete(groupId);

  // 2. 删除分组封面图片（如果存在）
  const group = await GroupRepository.findById(groupId);
  if (group?.coverImagePath) {
    await FileSystem.deleteAsync(group.coverImagePath, { idempotent: true });
  }

  // 3. 注意：个体和记录的删除由数据库外键级联处理
  // 或手动遍历删除
}
```

### 9.2 删除个体

```typescript
async function deleteIndividual(individualId: number) {
  // 1. 获取个体信息（用于删除封面）
  const individual = await IndividualRepository.findById(individualId);

  // 2. 删除数据库记录（级联删除记录）
  await IndividualRepository.delete(individualId);

  // 3. 从所有分组中移除该个体
  await GroupRepository.removeIndividualFromAllGroups(individualId);

  // 4. 删除封面图片
  if (individual?.coverImagePath) {
    await FileSystem.deleteAsync(individual.coverImagePath, { idempotent: true });
  }
}
```

### 9.3 删除记录中的单张图片

```typescript
async function deleteImageFromRecord(recordId: number, imageIndex: number) {
  const record = await RecordRepository.findById(recordId);
  if (!record) return;

  const imagePaths = Array.isArray(record.imagePath)
    ? record.imagePath
    : [record.imagePath];

  // 删除图片文件
  const imagePathToDelete = imagePaths[imageIndex];
  if (imagePathToDelete) {
    await FileSystem.deleteAsync(imagePathToDelete, { idempotent: true });
  }

  // 更新记录
  const newPaths = imagePaths.filter((_, idx) => idx !== imageIndex);
  if (newPaths.length === 0) {
    await RecordRepository.delete(recordId);
  } else {
    await RecordRepository.update(recordId, { imagePath: newPaths });
  }
}
```

---

## 十、开发规范

### 10.1 代码规范

- **TypeScript**: 严格模式，所有类型显式声明
- **命名规范**:
  - 组件: PascalCase (e.g., `GroupCard.tsx`)
  - 工具函数: camelCase (e.g., `formatDate.ts`)
  - 常量: UPPER_SNAKE_CASE (e.g., `MAX_TITLE_LENGTH`)
  - 类型/接口: PascalCase (e.g., `interface GroupProps`)
- **组件规范**:
  - 使用函数组件 + Hooks
  - Props 类型单独定义
  - 屏幕文件使用 Screen 后缀

### 10.2 UI 样式规范

**创建/编辑页面：**
- 背景色: #ffffff
- 分隔线: #f0f0f0, 1px
- 输入框无边框
- 标题: 18px, fontWeight: 600
- 描述: 15px
- 选项背景: #f5f5f5
- 选项圆角: 8px

**底部按钮：**
- 取消按钮: 白色背景, 1px #e0e0e0 边框, 文字 #333333
- 保存按钮: #ff4757 背景, 白色文字
- 按钮高度: 44px
- 按钮圆角: 8px
- 按钮间距: 12px

**弹窗动画：**
- animationType: "fade"
- 点击遮罩层关闭弹窗
- 确认按钮点击后关闭弹窗

### 10.3 数据刷新

**页面焦点刷新：**
```typescript
import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  useCallback(() => {
    loadData();
  }, [loadData])
);
```

---

## 十一、待确认事项

以下事项需要确认：

- [ ] 是否需要支持深色模式？
- [ ] 是否需要图片压缩配置？
- [ ] 最大图片存储容量限制？
- [x] 是否需要数据导出功能（JSON/CSV）？ → **不需要**（v2.0 再考虑）
- [ ] 是否需要预留国际化接口（后续支持英文）？

---

## 十二、里程碑

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 项目搭建、数据库、基础组件 | ✅ 已完成 |
| Phase 2 | 首页瀑布流 + 搜索 + 排序 | ✅ 已完成 |
| Phase 3 | 分组详情 + 创建/编辑分组 | ✅ 已完成 |
| Phase 4 | 个体详情 + 创建/编辑个体 | ✅ 已完成 |
| Phase 5 | 记录时间线 + 添加/删除记录 | ✅ 已完成 |
| Phase 6 | 分组-个体多对多关系 | ✅ 已完成 |
| Phase 7 | UI 样式统一（创建/编辑页面） | ✅ 已完成 |
| Phase 8 | 测试 + Bug 修复 | 待开始 |

---

## 十三、版本历史

### v1.3 -> v2.0 更新内容 (2026-04-08)

1. **新增页面：**
   - CreateGroupScreen - 创建分组页
   - CreateIndividualScreen - 创建个体页
   - EditGroupScreen - 编辑分组页
   - EditIndividualScreen - 编辑个体页

2. **UI 改进：**
   - 统一创建/编辑页面样式
   - 新增底部取消/保存按钮
   - 图片选择弹窗淡入淡出动画
   - 选项分隔线样式

3. **功能改进：**
   - 个体-分组多对多关系
   - 记录图片按日期分组
   - 封面图片可选择
   - 页面返回时自动刷新数据

4. **数据库变更：**
   - individuals 表移除 groupId 外键
   - 新增 group_individuals 多对多关联表
   - records.imagePath 支持 JSON 数组格式

---

*文档版本：2.0*
*创建日期：2026-04-06*
*最后更新：2026-04-08*
