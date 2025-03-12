# ItemGenerator for Minecraft Bedrock

## 概要
このビヘイビアパックは、指定した位置で定期的にアイテムを自動生成するジェネレーターシステムを実装します。

## 機能
### 1. ジェネレーターの設定
- トライアルキーを使用して任意のブロックをジェネレーターとして設定
- カスタマイズ可能なパラメータ：
  - 生成間隔（tick）
  - 生成するアイテムの種類
  - アイテムの生成数

### 2. 動作の仕組み
- 設定された間隔でアイテムを自動生成
- 複数のディメンション（オーバーワールド、ネザー、エンド）で動作

### 3. 管理機能
- クリエイティブモードでのみジェネレーターの削除が可能
- ジェネレーターブロックの保護機能
- 無効なアイテム設定の自動検知と削除

## 使用方法
1. ジェネレーターの設定
   - トライアルキーを持って対象ブロックを使用
   - 設定画面で必要なパラメータを入力

2. 設定の変更
   - 既存のジェネレーターに対して再度トライアルキーを使用

3. ジェネレーターの削除
   - クリエイティブモードでジェネレーターブロックを破壊

## 注意事項
- サバイバルモードではジェネレーターを破壊できません
- 無効なアイテムIDを設定すると自動的に削除されます
- ワールドのセーブ時にジェネレーター情報は保持されます

## 技術仕様
- 動作環境：Minecraft Bedrock Edition
- 使用API：@minecraft/server, @minecraft/server-ui
- データ保存：エンティティタグシステム
- 位置管理：バリアブロック + アーマースタンド

## ライセンス
Copyright © 2024 Kariya

本ビヘイビアパックの無断転載、改変、再配布を禁止します。
All rights reserved.

## 免責事項
- 本パックの使用により生じたいかなる損害についても、作者は一切の責任を負いません。
- アップデートによる動作の変更や停止の可能性があります。
- バグ報告は受け付けていますが、修正を保証するものではありません。 