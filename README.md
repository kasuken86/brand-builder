<div align="center">
<img width="1329" height="871" alt="GHBanner" src="img1.png" />
</div>

# Brand Builder

あなたの製品説明を入力するだけで、**看板・新聞・SNS** の視覚化を瞬時に生成するAIブランドビルダーです。

Google AI Studio（Gemini）で作成されたReactアプリです。

![Brand Builder](https://via.placeholder.com/800x400/141414/FFFFFF?text=Brand+Builder+Demo) <!-- 後で実際のスクリーンショットを追加推奨 -->
<div align="center">
<img width="638" height="1049" alt="GHBanner" src="img2.png" />
</div>

## ✨ 主な機能

- **製品説明 → 自動ブランド生成**
- **Nano-Banana / Proモデル** 対応（高品質画像生成）
- **一括ダウンロード**（ZIP形式）
- 看板（Billboard）、新聞広告（Newspaper）、SNS画像（Social）の3メディア展開
- ロゴ自動生成

## 🚀 ローカルで動かす方法

### 必要環境
- Node.js（v18以上推奨）

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/kasuken86/brand-builder.git
cd brand-builder

# 2. 依存関係インストール
npm install

# 3. .envファイル作成（.env.exampleをコピー）
cp .env.example .env
# → .envを開いて GEMINI_API_KEY に自分のAPIキーを設定

# 4. 開発サーバー起動
npm run dev

```
→ http://localhost:3000 で開きます。
🛠 技術スタック

Frontend: React 19 + TypeScript + Vite
UI: Tailwind CSS + Motion（アニメーション）
AI: Google Gemini（@google/genai）
画像生成: Nano-Banana / Gemini 3 Pro Image など

📝 注意事項

Proモデル（Nano-Banana Proなど）を使う場合は、Google AI Studioで有料APIキーを設定してください。
APIキーは絶対にGitHubにコミットしないでください（.envは.gitignore済み）。

🔗 関連リンク

[Google AI Studio](https://aistudio.google.com/)

[Gemini API ドキュメント](https://ai.google.dev/gemini-api/docs)


Made with by Kasuya Kenichi (@kasuken86)
