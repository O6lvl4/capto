#!/usr/bin/env node

import * as path from 'path';
import { program } from 'commander';
import { IgnoreRulesManager, FileCollector } from './fileCollector';
import { HTMLToPDFGenerator } from './htmlToPdf';

// バージョン情報
const VERSION = '2.0.0';

// コマンドライン引数の設定
program
  .version(VERSION)
  .description('ディレクトリ構造とファイル内容をスタイリッシュなPDFに変換（日本語対応版）')
  .argument('<directory>', '対象ディレクトリ')
  .option('-o, --output <file>', '出力PDFファイル名', 'snapshot.pdf')
  .option('-i, --ignore <patterns...>', '追加の無視パターン')
  .option('-f, --fontsize <size>', 'フォントサイズ', '10')
  .option('-t, --title <title>', 'PDFのタイトル', 'Directory Snapshot')
  .option('-r, --recursive', 'サブディレクトリを再帰的に処理する')
  .option('--debug', 'デバッグ情報を表示')
  .parse(process.argv);

const options = program.opts();
const targetDir = program.args[0];
const outputFile = options.output;
const fontSize = parseInt(options.fontsize, 10);
const title = options.title;
const isRecursive = options.recursive || false;
const isDebug = options.debug || false;

/**
 * メイン処理
 */
async function main() {
  console.log(`✨ Capto v${VERSION} Running (Puppeteer HTML→PDF Version)...`);
  
  // デバッグモード
  if (isDebug) {
    console.log('Debug mode enabled');
    console.log(`Options: ${JSON.stringify({
      targetDir,
      outputFile,
      fontSize,
      title,
      isRecursive
    }, null, 2)}`);
  }
  
  // 対象ディレクトリのフルパスを取得
  const baseDir = path.resolve(targetDir);
  
  // 無視ルールマネージャーを作成
  const ignoreManager = new IgnoreRulesManager(baseDir, options.ignore || []);
  
  // ファイル収集器を作成
  const fileCollector = new FileCollector(baseDir, ignoreManager, isRecursive);
  
  try {
    // ファイルを収集
    console.log('🔍 Scanning files...');
    const files = fileCollector.collectFiles();
    
    // ファイルタイプごとのカウント
    const textCount = files.filter(f => f.type === 'text').length;
    const imageCount = files.filter(f => f.type === 'image').length;
    const binaryCount = files.filter(f => f.type === 'binary').length;
    
    console.log(`✅ Found ${files.length} files (${textCount} text, ${imageCount} images, ${binaryCount} binary)`);
    
    // ディレクトリ構造を取得
    const treeLines = fileCollector.getDirectoryStructure();
    
    // PDF生成器を作成
    const htmlToPdfGenerator = new HTMLToPDFGenerator(
      baseDir,
      {
        title,
        fontSize,
        outputFile,
        isRecursive
      }
    );
    
    // PDFを生成
    const finalPath = await htmlToPdfGenerator.generatePDF(files, treeLines);
    console.log(`   Output: ${finalPath}`);
    console.log('   日本語サポート: 有効');
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// メイン処理を実行
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
