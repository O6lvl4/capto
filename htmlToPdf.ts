import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';
import { CollectedFile } from './fileCollector';
import { FileContentReader } from './fileContentReader';

/**
 * HTML→PDF変換オプション
 */
export interface HTMLToPDFOptions {
  title: string;
  fontSize: number;
  outputFile: string;
  isRecursive: boolean;
}

/**
 * PuppeteerでHTML→PDFに変換するクラス
 */
export class HTMLToPDFGenerator {
  private options: HTMLToPDFOptions;
  private baseDir: string;
  
  /**
   * コンストラクタ
   * @param baseDir ベースディレクトリ
   * @param options PDF変換オプション
   */
  constructor(baseDir: string, options: HTMLToPDFOptions) {
    this.baseDir = baseDir;
    this.options = options;
  }
  
  /**
   * HTMLからPDFを生成
   * @param files 収集されたファイル
   * @param treeLines ディレクトリ構造
   * @returns 出力ファイルパス
   */
  public async generatePDF(files: CollectedFile[], treeLines: string[]): Promise<string> {
    console.log('📄 Generating HTML content...');
    
    // ファイルタイプごとのカウント
    const textCount = files.filter(f => f.type === 'text').length;
    const imageCount = files.filter(f => f.type === 'image').length;
    const binaryCount = files.filter(f => f.type === 'binary').length;
    
    // HTMLの生成
    const htmlContent = this._generateHTML(files, treeLines, {
      textCount,
      imageCount,
      binaryCount
    });
    
    // 一時HTMLファイルに保存（オプション）
    const htmlPath = path.join(path.dirname(this.options.outputFile), 'temp_snapshot.html');
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    
    console.log('🔄 Converting HTML to PDF with Puppeteer...');
    
    // PuppeteerでPDF生成
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // HTMLコンテンツを設定
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // PDFに変換して保存
    await page.pdf({
      path: this.options.outputFile,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1.5cm',
        right: '1.5cm',
        bottom: '1.5cm',
        left: '1.5cm'
      }
    });
    
    // ブラウザを閉じる
    await browser.close();
    
    // 一時HTMLファイルを削除（オプション）
    try {
      fs.unlinkSync(htmlPath);
    } catch (e) {
      // 削除に失敗しても続行
    }
    
    console.log(`✨ PDF created: ${this.options.outputFile}`);
    console.log(`   Contains: ${textCount} text files, ${imageCount} images, ${binaryCount} binary files`);
    
