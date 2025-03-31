# ✨ Capto

> スタイリッシュなディレクトリスナップショットをPDFで生成するツール

Captoはディレクトリ構造とファイル内容を美しいPDFドキュメントにキャプチャします。テキストファイルだけでなく画像ファイルも表示可能で、`.gitignore` ルールを尊重し、バイナリファイルを自動的に検出します。マルチモーダルLLMで読み込むのに最適な形式で出力します。

## 📦 インストール

npmを使ってグローバルにインストール:

```bash
npm install -g capto
```

または、インストールせずに一時的に使用:

```bash
npx capto <ディレクトリ>
```

## 🚀 使い方

### 基本的な使い方

トップレベルのファイルのみを処理:

```bash
capto ./my-project -o snapshot.pdf
```

再帰的にサブディレクトリを含めて処理:

```bash
capto ./my-project -r -o snapshot.pdf
```

### その他の例

追加の無視パターンを指定:

```bash
capto ./my-project -i '*.log' '*.tmp' -o snapshot.pdf
```

フォントサイズとタイトルを指定:

```bash
capto ./my-project -f 12 -t "Project Snapshot" -o snapshot.pdf
```

## 🎯 機能

- エレガントなディレクトリツリー表示
- テキストファイル内容を行番号付きで表示
- 画像ファイルをPDF内に直接表示
- 再帰的または非再帰的なスキャンモード
- `.gitignore` ルールの自動適用
- バイナリファイルの自動検出
- 様々なテキストエンコーディングに対応
- マルチモーダルLLMでの解析に最適化
- カスタマイズ可能なPDFデザイン

## 🛠️ コマンドラインオプション

```bash
使用方法: capto <ディレクトリ> [オプション]

引数:
  directory              対象ディレクトリ

オプション:
  -o, --output <file>    出力PDFファイル名 (デフォルト: "snapshot.pdf")
  -i, --ignore <patterns...>  追加の無視パターン
  -f, --fontsize <size>  フォントサイズ (デフォルト: "10")
  -t, --title <title>    PDFのタイトル (デフォルト: "Directory Snapshot")
  -r, --recursive        サブディレクトリを再帰的に処理する
  -V, --version          バージョン情報を表示
  -h, --help             ヘルプを表示
```

## ⚙️ 開発方法

### ローカルでのセットアップ

リポジトリをクローンして依存関係をインストール:

```bash
git clone https://github.com/yourusername/capto.git
cd capto
npm install
npm run build
npm link
```

### ローカル実行

```bash
npm start -- <ディレクトリ> [オプション]
```

## 📄 ライセンス

MIT License
