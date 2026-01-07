# -*- coding: utf-8 -*-
"""
Crear Acceso Directo en Windows

Este script crea un acceso directo en el escritorio para la aplicación.
Útil para la instalación en Windows.

Usage:
    python install_shortcut.py
    python install_shortcut.py --port 5000
    python install_shortcut.py --help
"""

import os
import sys
from pathlib import Path
import argparse


def create_shortcut(target_path, shortcut_path, description="", icon_path=None, working_dir=None):
    """Crear un acceso directo de Windows (.lnk)."""
    try:
        from comtypes.client import CreateObject
        from comtypes.persist import ProgIDFromMoniker
        import comtypes
        
        # Obtener ruta absoluta
        target_path = str(Path(target_path).absolute())
        if not os.path.exists(target_path):
            raise FileNotFoundError(f"No existe: {target_path}")
        
        # Crear objeto de acceso directo
        shell = CreateObject("WScript.Shell")
        shortcut = shell.CreateShortcut(str(shortcut_path))
        
        # Configurar propiedades
        shortcut.TargetPath = target_path
        shortcut.Description = description
        
        if working_dir:
            shortcut.WorkingDirectory = str(Path(working_dir).absolute())
        
        if icon_path and os.path.exists(str(icon_path)):
            shortcut.IconLocation = f"{icon_path},0"
        
        # Guardar acceso directo
        shortcut.Save()
        
        print(f"[OK] Acceso directo creado: {shortcut_path}")
        return True
        
    except ImportError:
        print("[ERROR] Se requiere comtypes para crear accesos directos")
        print("Instala con: pip install comtypes")
        return False
    except Exception as e:
        print(f"[ERROR] Error al crear acceso directo: {e}")
        return False


def create_startup_script(app_path):
    """Crear script de inicio."""
    start_script = app_path / "start_facturas.bat"
    
    content = f"""@echo off
chcp 65001 >nul
title Gestor de Facturas
color 0A

echo.
echo ========================================
echo    GESTOR DE FACTURAS
echo ========================================
echo.

REM Cambiar al directorio de la aplicación
cd /d "{app_path}"

REM Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no está instalado
    pause
    exit /b 1
)

REM Instalar dependencias si es necesario
if not exist "venv" (
    echo Verificando dependencias...
    pip install -r requirements.txt >nul 2>&1
)

REM Iniciar servidor
echo Iniciando servidor...
python app.py --open

echo.
echo El servidor está ejecutándose
echo Presiona Ctrl+C para detener
echo.

pause
"""
    
    try:
        with open(start_script, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"[OK] Script de inicio creado: {start_script}")
        return str(start_script)
    except Exception as e:
        print(f"[ERROR] Error al crear script de inicio: {e}")
        return None


def main():
    """Función principal."""
    parser = argparse.ArgumentParser(
        description='Crear acceso directo de Gestor de Facturas',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--port',
        type=int,
        default=5000,
        help='Puerto del servidor (default: 5000)'
    )
    parser.add_argument(
        '--desktop',
        action='store_true',
        help='Crear acceso directo solo en escritorio'
    )
    parser.add_argument(
        '--startmenu',
        action='store_true',
        help='Crear acceso directo solo en menú inicio'
    )
    
    args = parser.parse_args()
    
    print()
    print("=" * 50)
    print("   CREAR ACCESO DIRECTO")
    print("=" * 50)
    print()
    
    # Directorios
    app_path = Path(__file__).parent.absolute()
    desktop_path = Path(os.path.expanduser("~\\Desktop"))
    startmenu_path = Path(os.path.expandvars("%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs"))
    
    # Crear script de inicio
    start_script = create_startup_script(app_path)
    if not start_script:
        sys.exit(1)
    
    # Logo
    logo_path = app_path / "logo-redes_Transparente-216x216.png"
    
    # Determinar qué accesos directos crear
    create_all = not args.desktop and not args.startmenu
    
    if create_all or args.desktop:
        shortcut_path = desktop_path / "Gestor de Facturas.lnk"
        create_shortcut(
            target_path=start_script,
            shortcut_path=shortcut_path,
            description="Gestor de Facturas - Control Financiero",
            icon_path=logo_path,
            working_dir=str(app_path)
        )
    
    if create_all or args.startmenu:
        # Crear carpeta en menú inicio
        folder_path = startmenu_path / "Gestor de Facturas"
        folder_path.mkdir(parents=True, exist_ok=True)
        
        shortcut_path = folder_path / "Gestor de Facturas.lnk"
        create_shortcut(
            target_path=start_script,
            shortcut_path=shortcut_path,
            description="Gestor de Facturas - Control Financiero",
            icon_path=logo_path,
            working_dir=str(app_path)
        )
    
    print()
    print("=" * 50)
    print("   ACCESOS DIRECTOS CREADOS")
    print("=" * 50)
    print()
    
    if create_all or args.desktop:
        print(f"[OK] Escritorio: {desktop_path / 'Gestor de Facturas.lnk'}")
    if create_all or args.startmenu:
        print(f"[OK] Menú Inicio: {startmenu_path / 'Gestor de Facturas'}")
    
    print()
    print("Para ejecutar:")
    print("  Haz doble clic en el acceso directo")
    print("  Se abrirá en tu navegador")
    print()
    
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
