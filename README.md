# ポートフォリオサイト

参照: https://v7.usestate.org/

HTML・CSS・JavaScriptで構成したローカル再現版です。ビルドやnpmパッケージのインストールは不要です。

## 表示方法

`index.html` をダブルクリックすると、CSS・画像・動画を含めて表示できます。
直接開く場合も、花のWebGLアニメーションとマウス操作が有効です。ページ移動は通常のリンクになります。滑らかなページ遷移も含めて確認するには、このフォルダをターミナルで開き、次を実行してください。

```sh
python3 server.py
```

ブラウザで http://localhost:4173/ を開きます。停止はターミナルで `Control + C`。
VS Code の Live Server でも表示できます。ファイルを移動する際は、CSS・画像などのフォルダも一緒に移動してください。

## 編集するファイル

| 変更内容 | ファイル |
| --- | --- |
| トップの見出し・作品紹介・自己紹介 | `index.html` |
| 詳しいプロフィール・受賞歴・SNS | `about/index.html` |
| 作品一覧とプレビュー動画 | `selected/index.html` |
| 作品詳細 | `selected/作品名/index.html` |
| 実験作品の一覧 | `archive/index.html` |
| 配色・フォント・追加スタイル | `css/custom.css` |
| 全体のレイアウト・レスポンシブ指定 | `css/style.css` |
| 見出しのアニメーション準備 | `js/app.js` |
| 画面遷移・WebGL・スクロール演出 | `js/animation-runtime.js` |

見出しは `data-page-title` / `data-page-title02` / `data-footer-type` が付いた要素の文字列を変更するだけです。文字単位の要素はJavaScriptが生成します。

ロゴ名・メールアドレス・フッターは各HTMLにあります。エディタのフォルダ内検索で `Takahiro.Y`、`t.design@linkrec.net` を一括置換すると便利です。メールは表示文字と `mailto:` の両方を変更してください。トップの読み上げ用テキスト `.u-sr` も同じ内容に変更してください。

作品の追加は `<article>` 一式を複製し、タイトル・説明・`src`・`href` を更新します。作品詳細を追加する場合は既存の詳細フォルダを複製します。Nextリンクも更新してください。

## 画像・動画

- `images/home/mv-image.webp`: PCの花の背景
- `images/home/mv-image-mono.webp`: 同じ背景のモノクロ版
- `images/home/mv-image-sp.webp` / `mv-image-mono-sp.webp`: スマートフォン用
- `images/home/`: 作品サムネイル、Archive背景
- `images/about/`: プロフィール用画像
- `images/selected/`: 作品詳細の画像
- `video/`: ShowReel、作品プレビュー
- `fonts/`: ローカルフォント

花のWebGL効果にはカラー版・モノクロ版を使用します。背景を差し替える場合は、PCとスマートフォンそれぞれの2枚を同じ構図・寸法にそろえてください。

画像・動画・フォントはローカルに保存してあり、表示時に参照サイトから読み込む必要はありません。外部作品サイト・SNS・メールのリンク先は参照サイトの内容を残しています。

## 再現方法と素材の扱い

見た目と動きを合わせるため、参照サイトの配信済みHTML・CSS・アニメーションJavaScriptを基に、静的なファイル構成に整理しています。`animation-runtime.js` はGSAP・Three.js・Lenis・Barba等を含む配信済みバンドルで、元のコメントを保持しています。通常の内容変更はHTMLとCSSだけで行えます。

参照サイトのアクセス解析スクリプトと元サイト向けOGP・canonicalは除去しています。公開前に文章・実績・リンク・素材を自分のものへ差し替え、使用する画像・動画・フォント・コードの利用条件と権利を確認してください。参照素材の所有権・再配布許諾を付与するものではありません。

## 日本語表示

全10ページの見出し・説明・ナビゲーションを日本語化し、表示名を `Takahiro.Y` に変更しています。作品名・技術名・受賞団体名などの固有名詞、画像と動画に含まれる文字は元の表記を保持しています。日本語の文字組み調整は `css/custom.css` の「日本語の文字組み」にあります。

## 花のアニメーション用画像を変更する場合

直接HTMLを開く場合にも動くよう、花の4枚の画像は `js/flower-textures.js` に埋め込んでいます。`images/home/` の該当画像を差し替えたら、`python3 scripts/embed-flower.py` を実行して埋め込みデータを更新してください。マウスに反応する流体シミュレーションは、ローカルサーバー経由と直接オープンの両方で同じ実装を使用します。

### FVの波紋（2026-09-07）
- 背景画像: `images/home/ripple-grid.png`
- 動き: `js/ripple-hero.js` 冒頭の `SETTINGS` で強さ・周期・マウスの反応間隔を調整。
- 見出し: 従来どおり `index.html` 内の文字を編集。
- 背景を差し替えた後は `python3 scripts/embed-ripple.py` を実行すると、HTMLを直接開く場合の埋め込み画像も更新。
- 雫の落下と波紋の自動再生、ポインター・タップによる波紋に対応。画面外・非表示タブでは描画を停止。OSの「視差効果を減らす」設定時は静止画表示。
- WebGLが使えない場合はCSSの背景画像を表示。

### 制作実績（PDFから反映）
トップの `index.html` と `selected/index.html` に同じ7件を掲載しています。
掲載順は「ランキング刷新 → オンボーディング → デザインシステム → バナー・LP・Webサイト → 楽天ステイ → 3DKフィールド → Voicom」です。
詳細ページは `selected/palmu-ranking/`、`selected/palmu-onboarding/`、`selected/design-system/`、`selected/banners-web/`、`selected/rakuten-stay/`、`selected/3dk-field/`、`selected/voicom/` の各 `index.html` です。
作品名・説明・担当領域はHTMLで編集できます。制作資料は元PDFを画像化した `images/works/pdf-XX.jpg` を掲載し、クリックで拡大表示できます。資料画像内の文字を変える場合は画像の差し替えが必要です。

### 私について
`about/index.html` にプロフィール、職歴、学歴・受賞歴、スキル、資格を記載しています。本文はHTMLで編集できます。
写真は `images/about/takahiro-yoshino.jpg`（履歴書から抽出した本人写真）、表示調整は `css/custom.css` の「プロフィール」以下です。
日本語タイトルは文字単位に分割せず、通常の見出しとして表示します。
