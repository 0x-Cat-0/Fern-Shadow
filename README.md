# 蕨影 (FernShadow)

一款专为植物爱好者设计的记录应用，用镜头捕捉植物生长的每一个瞬间。

## 功能特点

-  **便捷记录** - 拍照记录植物生长，每个瞬间都不错过
-  **时间轴展示** - 智能时间轴，清晰呈现植物成长历程
-  **分组管理** - 灵活分组，让你的植物收藏井然有序
-  **精美界面** - 原生设计，简洁优雅的用户体验

## 技术栈

- **Framework**: React Native + Expo SDK 55
- **Language**: TypeScript
- **Navigation**: React Navigation
- **Database**: expo-sqlite
- **Updates**: EAS Update (热更新支持)

## 项目结构

```
├── App.tsx                 # 应用入口
├── src/
│   ├── components/         # 可复用组件
│   ├── screens/            # 页面组件
│   ├── database/          # 数据库操作
│   ├── contexts/          # React Context
│   ├── hooks/             # 自定义 Hooks
│   ├── theme/             # 主题配置
│   ├── types/             # TypeScript 类型
│   └── utils/             # 工具函数
├── assets/                 # 静态资源
└── android/               # Android 原生配置
```

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# Android 构建
npm run android

# iOS 构建 (需要 macOS)
npm run ios
```

## 热更新

项目配置了 EAS Update 热更新功能。构建后的 APK 安装后可以接收热更新推送。

## 下载

- [Android APK 下载](https://expo.dev/artifacts/eas/pszGRECPc1ZTfkwtN1V3b6.apk)

## 问题反馈

- QQ群：1021089767

## 许可证

MIT License

Copyright (c) 2026 蕨影 FernShadow

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
