import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { CollectedFile } from './fileCollector';
import { FileContentReader } from './fileContentReader';

/**
 * HTML→PDF変換オプション
 */
export interface WkHTMLToPDFOptions {
  title: string;
  fontSize: number;
  outputFile: string;
  isRecursive: boolean;
}

/**
 * wkhtmltopdfを使ってHTML→PDFに変換するクラス
 */
export class WkHTMLToPDFGenerator {
  private options: WkHTMLToPDFOptions;
  private baseDir: string;
  
  /**
   * コンストラクタ
   * @param baseDir ベースディレクトリ
   * @param options PDF変換オプション
   */
  constructor(baseDir: string, options: WkHTMLToPDFOptions) {
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
    
    // 一時HTMLファイルに保存
    const htmlPath = path.join(path.dirname(this.options.outputFile), 'temp_snapshot.html');
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    
    console.log('🔄 Converting HTML to PDF with wkhtmltopdf...');
    
    // wkhtmltopdfでPDF生成
    try {
      await this._convertToPDF(htmlPath, this.options.outputFile);
      
      // 一時HTMLファイルを削除
      try {
        fs.unlinkSync(htmlPath);
      } catch (e) {
        // 削除に失敗しても続行
      }
      
      console.log(`✨ PDF created: ${this.options.outputFile}`);
      console.log(`   Contains: ${textCount} text files, ${imageCount} images, ${binaryCount} binary files`);
      
      return this.options.outputFile;
    } catch (error) {
      console.error('Error converting to PDF:', error);
      throw error;
    }
  }
  
  /**
   * wkhtmltopdfを使ってPDFに変換
   * @param htmlPath HTMLファイルパス
   * @param pdfPath 出力PDFパス
   * @returns 完了Promise
   */
  private _convertToPDF(htmlPath: string, pdfPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // wkhtmltopdfコマンドのオプション
      const options = [
        '--encoding utf-8',
        '--enable-local-file-access',
        '--image-quality 100',
        '--margin-top 20',
        '--margin-right 20',
        '--margin-bottom 20',
        '--margin-left 20',
        '--page-size A4',
        `--title "${this.options.title}"`
      ].join(' ');
      
      const command = `wkhtmltopdf ${options} "${htmlPath}" "${pdfPath}"`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`wkhtmltopdf error: ${stderr}`);
          reject(new Error(`wkhtmltopdf failed: ${error.message}`));
          return;
        }
        
        if (stderr) {
          console.warn(`wkhtmltopdf warnings: ${stderr}`);
        }
        
        resolve();
      });
    });
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
      margin: 2cm;
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
    // イメージタグでファイルを直接参照
    // wkhtmltopdfはローカルファイルにアクセスできるため
    const imagePath = file.path.replace(/\\/g, '/');
    
    return `
      <div class="image-container">
        <p>Image file: ${this._escapeHTML(path.basename(file.path))}</p>
        <img src="file:///${imagePath}" alt="${this._escapeHTML(path.basename(file.path))}" />
      </div>
    `;
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
