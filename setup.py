# -*- coding: utf-8 -*-
"""
Setup para PyInstaller - Crear ejecutable de Windows

Usage:
    # Crear executable básico
    pyinstaller --onefile --windowed app.py

    # Con iconos y recursos
    pyinstaller --onefile --windowed --icon=logo.ico --add-data="*.html;." --add-data="*.png;." app.py

    # Usar este script
    python setup.py build
    python setup.py build --onefile
"""

from PyInstaller.utils.hooks import collect_all_files
from PyInstaller.building.build_main import Analysis, PYZ, EXE
from PyInstaller.building.datastruct import Tree
from PyInstaller.config import CONF
import os
import sys
from pathlib import Path


def get_base_path():
    """Obtener la ruta base del proyecto."""
    return Path(__file__).parent.absolute()


def setup_options():
    """Configurar opciones de PyInstaller."""
    base_path = get_base_path()
    
    # Archivos a incluir
    datas = []
    for pattern in ['*.html', '*.png', '*.txt', '*.md']:
        for file in base_path.rglob(pattern):
            datas.append((str(file), str(file.parent.relative_to(base_path))))
    
    # Archivos ocultos (imports)
    hiddenimports = [
        'http.server',
        'socketserver',
        'webbrowser',
        'argparse',
        'pathlib',
        'json',
        'urllib.request',
        'urllib.error',
    ]
    
    return {
        'datas': datas,
        'hiddenimports': hiddenimports,
        'hookspath': [],
        'hooksconfig': {},
        'runtime_hooks': [],
        'excludes': [
            'tkinter',
            'test',
            'unittest',
            'pydoc',
            'doctest',
        ],
    }


def build_executable(onefile=False, windowed=True):
    """Construir el ejecutable."""
    try:
        from PyInstaller.__main__ import run
    except ImportError:
        print("PyInstaller no está instalado.")
        print("Instala con: pip install pyinstaller")
        return False
    
    base_path = get_base_path()
    
    # Opciones básicas
    args = [
        '--name=GestorFacturas',
        '--distpath', str(base_path / 'dist'),
        '--workpath', str(base_path / 'build'),
        '--specpath', str(base_path),
    ]
    
    if onefile:
        args.append('--onefile')
    else:
        args.append('--onedir')
    
    if windowed:
        args.append('--windowed')
    
    # Icono (si existe)
    icon_path = base_path / 'logo-redes_Transparente-216x216.png'
    if icon_path.exists():
        args.extend(['--icon', str(icon_path)])
    
    # Añadir archivos
    args.extend(['--add-data', f'{base_path / "index.html"};.'])
    args.extend(['--add-data', f'{base_path / "logo-redes_Transparente-216x216.png"};.'])
    
    # Añadir script principal
    args.append(str(base_path / 'app.py'))
    
    print("=" * 50)
    print("   CONSTRUYENDO EJECUTABLE")
    print("=" * 50)
    print()
    print(f"Modo: {'Onefile' if onefile else 'Directorio'}")
    print(f"Ventana: {'Sí' if windowed else 'No'}")
    print()
    
    try:
        run(args)
        print()
        print("=" * 50)
        print("   EJECUTABLE CREADO")
        print("=" * 50)
        print()
        print(f"Ubicación: {base_path / 'dist'}")
        print()
        return True
    except Exception as e:
        print(f"Error al crear ejecutable: {e}")
        return False


def create_installer():
    """Crear instalador NSIS."""
    print("Para crear un instalador profesional, usa:")
    print("1. NSIS: https://nsis.sourceforge.io/")
    print("2. Inno Setup: https://jrsoftware.org/isinfo.php")
    print()
    print("Ejemplo con Inno Setup:")
    print("  Descarga Inno Setup")
    print("  Crea un script con el asistente")
    print("  Compila el instalador")


def main():
    """Función principal."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Build executable for Gestor de Facturas',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--onefile',
        action='store_true',
        help='Crear un solo archivo ejecutable'
    )
    parser.add_argument(
        '--windowed',
        action='store_true',
        default=True,
        help='Crear aplicación de ventana (no consola)'
    )
    parser.add_argument(
        '--clean',
        action='store_true',
        help='Limpiar archivos de compilación anteriores'
    )
    
    args = parser.parse_args()
    
    base_path = get_base_path()
    
    # Limpiar si se solicita
    if args.clean:
        import shutil
        for folder in ['build', 'dist']:
            folder_path = base_path / folder
            if folder_path.exists():
                shutil.rmtree(folder_path)
                print(f"Eliminado: {folder_path}")
        print()
    
    # Verificar PyInstaller
    try:
        import PyInstaller
    except ImportError:
        print("Instalando PyInstaller...")
        import subprocess
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'pyinstaller'])
        print()
    
    # Construir
    success = build_executable(onefile=args.onefile, windowed=args.windowed)
    
    if success:
        print("Ejecutable creado correctamente!")
        print()
        print("Próximos pasos para distribución:")
        print("1. Prueba el ejecutable en la carpeta 'dist'")
        print("2. Crea un instalador con Inno Setup o NSIS")
        print("3. Sube a GitHub Releases para compartir")
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main() or 0)
