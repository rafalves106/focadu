"""Site de laboratorio da semana 2. So biblioteca padrao. Respostas fixas.
Mantem as rotas do Dia 7 e acrescenta status, cabecalhos, cookies e sessao.

Dia 7 : GET /busca?busca=... ; /login por GET e por POST (usuario ana, senha focadu123)
Dia 8 : /ola (200), /antigo (301 -> /novo), /temporario (302 -> /novo), /novo (200),
        /admin (403), /quebrado (500), qualquer outra rota (404)
Dia 9 : /cabecalhos devolve os cabecalhos que a requisicao trouxe (inclui User-Agent);
        /protegida traz cabecalhos de seguranca; /simples nao traz nenhum
Dia 10: /cookie-fraco (sem atributos), /cookie-forte (HttpOnly, Secure, SameSite=Strict),
        /cookie-meio (so HttpOnly)
Dia 11: POST ou GET /login certo devolve o cookie de sessao `sid`; /perfil le o `sid`
Dia 12 e Projeto 2: /ola, /protegida, /simples, /cookie-fraco, /cookie-forte, /cookie-meio
"""
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

SID_VALIDO = "s3ss40-ana-42"


class Lab(BaseHTTPRequestHandler):
    server_version = "LabHTTP/1.0"
    sys_version = ""

    def _resp(self, status, texto, extras=()):
        corpo = (texto + "\n").encode()
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        for nome, valor in extras:
            self.send_header(nome, valor)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(corpo)

    def _login(self, dados):
        if dados.get("usuario") == ["ana"] and dados.get("senha") == ["focadu123"]:
            self._resp(200, "Bem-vinda, ana", [("Set-Cookie", "sid=" + SID_VALIDO)])
        else:
            self._resp(401, "Usuario ou senha invalidos")

    def _cookie(self, nome):
        for par in (self.headers.get("Cookie") or "").split(";"):
            chave, _, valor = par.strip().partition("=")
            if chave == nome:
                return valor
        return None

    def _rota(self, url, dados):
        rota = url.path
        if rota == "/busca":
            self._resp(200, "Resultado da busca: " + ", ".join(dados.get("busca", [""])))
        elif rota == "/login":
            self._login(dados)
        elif rota == "/ola":
            self._resp(200, "Ola, laboratorio")
        elif rota == "/novo":
            self._resp(200, "Voce chegou ao endereco novo")
        elif rota == "/antigo":
            self._resp(301, "Mudou para /novo", [("Location", "/novo")])
        elif rota == "/temporario":
            self._resp(302, "Desvio temporario para /novo", [("Location", "/novo")])
        elif rota == "/admin":
            self._resp(403, "Acesso negado")
        elif rota == "/quebrado":
            self._resp(500, "Erro interno do servidor")
        elif rota == "/cabecalhos":
            linhas = ["%s: %s" % (nome, valor) for nome, valor in self.headers.items()]
            self._resp(200, "\n".join(linhas))
        elif rota == "/protegida":
            self._resp(200, "Pagina com cabecalhos de seguranca", [
                ("Strict-Transport-Security", "max-age=31536000"),
                ("X-Content-Type-Options", "nosniff"),
            ])
        elif rota == "/simples":
            self._resp(200, "Pagina sem cabecalhos de seguranca")
        elif rota == "/cookie-fraco":
            self._resp(200, "Cookie sem atributos", [("Set-Cookie", "tema=escuro")])
        elif rota == "/cookie-meio":
            self._resp(200, "Cookie so com HttpOnly", [("Set-Cookie", "visita=1; HttpOnly")])
        elif rota == "/cookie-forte":
            self._resp(200, "Cookie com atributos", [
                ("Set-Cookie", "sid=" + SID_VALIDO + "; HttpOnly; Secure; SameSite=Strict"),
            ])
        elif rota == "/perfil":
            if self._cookie("sid") == SID_VALIDO:
                self._resp(200, "Perfil de ana")
            else:
                self._resp(401, "Entre primeiro")
        else:
            self._resp(404, "Nao encontrado")

    def do_GET(self):
        url = urlparse(self.path)
        self._rota(url, parse_qs(url.query))

    do_HEAD = do_GET

    def do_POST(self):
        tamanho = int(self.headers.get("Content-Length") or 0)
        dados = parse_qs(self.rfile.read(tamanho).decode())
        url = urlparse(self.path)
        if url.path == "/login":
            self._login(dados)
        else:
            self._resp(404, "Nao encontrado")

    def log_message(self, fmt, *args):
        print("[servidor] " + (fmt % args), flush=True)


HTTPServer(("0.0.0.0", 8080), Lab).serve_forever()
