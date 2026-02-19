<p align="center">
  <img src="https://img.shields.io/badge/Electron-34-47848F?logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/TipTap-2-1a1a2e?logo=tiptap&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

<h1 align="center">🖊️ ArcWriter — 創作者的寫作工坊</h1>

<p align="center">
  <strong>以「硯墨」為靈感打造的桌面寫作應用程式，專為劇本作家與小說家設計。</strong>
</p>

---

## 📥 下載

<table>
  <tr>
    <td><strong>💻 Windows 免安裝版</strong></td>
    <td><a href="https://github.com/iamd51/ArcWriter/releases/latest"> 👉 前往下載頁面</a></td>
  </tr>
</table>

> **使用方式：** 下載 `.zip` 檔案 → 解壓縮到任意位置 → 雙擊 `ArcWriter.exe` 即可執行，無需安裝。

**系統需求：**
- Windows 10 / 11（64 位元）
- 約 200 MB 磁碟空間

---

## 📖 簡介

**ArcWriter** 是一款基於 Electron + React 的桌面寫作工具，融合了東方「硯墨」美學與現代編輯器體驗。它提供 **劇本編輯器** 與 **小說編輯器** 雙模式，內建 AI 寫作助手、故事聖經、版本快照、專注模式等豐富功能，幫助創作者從靈感到完稿的全流程。

### ✨ 特色亮點

- 🎭 **專業劇本編輯器** — 表格式劇本撰寫，支援場景、角色、對白、動作、備註欄位
- 📝 **富文本小說編輯器** — 基於 TipTap 的所見即所得編輯，支援 Markdown
- 🤖 **AI 寫作助手** — 支援多家 LLM 供應商（OpenAI、Gemini、Claude 等）
- 📚 **故事聖經** — 集中管理角色、場景、道具、時間線等世界觀設定
- 📸 **版本快照** — 一鍵保存文件快照，支援差異比對
- 🎯 **專注模式** — 全螢幕沉浸式寫作，搭配每日字數目標
- 📊 **寫作熱力圖** — GitHub 風格的年度寫作日曆，追蹤寫作連續天數
- 🎨 **硯墨主題** — 獨特的東方美學設計，朱砂色點綴
- ⌨️ **命令面板** — VS Code 風格的快捷命令系統

---

## 🖥️ 功能介紹

### 📂 專案管理

| 功能 | 說明 |
|------|------|
| **開始旅程** | 一鍵建立新專案，自動產生 `novels/`、`screenplays/`、`notes/` 資料夾結構 |
| **開啟資料夾** | 載入現有專案目錄 |
| **檔案樹** | 側邊欄顯示完整目錄結構，支援新增、刪除、重新命名檔案 |
| **分頁標籤** | 同時開啟多個檔案，快速切換 |
| **最近專案** | 自動記錄最近開啟的專案，快速回到上次的工作 |

### 🎭 劇本編輯器（.arc 檔案）

ArcWriter 的核心功能——專為劇本創作設計的表格式編輯器：

| 欄位 | 用途 |
|------|------|
| **場景標題** | `INT./EXT.` 場景描述（如：`INT. 客廳 - 夜晚`） |
| **角色** | 說話的角色名稱 |
| **對白** | 角色的台詞內容 |
| **動作/場景描述** | 角色動作或場景變化描述 |
| **備註** | 編劇筆記、拍攝提示等 |

**操作功能：**

- ✂️ 剪下 / 📋 複製 / 📌 貼上
- **B** 粗體 / *I* 斜體 / ~~S~~ 刪除線 / <u>U</u> 底線
- 🎨 文字顏色與底色設定（色票選擇器）
- 📏 H1 ~ H3 標題層級
- ➕ 新增場景 / 新增行 / 🗑️ 刪除行
- 📁 場景摺疊 / 展開

**劇本分頁：**

長篇劇本不再需要無盡滾動！底部分頁列提供：
- 📄 可選擇每頁顯示 3 / 5 / 10 / 15 / 20 / 50 個場景
- 🔢 頁碼快速跳頁，首頁／末頁按鈕
- 💾 每頁場景數偏好會自動儲存

**文件搜尋（Ctrl+F）：**

工具列右側的搜尋框可搜尋當前劇本所有場景的所有欄位：
- 即時顯示匹配數量（如 `3/12`）
- Enter / Shift+Enter 切換上一個／下一個匹配
- 自動跳到匹配所在的頁面和場景

