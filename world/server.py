#!/usr/bin/env python3
"""Static server for the RI 3D World preview.

Sends CORS headers on every response so the app's ES modules, fonts and
images load inside the platform's preview iframe, which runs with
sandbox="allow-scripts" (opaque origin 'null' — a cross-origin context
where plain http.server would block module scripts).
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".wasm": "application/wasm",
        ".svg": "image/svg+xml",
    }

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_head(self):
        # CORS preflight support (shouldn't happen for simple GETs, but be safe)
        return super().send_head()

    def log_message(self, fmt, *args):
        pass  # quiet


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    os.chdir(ROOT)
    print(f"RI 3D World serving {ROOT} on 0.0.0.0:{PORT} (CORS enabled)", flush=True)
    Server(("0.0.0.0", PORT), Handler).serve_forever()
