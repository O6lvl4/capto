import * as fs from 'fs';
import { execSync } from 'child_process';

/**
 * フォント情報の型定義
 */
export interface FontPaths {
  regular: string;
  bold: string;
}

/**
 * 日本語フォントを管理するクラス
 */
export class FontManager {
  private customFontPath?: string;
  
  /**
   * コンストラクタ
   * @param customFontPath カスタムフォントパス（任意）
   */
  constructor(customFontPath?: string) {
    this.customFontPath = customFontPath;
  }
  
  /**
   * 日本語フォントを検索してパスを返す
   * @returns 日本語フォントのパス情報
   */
  public findJapaneseFonts(): FontPaths {
    const fontPaths: FontPaths = {
      regular: '',
      bold: ''
    };
    
    // カスタムフォントが指定されている場合
    if (this.customFontPath && fs.existsSync(this.customFontPath)) {
      fontPaths.regular = this.customFontPath;
      fontPaths.bold = this.customFontPath; // 同じフォントを使用
      console.log(`Using specified font: ${this.customFontPath}`);
      return fontPaths;
    }
    
    // OSに基づいて一般的な日本語フォントの場所を探す
    try {
      const platform = process.platform;
      
      if (platform === 'darwin') {
        this._findMacOSFonts(fontPaths);
      } else if (platform === 'win32') {
        this._findWindowsFonts(fontPaths);
      } else if (platform === 'linux') {
        this._findLinuxFonts(fontPaths);
      }
      
    } catch (error) {
      console.error('Error finding Japanese fonts:', error);
    }
    
    // 日本語フォントが見つからない場合はフォールバックフォントを使用
    if (!fontPaths.regular) {
      console.warn('No Japanese fonts found, using fallback fonts');
      fontPaths.regular = 'Courier';
      fontPaths.bold = 'Helvetica-Bold';
    }
    
    return fontPaths;
  }
  
  /**
   * macOS用のフォント検索
   * @param fontPaths フォントパス情報
   */
  private _findMacOSFonts(fontPaths: FontPaths): void {
    const macFonts = {
      regular: [
        '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',
        '/Library/Fonts/Arial Unicode.ttf',
        '/System/Library/Fonts/AppleGothic.ttf',
        '/Library/Fonts/NotoSansCJKjp-Regular.otf',
        '/System/Library/Fonts/AppleSDGothicNeo.ttc',
        '/Library/Fonts/ヒラギノ明朝 ProN W3.ttc',
        '/System/Library/Fonts/PingFang.ttc'
      ],
      bold: [
        '/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc',
        '/Library/Fonts/NotoSansCJKjp-Bold.otf',
        '/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc',
        '/Library/Fonts/ヒラギノ明朝 ProN W6.ttc'
      ]
    };
    
    for (const font of macFonts.regular) {
      if (fs.existsSync(font)) {
        fontPaths.regular = font;
        console.log(`Found Japanese regular font: ${font}`);
        break;
      }
    }
    
    for (const font of macFonts.bold) {
      if (fs.existsSync(font)) {
        fontPaths.bold = font;
        console.log(`Found Japanese bold font: ${font}`);
        break;
      }
    }
    
    // fc-list コマンドでも検索（macOSでHomebrewなどでインストールされている場合）
    if (!fontPaths.regular) {
      this._findFontsByFcList(fontPaths);
    }
    
    // ボールドフォントが見つからない場合は通常フォントを使用
    if (!fontPaths.bold && fontPaths.regular) {
      fontPaths.bold = fontPaths.regular;
    }
  }
  
