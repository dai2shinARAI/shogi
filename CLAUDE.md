# CLAUDE.md

このファイルはClaude Codeがこのリポジトリで作業する際のガイドラインです。

## プロジェクト概要

Reactで実装した将棋アプリ。`src/App.jsx` 1ファイルに全ロジックが含まれている。

## アーキテクチャ

- **`src/App.jsx`** — 唯一のソースファイル。以下のセクションで構成される：
  - 駒定義 (`PIECE_DATA`, `PIECE_VALUE` など)
  - 盤面初期化 (`initBoard`)
  - 移動ロジック (`getMoves`, `getLegalMoves`, `canDrop`)
  - 王手判定 (`isInCheck`)
  - 定跡 (`OPENING_BOOK`, `getBookMove`) — 先手の戦型に応じた分岐あり（最大10手）
  - AIロジック (`evaluate`, `negamax`, `cpuChooseMove`) — 5段階レベル対応
  - CPUレベル設定 (`CPU_LEVELS`) — 入門/初級/中級/上級/最強
  - Reactコンポーネント（UI） — タイトル画面でレベル選択

## デプロイ

- **Vercel** を利用してデプロイしている

## コーディング規則

- 日本語でコメント・回答すること
- 単一ファイル構成を維持する（新ファイルを安易に作らない）
- 駒のownerは `0` = 先手（下側）、`1` = 後手（上側・AI）
- 盤面は `board[row][col]` の9×9配列（row=0が上、row=8が下）
- 駒の移動方向: `dir = owner===0 ? -1 : 1`（先手は上方向へ進む）
