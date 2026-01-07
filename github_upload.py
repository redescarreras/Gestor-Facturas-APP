#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Subir a GitHub - Script de Automatización

Este script ayuda a subir el proyecto a GitHub automáticamente.

Usage:
    python github_upload.py --token "tu_token" --repo "nombre_repositorio"
    python github_upload.py --help

Antes de usar:
1. Crea un token en GitHub: Settings > Developer settings > Personal access tokens
2. Selecciona los permisos: repo, delete_repo
3. Guarda el token en un lugar seguro
"""

import os
import sys
import argparse
import subprocess
import webbrowser
from pathlib import Path


def check_git_installed():
    """Verificar si Git está instalado."""
    try:
        subprocess.run(['git', '--version'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def check_git_configured():
    """Verificar si Git está configurado."""
    try:
        subprocess.run(['git', 'config', 'user.name'], capture_output=True)
        subprocess.run(['git', 'config', 'user.email'], capture_output=True)
        return True
    except:
        return False


def configure_git():
    """Configurar Git si no está configurado."""
    print("\n[CONFIGURACIÓN DE GIT]")
    print("Git necesita estar configurado con tu nombre y email.")
    print()
    
    name = input("Tu nombre de usuario Git: ").strip()
    if not name:
        print("[ERROR] El nombre es obligatorio")
        return False
    
    email = input("Tu email de GitHub: ").strip()
    if not email:
        print("[ERROR] El email es obligatorio")
        return False
    
    try:
        subprocess.run(['git', 'config', 'user.name', name], check=True)
        subprocess.run(['git', 'config', 'user.email', email], check=True)
        print(f"[OK] Git configurado: {name} <{email}>")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Error al configurar Git: {e}")
        return False


def init_git_repo(repo_name, description):
    """Inicializar repositorio Git."""
    print("\n[INICIALIZANDO REPOSITORIO]")
    
    # Verificar que estamos en el directorio correcto
    current_dir = Path(__file__).parent.absolute()
    os.chdir(current_dir)
    
    # Verificar si ya hay un repositorio
    if (current_dir / '.git').exists():
        print("[INFO] Repositorio Git ya existe")
        return True
    
    try:
        # Inicializar repositorio
        subprocess.run(['git', 'init'], check=True)
        subprocess.run(['git', 'branch', '-M', 'main'], check=True)
        
        # Configurar remote
        subprocess.run(['git', 'remote', 'add', 'origin', f'https://github.com/USUARIO/{repo_name}.git'], check=True)
        
        print("[OK] Repositorio Git inicializado")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Error al inicializar Git: {e}")
        return False


def create_github_repo(token, repo_name, description):
    """Crear repositorio en GitHub usando la API."""
    import urllib.request
    import json
    
    print("\n[CREANDO REPOSITORIO EN GITHUB]")
    
    url = "https://api.github.com/user/repos"
    
    data = json.dumps({
        "name": repo_name,
        "description": description,
        "private": False,
        "auto_init": False
    }).encode('utf-8')
    
    request = urllib.request.Request(
        url,
        data=data,
        headers={
            'Authorization': f'token {token}',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(request) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"[OK] Repositorio creado: {result['html_url']}")
            return result['html_url']
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"[ERROR] Error al crear repositorio: {e.code}")
        print(f"Detalles: {error_body}")
        return None
        
    except Exception as e:
        print(f"[ERROR] Error de conexión: {e}")
        return None


def create_gitignore():
    """Crear archivo .gitignore."""
    gitignore_content = """# Byte-compiled / optimized / DLL files
__pycache__/
*.py[cod]
*$py.class

# C extensions
*.so

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# PyInstaller
*.manifest
*.spec

# Installer logs
pip-log.txt
pip-delete-this-directory.txt

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Environment
.env
.venv
env/
venv/
ENV/

# Logs
*.log

