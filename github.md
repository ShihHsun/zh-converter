main (正式環境 - 唯讀，僅接受 test 的合併)
 │
 └── test (測試環境 - 整合區)
      │
      ├── feature/member1 (成員 1 開發中) ───> 發 PR 合併至 test
      │
      ├── feature/member2 (成員 2 開發中) ───> 發 PR 合併至 test
      │
      ├── feature/member3 (成員 3 開發中) ───> 發 PR 合併至 test
      │
      ├── feature/member4 (成員 4 開發中) ───> 發 PR 合併至 test
      │
      └── feature/member5 (成員 5 開發中) ───> 發 PR 合併至 test
      
      ⬇️ (測試環境確認無誤後)
      
      發 PR 合併至 main 🚀


# GitHub 團隊協作版控流程說明

這份指南定義了從正式環境 (`main`)、測試環境 (`test`) 到各個成員開發分支的協作流程。核心原則為：**所有功能必須先合併至 `test` 測試，確認無誤後才能合併至 `main`。**

## 🌳 分支架構與職責

| 分支名稱 | 用途說明 | 權限與操作規範 |
| --- | --- | --- |
| **`main`** | **正式環境**。存放最穩定、隨時可上線的程式碼。 | 🚫 **禁止直接 Push**。僅能透過從 `test` 發起 Pull Request (PR) 合併。 |
| **`test`** | **測試環境**。匯集所有成員的最新功能，用於整合與測試。 | ⚠️ 僅接受來自成員分支的 PR 合併，確認沒問題才 PR 到 `main`。 |
| **`feature/<成員名稱>`** | **開發環境**。各個成員獨立開發新功能或修復 Bug 的專屬分支。 | ✅ 成員自由操作。開發完成後推送到遠端，並向 `test` 發起 PR。 |

---

## 💻 完整操作指令範例

### 階段一：專案初始化（通常由專案負責人執行一次即可）

從 `main` 分支切分出 `test` 分支，並推送到 GitHub 建立遠端測試環境。

```bash
# 1. 切換到 main 分支並確保是最新狀態
git checkout main
git pull origin main

# 2. 從 main 建立並切換到 test 分支
git checkout -b test

# 3. 將 test 分支推送到 GitHub 遠端
git push -u origin test

```

### 階段二：成員日常開發（各成員執行）

成員在開發新功能前，必須基於最新的 `test` 分支來建立自己的開發分支。

```bash
# 1. 切換到 test 分支，並拉取遠端最新進度
git checkout test
git pull origin test

# 2. 從 test 建立個人專屬分支 (範例名稱：feature/ming)
git checkout -b feature/ming

# --- 在這裡進行程式碼開發、修改 ---

# 3. 將修改加入暫存區
git add .

# 4. 提交修改 (請寫明清楚的 commit 訊息)
git commit -m "feat: 新增會員登入功能"

# 5. 將個人分支推送到 GitHub 遠端
git push -u origin feature/ming

```

### 階段三：將成員分支合併到 Test（透過 GitHub PR）

為了確保程式碼品質，建議**不要用指令強制合併**，而是到 GitHub 網站上操作：

1. 進入 GitHub 專案頁面。
2. 點擊 **"Compare & pull request"**。
3. 設定方向：`base: test` ← `compare: feature/ming`。
4. 填寫修改內容說明，點擊 **"Create pull request"**。
5. 團隊成員 Code Review 沒問題後，點擊 **"Merge pull request"**。

### 階段四：測試無誤，將 Test 合併到 Main（透過 GitHub PR）

當 `test` 分支上的功能都測試完畢，準備上線時：

1. 在 GitHub 網站上建立新的 Pull Request。
2. 設定方向：`base: main` ← `compare: test`。
3. 確認無誤後，點擊 **"Merge pull request"** 完成正式上線。

---

## 📝 常用 Git 指令速查表 (Cheat Sheet)

| 動作目的 | 終端機指令 (Terminal) |
| --- | --- |
| **查看目前所在分支** | `git branch` |
| **切換分支** | `git checkout <分支名稱>` |
| **建立並切換新分支** | `git checkout -b <新分支名稱>` |
| **下載遠端最新程式碼** | `git pull origin <分支名稱>` |
| **查看檔案修改狀態** | `git status` |
| **暫存所有修改** | `git add .` |
| **提交版本紀錄** | `git commit -m "你的更新說明"` |
| **推送到遠端分支** | `git push origin <分支名稱>` |