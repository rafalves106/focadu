"""Site de laboratorio do curso WSTG (ponte da Semana 1). So biblioteca padrao.
Respostas fixas, pra que a saida do script seja a mesma pra todo mundo.
HTTP na porta 8080 e HTTPS na porta 8443 (host "lab"). O certificado e a chave abaixo foram
criados so pro laboratorio; o laboratorio instala esse certificado como confiavel, e a chave
nao protege nada de verdade. Rotas: / (200), /login (200), /produtos (200), /painel (302 para /login); qualquer outra da 404."""
import os
import ssl
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

CERTIFICADO = """-----BEGIN CERTIFICATE-----
MIIBgzCCASmgAwIBAgIUc2aKO9dL8XM7biO6lH/tnzfEaqIwCgYIKoZIzj0EAwIw
DjEMMAoGA1UEAwwDbGFiMCAXDTI1MDEwMTAwMDAwMFoYDzIxMjYwOTEzMDE1NTAz
WjAOMQwwCgYDVQQDDANsYWIwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAARs6fYI
AsT1zgcJoUdbUgwnRSf3ZYwPlPn0R2XyPM7hRi0LlzMMX7rDcpYUm6u7BV7EMDjk
YfFLrVGRlIOQeAqRo2MwYTAdBgNVHQ4EFgQUOAjpia//tt3Z+XN9cffIdEsbXdsw
HwYDVR0jBBgwFoAUOAjpia//tt3Z+XN9cffIdEsbXdswDwYDVR0TAQH/BAUwAwEB
/zAOBgNVHREEBzAFggNsYWIwCgYIKoZIzj0EAwIDSAAwRQIgbYWOn2ykvExvxN65
CfvVfSirCS+v3GaD0LM0vC8beksCIQDFvphQjHLeDGlHgKZHJco5GRLjK+GfV5cJ
dhz6sMpm7A==
-----END CERTIFICATE-----
"""
CHAVE = """-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgHocQIWXc9KsLEFth
9MGBf9atHbVxnvJjBSGsbQPnd2WhRANCAARs6fYIAsT1zgcJoUdbUgwnRSf3ZYwP
lPn0R2XyPM7hRi0LlzMMX7rDcpYUm6u7BV7EMDjkYfFLrVGRlIOQeAqR
-----END PRIVATE KEY-----
"""


class Lab(BaseHTTPRequestHandler):
    server_version = "LojaServ/2.4.1"
    sys_version = ""

    def version_string(self):
        return self.server_version

    def responder(self, status, corpo, extra=None, tipo="text/html; charset=utf-8"):
        dados = corpo.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(dados)))
        self.send_header("X-Powered-By", "LojaFramework/1.8")
        for nome, valor in (extra or {}).items():
            self.send_header(nome, valor)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(dados)

    def tratar(self):
        rota = self.path.split("?")[0]
        if rota == "/":
            self.responder(200, "<h1>Loja Lab</h1>\n<p>Bem-vindo a Loja Lab.</p>\n")
        elif rota == "/login":
            self.responder(200, "<h1>Entrar</h1>\n<form method=\"post\" action=\"/login\">usuario, senha</form>\n")
        elif rota == "/produtos":
            self.responder(200, "<h1>Produtos</h1>\n<ul><li>Caneca</li><li>Camiseta</li></ul>\n")
        elif rota == "/painel":
            self.responder(302, "", {"Location": "/login"})
        else:
            self.responder(404, "<h1>Pagina nao encontrada</h1>\n<p>A rota que voce pediu nao existe na Loja Lab.</p>\n")

    do_GET = tratar
    do_HEAD = tratar

    def log_message(self, *args):
        pass


def servir_https():
    with open("/tmp/lab-cert.pem", "w") as f:
        f.write(CERTIFICADO)
    with open("/tmp/lab-chave.pem", "w") as f:
        f.write(CHAVE)
    os.chmod("/tmp/lab-chave.pem", 0o600)
    contexto = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    contexto.load_cert_chain("/tmp/lab-cert.pem", "/tmp/lab-chave.pem")
    servidor = HTTPServer(("0.0.0.0", 8443), Lab)
    servidor.socket = contexto.wrap_socket(servidor.socket, server_side=True)
    servidor.serve_forever()


threading.Thread(target=servir_https, daemon=True).start()
HTTPServer(("0.0.0.0", 8080), Lab).serve_forever()
