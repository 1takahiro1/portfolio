"""依存パッケージなしのローカルプレビュー: python3 server.py"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=4173)
parser.add_argument('--host', default='127.0.0.1')
args = parser.parse_args()

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # プレビュー起動元のターミナルが切断されても応答を継続する。
        pass

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).parent), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

print(f'Portfolio preview: http://{args.host}:{args.port}/', flush=True)
ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()