# Local data files
*.sqlite3
"""
    
    gitignore_path = Path(__file__).parent / '.gitignore'
    try:
        with open(gitignore_path, 'w', encoding='utf-8') as f:
            f.write(gitignore_content)
        print("[OK] Archivo .gitignore creado")
        return True
    except Exception as e:
        print(f"[ERROR] Error al crear .gitignore: {e}")
        return False


def commit_and_push(repo_url, branch='main'):
    """Hacer commit y push a GitHub."""
    print("\n[SUBIENDO ARCHIVOS A GITHUB]")
    
    current_dir = Path(__file__).parent.absolute()
    os.chdir(current_dir)
    
    try:
        # Añadir todos los archivos
        print("   Añadiendo archivos...")
        subprocess.run(['git', 'add', '.'], check=True)
        
        # Verificar cambios
        result = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True)
        if not result.stdout.strip():
            print("   No hay cambios para hacer commit")
            return True
        
        # Hacer commit
        print("   Haciendo commit...")
        subprocess.run([
            'git', 'commit', '-m', 
            'Initial commit: Gestor de Facturas v1.0'
        ], check=True, input='y\n', text=True)
        
        # Push
        print("   Subiendo a GitHub...")
        subprocess.run([
            'git', 'push', '-u', 'origin', branch
        ], check=True)
        
        print("[OK] Archivos subidos correctamente")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Error durante commit/push: {e}")
        return False


def open_github_page(repo_url):
    """Abrir la página del repositorio en el navegador."""
    if repo_url:
        print(f"\n[INFO] Abriendo repositorio en navegador...")
        webbrowser.open(repo_url)


def main():
    """Función principal."""
    parser = argparse.ArgumentParser(
        description='Subir Gestor de Facturas a GitHub',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
    python github_upload.py --token "ghp_xxxx" --repo "gestor-facturas"
    python github_upload.py --token "ghp_xxxx" --repo "mi-app" --desc "Mi descripción"

Pasos:
    1. Crea un token en GitHub (Settings > Developer settings > Tokens)
    2. Ejecuta este script con tu token
    3. El script creará el repositorio y subirá los archivos
        """
    )
    
    parser.add_argument(
        '--token',
        help='Token de acceso personal de GitHub'
    )
    parser.add_argument(
        '--repo',
        default='gestor-facturas',
        help='Nombre del repositorio (default: gestor-facturas)'
    )
    parser.add_argument(
        '--desc',
        default='Aplicación de gestión de facturas con cálculo automático de IVA',
        help='Descripción del repositorio'
    )
    parser.add_argument(
        '--open',
        action='store_true',
        help='Abrir repositorio en el navegador al terminar'
    )
    
    args = parser.parse_args()
    
    print()
    print("=" * 55)
    print("   SUBIR GESTOR DE FACTURAS A GITHUB")
    print("=" * 55)
    print()
    
    # Verificar Git
    if not check_git_installed():
        print("[ERROR] Git no está instalado")
        print()
        print("Por favor, instala Git desde: https://git-scm.com/downloads")
        print("Y asegúrate de añadirlo al PATH del sistema")
        sys.exit(1)
    
    print("[OK] Git encontrado")
    
    # Configurar Git si es necesario
    if not check_git_configured():
        if not configure_git():
            sys.exit(1)
    
    # Crear .gitignore
    create_gitignore()
    
    # Inicializar repositorio
    if not init_git_repo(args.repo, args.desc):
        sys.exit(1)
    
    # Obtener token
    token = args.token
    if not token:
        print("\n[TOKEN DE GITHUB]")
        print("Necesitas un token de acceso personal de GitHub.")
        print("Crea uno en: Settings > Developer settings > Personal access tokens")
        print()
        token = input("Introduce tu token: ").strip()
        
        if not token:
            print("\n[ADVERTENCIA] No se ha proporcionado token")
            print("Se creará el repositorio local pero no se subirá a GitHub")
            print()
            proceed = input("¿Continuar solo con repositorio local? (s/n): ").strip().lower()
            if proceed != 's':
                sys.exit(0)
    
    # Crear repositorio en GitHub
    repo_url = None
    if token:
        repo_url = create_github_repo(token, args.repo, args.desc)
        
        if not repo_url:
            print("\n[ERROR] No se pudo crear el repositorio en GitHub")
            print("Verifica tu token e intenta de nuevo")
            sys.exit(1)
    
    # Hacer commit y push
    if token and repo_url:
        if not commit_and_push(repo_url):
            print("\n[ERROR] No se pudieron subir los archivos")
            sys.exit(1)
    
    # Abrir página de GitHub
    if args.open and repo_url:
        open_github_page(repo_url)
    
    print()
    print("=" * 55)
    print("   PROCESO COMPLETADO")
    print("=" * 55)
    print()
    
    if repo_url:
        print(f"[INFO] Repositorio: {repo_url}")
    print("[INFO] Archivos guardados localmente")
    print()
    print("Próximos pasos:")
    print("   1. Revisa tu repositorio en GitHub")
    print("   2. Añade una descripción y etiquetas")
    print("   3. Comparte tu proyecto!")
    print()
    
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