### 📝 小說編輯器（.txt / .md 等檔案）

基於 **TipTap** 的富文本編輯器：

- 📌 所見即所得編輯
- **粗體**、*斜體*、~~刪除線~~、<u>底線</u>
- H1 ~ H3 標題
- 🎨 文字顏色與底色
- 📊 即時字數統計
- 🔍 搜尋與取代（Ctrl+F / Ctrl+H）

### 🤖 AI 寫作助手

內建 AI 面板，支援多種 LLM 供應商：

| 供應商 | 說明 |
|--------|------|
| **OpenAI** | GPT-4o、GPT-4o-mini 等模型 |
| **Google Gemini** | Gemini Pro 系列 |
| **Anthropic Claude** | Claude 3.5 系列 |
| **自訂端點** | 任何相容 OpenAI API 格式的服務 |

**AI 功能：**

- 💬 **對話模式** — 自由與 AI 討論劇情、角色設定
- 📝 **續寫** — AI 根據當前內容繼續撰寫
- ✍️ **改寫** — 選取文字後由 AI 改寫潤色
- 🔄 **風格轉換** — 切換文體、語氣
- 📋 **插入至編輯器** — 一鍵將 AI 生成的內容插入文件
- 🎭 **劇本感知** — AI 可讀取當前劇本/文件內容作為上下文
- ⚡ **串流回應** — 即時顯示 AI 回覆

**設定管理：**

- 🔑 API Key 管理（加密儲存在本地）
- 🌡️ Temperature / Max Tokens 調整
- 💡 自訂 System Prompt
- 📦 設定檔（Profile）系統 — 儲存不同的模型組合
- ✅ 連線測試

### 📚 故事聖經（Story Bible）

集中管理你的世界觀設定：

| 類別 | 內容 |
|------|------|
| **角色** | 姓名、描述、關係、性格特質 |
| **場景/地點** | 場景描述、歷史、氛圍設定 |
| **道具/物品** | 重要道具的來源、用途、意義 |
| **時間線** | 事件發生順序、時間節點 |
| **自訂分類** | 自由新增分類、標籤管理 |

每個條目支援：
- 📝 富文本描述
- 🏷️ 標籤分類
- 🔍 全文搜尋
- 📁 依類別篩選

### 🔗 角色關係圖

視覺化的角色關係網絡：

- 🕸️ 互動式力導向圖（D3-style）
- 👤 節點代表角色，連線代表關係
- 🖱️ 支援拖曳移動節點
- ➕ 快速新增角色與關係
- 🏷️ 自訂關係類型（朋友、敵人、家人、戀人等）

### 📸 版本快照

文件的時光機：

- 📸 一鍵建立當前文件的快照
- 📝 為每個快照加上備註
- 📊 快照間的差異比對（Diff View）
- ⏪ 一鍵還原到任何歷史版本
- 🗑️ 快照管理與刪除

### 🎯 專注模式

沉浸式寫作體驗：

- 🖥️ 全螢幕無干擾編輯
- 🎯 設定每日字數目標
- 📊 即時進度追蹤
- 🎨 簡潔的沉浸式介面
- ⏱️ Esc 快速退出

### 📊 寫作熱力圖

GitHub 風格的創作統計：

- 📅 365 天方格圖，依墨色深淺顯示每日字數
- 🔥 連續寫作天數統計
- 📈 平均每日字數
- 🏆 最佳單日紀錄
- 📊 總寫作天數

### 📤 匯出功能

| 格式 | 適用對象 | 說明 |
|------|----------|------|
| **PDF** | 小說 / 劇本 | A4 排版，專業格式 |
| **Fountain** | 劇本 | 業界通用的純文字劇本格式 |
| **純文字** | 小說 | 乾淨的 .txt 文件 |

### ⚙️ 設定面板

完整的客製化設定：

- 🔑 AI API Key 與供應商管理
- 🌡️ 模型參數調整
- 💡 System Prompt 自訂
- 📦 設定檔管理
- 🔌 自訂 API 端點
- ✅ 連線測試

### ⌨️ 命令面板

按下 `Ctrl+P` 開啟命令面板，快速執行各種操作：

- 🔍 模糊搜尋命令
- ⚡ 快速切換面板
- 📁 快速開啟檔案
- 🎨 主題切換

