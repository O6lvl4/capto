import * as fs from 'fs';
import * as path from 'path';
import { isBinaryFileSync } from 'isbinaryfile';
import iconv from 'iconv-lite';
import chardet from 'chardet';

/**
 * ファイル内容とエラー情報を保持する型
 */
export interface FileContentResult {
  content: string;
  error?: string;
  encoding?: string;
}

/**
 * ファイルの内容を読み取るクラス
 */
export class FileContentReader {
  /**
   * テキストファイルのエンコーディングを検出して内容を取得
   * @param filePath ファイルパス
   * @returns ファイル内容とエラー情報
   */
  public static getFileContent(filePath: string): FileContentResult {
    try {
      // バイナリファイルチェック
      if (isBinaryFileSync(filePath)) {
        return { 
          content: '', 
          error: 'Binary file (content not displayed)' 
        };
      }

      // まずファイルをバッファとして読み込む
      const buffer = fs.readFileSync(filePath);
      
      // エンコーディング検出
      const detected = chardet.detect(buffer);
      const encoding = detected || 'utf8';
      
      // 検出したエンコーディングでデコード
      let content = iconv.decode(buffer, encoding);
      
      // BOM削除
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      
      // エンコーディング情報をログに出力（デバッグ用）
      console.log(`File: ${path.basename(filePath)}, Detected encoding: ${encoding}`);
      
      // 制御文字や非表示文字が多い場合もスキップする
      const controlChars = content.match(/[\x00-\x08\x0E-\x1F\x7F-\x9F]/g);
      if (controlChars && controlChars.length > content.length * 0.1) {
        return { 
          content: '', 
          error: 'File contains control characters (content not displayed)',
          encoding 
        };
      }

      return { content, encoding };
    } catch (error) {
      return { 
        content: '', 
        error: `Reading error: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * ファイルが制御文字をどの程度含んでいるか診断する
   * @param content ファイル内容
   * @returns 制御文字の割合と情報
   */
  public static diagnoseControlCharacters(content: string): { ratio: number, count: number, total: number } {
    const controlChars = content.match(/[\x00-\x08\x0E-\x1F\x7F-\x9F]/g);
    const count = controlChars ? controlChars.length : 0;
    const total = content.length;
    const ratio = total > 0 ? count / total : 0;
    
    return { ratio, count, total };
  }
}