  /**
   * Windows用のフォント検索
   * @param fontPaths フォントパス情報
   */
  private _findWindowsFonts(fontPaths: FontPaths): void {
    const winFonts = {
      regular: [
        'C:\\Windows\\Fonts\\msgothic.ttc',
        'C:\\Windows\\Fonts\\YuGothR.ttc',
        'C:\\Windows\\Fonts\\meiryo.ttc',
        'C:\\Windows\\Fonts\\msmincho.ttc',
        'C:\\Windows\\Fonts\\yugothic.ttf',
        'C:\\Windows\\Fonts\\meiryou.ttc'
      ],
      bold: [
        'C:\\Windows\\Fonts\\YuGothB.ttc',
        'C:\\Windows\\Fonts\\meiryob.ttc',
        // フォールバックオプション
        'C:\\Windows\\Fonts\\msgothic.ttc'
      ]
    };
    
    for (const font of winFonts.regular) {
      if (fs.existsSync(font)) {
        fontPaths.regular = font;
        console.log(`Found Japanese regular font: ${font}`);
        break;
      }
    }
    
    for (const font of winFonts.bold) {
      if (fs.existsSync(font)) {
        fontPaths.bold = font;
        console.log(`Found Japanese bold font: ${font}`);
        break;
      }
    }
    
    // ボールドフォントが見つからない場合は通常フォントを使用
    if (!fontPaths.bold && fontPaths.regular) {
      fontPaths.bold = fontPaths.regular;
    }
  }
  
  /**
   * Linux用のフォント検索
   * @param fontPaths フォントパス情報
   */
  private _findLinuxFonts(fontPaths: FontPaths): void {
    const linuxFonts = {
      regular: [
        '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/truetype/fonts-japanese-gothic.ttf',
        '/usr/share/fonts/opentype/ipaexfont-gothic/ipaexg.ttf',
        '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/google-noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/noto/NotoSansCJK-Regular.ttc'
      ],
      bold: [
        '/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
        '/usr/share/fonts/opentype/ipaexfont-gothic/ipaexg.ttf',
        '/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc',
        '/usr/share/fonts/google-noto/NotoSansCJK-Bold.ttc',
        '/usr/share/fonts/noto/NotoSansCJK-Bold.ttc'
      ]
    };
    
    for (const font of linuxFonts.regular) {
      if (fs.existsSync(font)) {
        fontPaths.regular = font;
        console.log(`Found Japanese regular font: ${font}`);
        break;
      }
    }
    
    for (const font of linuxFonts.bold) {
      if (fs.existsSync(font)) {
        fontPaths.bold = font;
        console.log(`Found Japanese bold font: ${font}`);
        break;
      }
    }
    
    // fcリストから日本語フォントを検索
    if (!fontPaths.regular) {
      this._findFontsByFcList(fontPaths);
    }
    
    // ボールドフォントが見つからない場合は通常フォントを使用
    if (!fontPaths.bold && fontPaths.regular) {
      fontPaths.bold = fontPaths.regular;
    }
  }
  
  /**
   * fc-listコマンドを使用してフォントを検索
   * @param fontPaths フォントパス情報
   */
  private _findFontsByFcList(fontPaths: FontPaths): void {
    try {
      // 日本語フォント検索
      const fclistOutput = execSync('fc-list :lang=ja -f "%{file}\n"').toString().trim();
      if (fclistOutput && fclistOutput.length > 0) {
        const fonts = fclistOutput.split('\n');
        if (fonts.length > 0) {
          fontPaths.regular = fonts[0];
          console.log(`Found Japanese font via fc-list: ${fonts[0]}`);
          
          // ボールドフォント検索（あれば）
          try {
            const fclistBoldOutput = execSync('fc-list :lang=ja:weight=bold -f "%{file}\n"').toString().trim();
            if (fclistBoldOutput && fclistBoldOutput.length > 0) {
              const boldFonts = fclistBoldOutput.split('\n');
              if (boldFonts.length > 0) {
                fontPaths.bold = boldFonts[0];
                console.log(`Found Japanese bold font via fc-list: ${boldFonts[0]}`);
              }
            }
          } catch (e) {
            // ボールド検索に失敗した場合は無視
            console.log('Failed to find bold fonts via fc-list, using regular font instead');
            fontPaths.bold = fontPaths.regular;
          }
        }
      }
    } catch (e) {
      console.log('fc-list command failed, continuing with search');
    }
  }
}
