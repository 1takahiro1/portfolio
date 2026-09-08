"""背景を変更した後に python3 scripts/embed-ripple.py を実行。"""
from pathlib import Path
import base64
root = Path(__file__).resolve().parent.parent
encoded = base64.b64encode((root / 'images/home/ripple-grid.png').read_bytes()).decode()
(root / 'js/ripple-texture.js').write_text(
    '// file:// 用の埋め込みテクスチャ。scripts/embed-ripple.py で生成。\n'
    f'window.portfolioRippleTexture = "data:image/png;base64,{encoded}";\n'
)
