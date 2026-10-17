#!/usr/bin/env python3
# Local review server for Mill: serves the repo root and applies the root _headers block for /mill/* (CSP etc.), like Pages.
import http.server, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
def rules():
    out, cur = [], None
    for line in open(os.path.join(ROOT, '_headers')):
        if not line.strip(): continue
        if not line[0].isspace(): cur = (line.strip().rstrip('*'), []); out.append(cur)
        else: k, v = line.strip().split(':', 1); cur[1].append((k.strip(), v.strip()))
    return out
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def end_headers(s):
        for pre, hs in rules():
            if s.path.startswith(pre):
                for k, v in hs: s.send_header(k, v)
        s.send_header('Cache-Control', 'no-store'); super().end_headers()
    def log_message(s, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 8791), H).serve_forever()