    return this.options.outputFile;
  }
  
  /**
   * HTMLコンテンツを生成
   * @param files 収集されたファイル
   * @param treeLines ディレクトリ構造
   * @param stats ファイル統計情報
   * @returns HTML文字列
   */
  private _generateHTML(
    files: CollectedFile[], 
    treeLines: string[], 
    stats: { textCount: number; imageCount: number; binaryCount: number }
  ): string {
    const fileContentsHTML = this._generateFileContentsHTML(files);
    const directoryStructureHTML = this._generateDirectoryStructureHTML(treeLines);
    
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${this._escapeHTML(this.options.title)}</title>
  <style>
    @page {
      size: A4;
      margin: 1.5cm;
    }
    body {
      font-family: "Hiragino Kaku Gothic Pro", "ヒラギノ角ゴ Pro W3", "Meiryo", "メイリオ", "MS PGothic", "MS Pゴシック", sans-serif;
      margin: 0;
      padding: 0;
      line-height: 1.5;
      color: #333;
    }
    h1, h2, h3 {
      font-weight: 600;
      margin-top: 1em;
      color: #1a1a1a;
    }
    h1 {
      font-size: ${this.options.fontSize + 14}px;
      text-align: center;
      margin-bottom: 1.5em;
      border-bottom: 1px solid #ddd;
      padding-bottom: 0.3em;
    }
    h2 {
      font-size: ${this.options.fontSize + 8}px;
      border-left: 5px solid #4a89dc;
      padding-left: 10px;
      margin: 1.5em 0 1em 0;
    }
    h3 {
      font-size: ${this.options.fontSize + 4}px;
      border-bottom: 1px dotted #aaa;
      margin: 1.5em 0 0.7em 0;
    }
    pre {
      font-family: "Courier New", Consolas, monospace;
      background-color: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 3px;
      padding: 10px;
      overflow-x: auto;
      font-size: ${this.options.fontSize}px;
      white-space: pre-wrap;
      word-wrap: break-word;
      page-break-inside: avoid;
    }
    .file-path {
      font-weight: bold;
      color: #4a89dc;
      margin-top: 1.2em;
    }
    .directory-tree {
      white-space: pre;
      font-family: monospace;
    }
    .meta-info {
      text-align: center;
      color: #777;
      margin-bottom: 2em;
    }
    .section {
      margin-bottom: 2em;
      page-break-before: always;
    }
    .cover {
      text-align: center;
      height: 80vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      page-break-after: always;
    }
    .stats {
      display: inline-block;
      text-align: left;
      margin: 2em auto;
      padding: 1em;
      background: #f5f5f5;
      border-radius: 5px;
    }
    .stats table {
      border-collapse: collapse;
    }
    .stats td, .stats th {
      padding: 5px 15px;
      text-align: left;
    }
    .line-number {
      display: inline-block;
      width: 2.5em;
      color: #999;
      text-align: right;
      margin-right: 0.5em;
    }
    .file-content-line {
      display: block;
    }
    .binary-notice {
      color: #777;
      font-style: italic;
    }
    .encoding-info {
      font-size: 90%;
      color: #777;
      margin-bottom: 5px;
    }
    .image-container {
      text-align: center;
      margin: 1em 0;
      page-break-inside: avoid;
    }
    .image-container img {
      max-width: 100%;
      max-height: 800px;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${this._escapeHTML(this.options.title)}</h1>
    <p class="meta-info">
      ディレクトリ: ${this._escapeHTML(this.baseDir)}<br>
      生成日時: ${new Date().toLocaleString('ja-JP')}<br>
    </p>
    <div class="stats">
      <table>
        <tr>
          <td>ファイル総数:</td>
          <td>${files.length}個</td>
        </tr>
        <tr>
          <td>テキストファイル:</td>
          <td>${stats.textCount}個</td>
        </tr>
        <tr>
          <td>画像ファイル:</td>
          <td>${stats.imageCount}個</td>
        </tr>
        <tr>
          <td>バイナリファイル:</td>
          <td>${stats.binaryCount}個</td>
        </tr>
        <tr>
          <td>スキャンモード:</td>
          <td>${this.options.isRecursive ? '再帰的（サブディレクトリ含む）' : 'トップレベルのみ'}</td>
        </tr>
      </table>
    </div>
  </div>
  
  <div class="section">
    <h2>ディレクトリ構造</h2>
    ${directoryStructureHTML}
  </div>
  
  <div class="section">
    <h2>ファイル内容</h2>
    ${fileContentsHTML}
  </div>
</body>
</html>
    `;
  }
  
  /**
   * ディレクトリ構造のHTML生成
   * @param treeLines ディレクトリ構造の配列
   * @returns HTMLコンテンツ
   */
  private _generateDirectoryStructureHTML(treeLines: string[]): string {
    const escapedLines = treeLines.map(line => this._escapeHTML(line));
    return `<pre class="directory-tree">${escapedLines.join('\n')}</pre>`;
  }
  
  /**
   * ファイル内容のHTML生成
   * @param files 収集されたファイル
   * @returns HTMLコンテンツ
   */
  private _generateFileContentsHTML(files: CollectedFile[]): string {
    let html = '';
    
    for (const file of files) {
      html += `<div class="file-path">/${this._escapeHTML(file.relativePath)}:</div>`;
      
      if (file.type === 'image') {
        // 画像ファイルの場合
        html += this._generateImageHTML(file);
      } else if (file.type === 'binary') {
        // バイナリファイルの場合
        html += `<p class="binary-notice">Binary file (content not displayed)</p>`;
      } else {
        // テキストファイルの場合
        html += this._generateTextFileHTML(file);
      }
    }
    
    return html;
  }
  
  /**
   * テキストファイル内容のHTML生成
   * @param file ファイル情報
   * @returns HTMLコンテンツ
   */
  private _generateTextFileHTML(file: CollectedFile): string {
    const { content, error, encoding } = FileContentReader.getFileContent(file.path);
    
    if (error) {
      return `<p class="binary-notice">${this._escapeHTML(error)}</p>`;
    }
    
    // エンコーディング情報
    let html = '';
    if (encoding) {
      html += `<div class="encoding-info">Encoding: ${encoding}</div>`;
    }
    
    // ファイル内容
    const contentLines = content.split('\n');
    
    // ファイルが長すぎる場合は最初の数百行だけ表示
    const maxLines = 500;
    const displayLines = contentLines.length > maxLines 
      ? contentLines.slice(0, maxLines) 
      : contentLines;
    
    html += '<pre>';
    
    for (let i = 0; i < displayLines.length; i++) {
      const lineNumber = i + 1;
      const line = displayLines[i];
      
      // 行が長すぎる場合は切り詰める
      const maxLineLength = 300;
      const displayLine = line.length > maxLineLength 
        ? line.substring(0, maxLineLength) + '...' 
        : line;
      
      html += `<span class="file-content-line"><span class="line-number">${lineNumber}</span>${this._escapeHTML(displayLine)}</span>\n`;
    }
    
    // ファイルが切り詰められた場合はメッセージを表示
    if (contentLines.length > maxLines) {
      html += `\n\n... (${contentLines.length - maxLines} more lines)`;
    }
    
    html += '</pre>';
    return html;
  }
  
  /**
   * 画像ファイルのHTML生成
   * @param file ファイル情報
   * @returns HTMLコンテンツ
   */
  private _generateImageHTML(file: CollectedFile): string {
    // データURLに変換して埋め込む
    try {
      const fileContent = fs.readFileSync(file.path);
      const base64 = fileContent.toString('base64');
      const mimeType = this._getMimeType(file.path);
      const dataUrl = `data:${mimeType};base64,${base64}`;
      
      return `
        <div class="image-container">
          <p>Image file: ${this._escapeHTML(path.basename(file.path))}</p>
          <img src="${dataUrl}" alt="${this._escapeHTML(path.basename(file.path))}" />
        </div>
      `;
    } catch (error) {
      return `<p class="binary-notice">Failed to load image: ${this._escapeHTML(error instanceof Error ? error.message : String(error))}</p>`;
    }
  }
  
  /**
   * ファイル拡張子からMIMEタイプを取得
   * @param filePath ファイルパス
   * @returns MIMEタイプ
   */
  private _getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
  
  /**
   * HTMLエスケープ処理
   * @param text 元のテキスト
   * @returns エスケープされたテキスト
   */
  private _escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
