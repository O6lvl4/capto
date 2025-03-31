import * as fs from 'fs';
import * as path from 'path';
import ignore, { Ignore } from 'ignore';
import { isBinaryFileSync } from 'isbinaryfile';

/**
 * 収集されたファイル情報の型定義
 */
export interface CollectedFile {
  path: string;
  type: 'text' | 'image' | 'binary';
  relativePath: string;
}

/**
 * .gitignore および追加の無視パターンを取得するクラス
 */
export class IgnoreRulesManager {
  private ig: Ignore;

  /**
   * コンストラクタ
   * @param baseDir ベースディレクトリパス
   * @param extraIgnores 追加の無視パターン
   */
  constructor(baseDir: string, extraIgnores: string[] = []) {
    this.ig = ignore();

    // デフォルトで .git フォルダは無視
    this.ig.add('.git');

    // .gitignore があればルールに追加
    const ignoreFilePath = path.join(baseDir, '.gitignore');
    if (fs.existsSync(ignoreFilePath)) {
      const gitignoreContent = fs.readFileSync(ignoreFilePath, 'utf8');
      this.ig = this.ig.add(gitignoreContent);
    }

    // 追加の無視パターン
    if (extraIgnores.length > 0) {
      this.ig = this.ig.add(extraIgnores);
    }
  }

  /**
   * パスが無視対象かどうかを判定
   * @param relativePath 相対パス
   * @returns 無視すべきならtrue
   */
  public ignores(relativePath: string): boolean {
    return this.ig.ignores(relativePath);
  }
}

/**
 * ファイルを収集するクラス
 */
export class FileCollector {
  private ignoreManager: IgnoreRulesManager;
  private baseDir: string;
  private isRecursive: boolean;

  /**
   * コンストラクタ
   * @param baseDir ベースディレクトリパス
   * @param ignoreManager 無視ルールマネージャ
   * @param isRecursive サブディレクトリを再帰的に処理するか
   */
  constructor(baseDir: string, ignoreManager: IgnoreRulesManager, isRecursive: boolean) {
    this.baseDir = baseDir;
    this.ignoreManager = ignoreManager;
    this.isRecursive = isRecursive;
  }

  /**
   * ディレクトリ内のファイルを取得（無視ルール適用済み）
   * @returns 収集されたファイル情報の配列
   */
  public collectFiles(): CollectedFile[] {
    const result: CollectedFile[] = [];
    this._collectFilesRecursive(this.baseDir, result);
    return result;
  }

  /**
   * ディレクトリ構造を配列として取得
   * @returns ディレクトリ構造の配列
   */
  public getDirectoryStructure(): string[] {
    const treeLines: string[] = [];
    treeLines.push(path.basename(this.baseDir) + '/');
    this._buildTree(this.baseDir, '', 0, treeLines);
    return treeLines;
  }

  /**
   * 再帰的にファイルを収集する内部メソッド
   * @param dirPath 現在のディレクトリパス
   * @param result 結果を格納する配列
   */
  private _collectFilesRecursive(
    dirPath: string, 
    result: CollectedFile[]
  ): void {
    try {
      const files = fs.readdirSync(dirPath);

      files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        const relativePath = path.relative(this.baseDir, fullPath);

        // 無視ルールに一致したらスキップ
        if (this.ignoreManager.ignores(relativePath)) return;

        const isDirectory = fs.statSync(fullPath).isDirectory();

        if (isDirectory) {
          if (this.isRecursive) {
            this._collectFilesRecursive(fullPath, result);
          }
        } else {
          // ファイルタイプを判定
          const type = this._detectFileType(fullPath);
          result.push({ 
            path: fullPath, 
            type, 
            relativePath 
          });
        }
      });
    } catch (error) {
      console.error(`Reading error (${dirPath}):`, error);
    }
  }

  /**
   * ファイルのタイプを判定
   * @param filePath ファイルパス
   * @returns ファイルタイプ
   */
  private _detectFileType(filePath: string): 'text' | 'image' | 'binary' {
    const ext = path.extname(filePath).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.tif'];
    
    if (imageExts.includes(ext)) {
      return 'image';
    } else if (isBinaryFileSync(filePath)) {
      return 'binary';
    } else {
      return 'text';
    }
  }

  /**
   * ディレクトリ構造のツリーを構築する内部メソッド
   * @param currentDir 現在のディレクトリパス
   * @param prefix 現在の行の接頭辞
   * @param depth 再帰の深さ
   * @param treeLines 結果を格納する配列
   */
  private _buildTree(currentDir: string, prefix = '', depth = 0, treeLines: string[] = []): void {
    // 深さが1を超えて、再帰的でない場合は処理をスキップ
    if (depth > 0 && !this.isRecursive) return;

    try {
      const items = fs.readdirSync(currentDir);
      const sortedItems = items.sort((a, b) => {
        const aIsDir = fs.statSync(path.join(currentDir, a)).isDirectory();
        const bIsDir = fs.statSync(path.join(currentDir, b)).isDirectory();
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
      });

      sortedItems.forEach((item, index) => {
        const fullPath = path.join(currentDir, item);
        const relativePath = path.relative(this.baseDir, fullPath);
        const isDir = fs.statSync(fullPath).isDirectory();

        // 無視ルールに一致したらスキップ
        if (this.ignoreManager.ignores(relativePath)) return;
        
        const connector = index === sortedItems.length - 1 ? '└── ' : '├── ';
        treeLines.push(`${prefix}${connector}${item}${isDir ? '/' : ''}`);

        if (isDir && this.isRecursive) {
          const nextPrefix = prefix + (index === sortedItems.length - 1 ? '    ' : '│   ');
          this._buildTree(fullPath, nextPrefix, depth + 1, treeLines);
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      treeLines.push(`${prefix}Error: ${errorMessage}`);
    }
  }
}
