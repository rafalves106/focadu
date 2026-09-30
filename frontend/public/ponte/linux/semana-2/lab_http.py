"""Servidor HTTP de laboratório do curso de Linux (Dias 8, 9 e ponte da Semana 2). Só biblioteca
padrão. Respostas fixas, pra que a saída dos comandos no texto seja reproduzível.
Rotas: / (HTML), /api/eco (devolve os headers recebidos), /velho (301 -> /), /login (POST
usuario/senha; ana:focadu123 recebe cookie + 302 -> /painel), /painel (exige o cookie), /robots.txt."""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs

SESSAO = "a3f9c2e17b"

class Lab(BaseHTTPRequestHandler):
    server_version = "LabHTTP/1.0"
    sys_version = ""

    def version_string(self):
        return self.server_version

    def _resp(self, status, corpo=b"", tipo="text/plain; charset=utf-8", extra=()):
        self.send_response(status)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(corpo)))
        for k, v in extra:
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(corpo)

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if self.path == "/":
            self._resp(200, b"<h1>Loja Lab</h1>\n", "text/html; charset=utf-8")
        elif self.path == "/robots.txt":
            self._resp(200, b"User-agent: *\nDisallow: /painel\nDisallow: /backup/\n")
        elif self.path == "/velho":
            self._resp(301, extra=[("Location", "/")])
        elif self.path == "/api/eco":
            corpo = json.dumps({k: v for k, v in self.headers.items()}, ensure_ascii=False, indent=1).encode() + b"\n"
            self._resp(200, corpo, "application/json")
        elif self.path == "/painel":
            if f"sessao={SESSAO}" in (self.headers.get("Cookie") or ""):
                self._resp(200, b"Bem-vinda ao painel, ana\n")
            else:
                self._resp(401, b"Faca login primeiro\n")
        else:
            self._resp(404, b"Nao encontrado\n")

    def do_POST(self):
        tamanho = int(self.headers.get("Content-Length") or 0)
        dados = parse_qs(self.rfile.read(tamanho).decode())
        if self.path == "/login":
            if dados.get("usuario") == ["ana"] and dados.get("senha") == ["focadu123"]:
                self._resp(302, extra=[("Location", "/painel"), ("Set-Cookie", f"sessao={SESSAO}; HttpOnly; Path=/")])
            else:
                self._resp(401, b"Usuario ou senha invalidos\n")
        else:
            self._resp(404, b"Nao encontrado\n")

    def log_message(self, *args):
        pass

HTTPServer(("0.0.0.0", 8080), Lab).serve_forever()
