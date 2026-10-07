"""Site de laboratorio do curso de Web Security (ponte da Semana 1). So biblioteca padrao.
Respostas fixas, pra que a saida do script seja a mesma pra todo mundo.
HTTP na porta 8080 e HTTPS na porta 8443 (host "lab"). O certificado e a chave abaixo foram
criados so pro laboratorio; o laboratorio instala esse certificado como confiavel, e a chave
nao protege nada de verdade. Rota unica: / (200)."""
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
    server_version = "LabHTTP/1.0"
    sys_version = ""

    def version_string(self):
        return self.server_version

    def do_GET(self):
        corpo = b"<h1>Loja Lab</h1>\n"
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

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
