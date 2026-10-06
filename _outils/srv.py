#!/usr/bin/env python3
"""Serveur local a URL propres pour simu.akapa.fr : /x -> x.html, 404.html sinon.
Usage : python3 srv.py [port] [racine]"""
import http.server, os, sys
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
root = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        p = self.path.split('?')[0].split('#')[0]
        if p == '/': p = '/index.html'
        f = p.lstrip('/')
        if f.startswith('_outils'): f = 'page-inexistante'   # comme en ligne : dossier non servi
        if not os.path.isfile(f) and os.path.isfile(f + '.html'):
            self.path = '/' + f + '.html'
        elif not os.path.isfile(f):
            self.send_response(404); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.end_headers()
            self.wfile.write(open('404.html', 'rb').read()); return
        return super().do_GET()
http.server.ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