---

## ⌨️ 快捷鍵一覽

### 全域快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl+S` | 儲存檔案 |
| `Ctrl+P` | 開啟命令面板 |
| `Ctrl+F` | 搜尋（劇本編輯器） |
| `Ctrl+Shift+F` | 全專案搜尋 |
| `F11` | 專注模式 |

### 編輯快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl+B` | 粗體 |
| `Ctrl+I` | 斜體 |
| `Ctrl+U` | 底線 |
| `Ctrl+X` | 剪下 |
| `Ctrl+C` | 複製 |
| `Ctrl+V` | 貼上 |

### 劇本編輯器

| 快捷鍵 | 功能 |
|--------|------|
| `↑ / ↓` | 在行間導航 |
| `← / →` | 在欄位間切換 |
| `Tab` | 跳到下一個欄位 |
| `Enter` | 搜尋時跳到下一個匹配 |
| `Shift+Enter` | 搜尋時跳到上一個匹配 |
| `Esc` | 關閉搜尋框 |

---

## 🛠️ 安裝與開發

### 前置需求

- **Node.js** >= 18
- **npm** >= 9

### 安裝步驟

```bash
# 克隆專案
git clone https://github.com/iamd51/ArcWriter.git
cd ArcWriter

# 安裝依賴
npm install

# 啟動開發模式
npm run dev
```

### 建構生產版本

```bash
# 建構前端與 Electron
npm run build

# 打包為 Windows 免安裝版（輸出至 release/ 資料夾）
npm run package
```

### 專案結構

```
ArcWriter/
├── src/
│   ├── main/                    # Electron 主程序
│   │   ├── main.js              # 主程序入口
│   │   ├── preload.js           # 預載腳本（安全橋接）
│   │   └── fileService.js       # 檔案系統服務
│   └── renderer/                # React 渲染程序
│       ├── App.jsx              # 應用程式入口
│       ├── components/          # UI 元件（31 個）
│       │   ├── ScreenplayEditor.jsx   # 劇本編輯器
│       │   ├── NovelEditor.jsx        # 小說編輯器
│       │   ├── AIPanel.jsx            # AI 助手面板
│       │   ├── StoryBiblePanel.jsx    # 故事聖經
│       │   ├── SnapshotPanel.jsx      # 版本快照
│       │   ├── FocusMode.jsx          # 專注模式
│       │   ├── WritingHeatmap.jsx     # 寫作熱力圖
│       │   ├── RelationshipGraph.jsx  # 角色關係圖
│       │   ├── ExportDialog.jsx       # 匯出對話框
│       │   ├── CommandPalette.jsx     # 命令面板
│       │   ├── SettingsPanel.jsx      # 設定面板
│       │   └── ...
│       ├── services/            # 業務邏輯服務
│       │   ├── aiService.js           # AI 服務
│       │   ├── storyBibleService.js   # 故事聖經服務
│       │   └── writingStatsService.js # 寫作統計服務
│       ├── store/               # 狀態管理
│       └── styles/              # CSS 樣式（28 個檔案）
├── index.html
├── vite.config.js
└── package.json
```

---

## 🎨 設計理念

ArcWriter 以中國傳統書房「硯墨」為設計靈感，融合現代 UI 設計語彙：

| 元素 | 設計 |
|------|------|
| **色彩** | 深色背景搭配朱砂色（`#c9563c`）點綴，如同硯台上的墨與朱 |
| **字型** | 搭配中文襯線／無襯線字型，兼顧閱讀與輸入 |
| **動畫** | Framer Motion 驅動的流暢過場動畫 |
| **圖示** | Lucide Icons 提供一致的線性圖示風格 |
| **佈局** | 三欄式佈局：活動列 → 側邊欄 → 編輯區 |

---

## 🧰 技術棧

| 技術 | 用途 |
|------|------|
| **Electron 34** | 桌面應用程式框架 |
| **React 19** | UI 元件庫 |
| **Vite 6** | 開發伺服器與建構工具 |
| **TipTap 2** | 富文本編輯器引擎 |
| **Framer Motion** | 動畫庫 |
| **Lucide React** | 圖示庫 |

---

## 📄 授權

MIT License

---

<p align="center">
  <sub>以硯為心，以墨為魂 — ArcWriter 🖊️</sub>
</p>
