@echo off
title Crear Acceso Directo
color 0A

echo.
echo ================================================
echo    CREAR ACCESO DIRECTO - GESTOR DE FACTURAS
echo ================================================
echo.

set "INSTALL_DIR=%USERPROFILE%\GestorFacturas"
set "DESKTOP_DIR=%USERPROFILE%\Desktop"

echo Verificando instalacion...
if not exist "%INSTALL_DIR%\index.html" (
    echo ERROR: No se encontro la app
    echo Ejecuta primero install.bat
    pause
    exit /b 1
)
echo        Carpeta encontrada

echo.
echo Creando acceso directo...
cscript //nologo "%INSTALL_DIR%\create_shortcut.vbs" >nul 2>&1

echo.
echo Verificando...
if exist "%DESKTOP_DIR%\Gestor de Facturas.lnk" (
    echo.
    echo ================================================
    echo    ACCESO DIRECTO CREADO
    echo ================================================
    echo.
    echo El acceso directo "Gestor de Facturas" esta
    echo en tu escritorio.
    echo.
    echo Haz doble clic para abrir la app.
    echo.
) else (
    echo ERROR: No se pudo crear el acceso directo
    echo.
    echo Para crearlo manualmente:
    echo   1. Ve al escritorio
    echo   2. Clic derecho - Nuevo - Acceso directo
    echo   3. En "Ubicacion del elemento" escribe:
    echo      %INSTALL_DIR%\index.html
    echo   4. Clic en Siguiente
    echo   5. Escribe: Gestor de Facturas
    echo   6. Clic en Finalizar
    echo.
)
pause
