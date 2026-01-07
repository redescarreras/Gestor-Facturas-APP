#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gestor de Facturas - Servidor Local

Este script inicia un servidor web local para ejecutar la aplicación
de gestión de facturas. Útil para uso como app de escritorio.

Usage:
    python app.py                    # Iniciar servidor
    python app.py --port 8080        # Puerto personalizado
    python app.py --open             # Abrir navegador automáticamente
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import argparse
from pathlib import Path


class FacturasHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Manejador HTTP personalizado para la aplicación de facturas."""
    
    def __init__(self, *args, directory=None, **kwargs):
        self.app_directory = directory or str(Path(__file__).parent.absolute())
        super().__init__(*args, directory=self.app_directory, **kwargs)
    
    def end_headers(self):
        """Añadir headers adicionales para mejor funcionamiento."""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def log_message(self, format, *args):
        """Personalizar mensajes de log."""
        print(f"[{self.log_date_time_string()}] {args[0]}")


def get_port(default_port=5000):
    """Buscar un puerto disponible."""
    import socket
    port = default_port
    while True:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            port += 1


def main():
    """Función principal."""
    parser = argparse.ArgumentParser(
        description='Gestor de Facturas - Servidor Local',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
    python app.py                    # Iniciar en puerto 5000
    python app.py --port 8080        # Puerto personalizado
    python app.py --open             # Abrir navegador automáticamente
    python app.py --quiet            # Modo silencioso
        """
    )
    
    parser.add_argument(
        '--port', 
        type=int, 
        default=5000,
        help='Puerto para el servidor (default: 5000)'
    )
    parser.add_argument(
        '--open',
        action='store_true',
        help='Abrir navegador automáticamente'
    )
    parser.add_argument(
        '--quiet',
        action='store_true',
        help='Modo silencioso'
    )
    
    args = parser.parse_args()
    
    # Directorio de la aplicación
    app_dir = Path(__file__).parent.absolute()
    os.chdir(app_dir)
    
    # Buscar puerto disponible
    try:
        port = get_port(args.port)
    except Exception as e:
        print(f"Error al buscar puerto: {e}")
        sys.exit(1)
    
    # Configurar el servidor
    handler = lambda *args, **kwargs: FacturasHTTPRequestHandler(*args, directory=str(app_dir), **kwargs)
    
    with socketserver.TCPServer(("", port), handler) as httpd:
        if not args.quiet:
            print()
            print("=" * 50)
            print("   GESTOR DE FACTURAS - SERVIDOR LOCAL")
            print("=" * 50)
            print()
            print(f"[INFO] Servidor iniciado en:")
            print(f"       http://localhost:{port}")
            print(f"       http://127.0.0.1:{port}")
            print()
            print("[INFO] Presiona Ctrl+C para detener el servidor")
            print()
            print("=" * 50)
            print()
        
        # Abrir navegador si se solicita
        if args.open:
            webbrowser.open(f'http://localhost:{port}')
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n[INFO] Servidor detenido")
            sys.exit(0)


if __name__ == "__main__":
    main()
