@echo off
title Subir a GitHub - Gestor de Facturas
color 0A

echo.
echo ================================================
echo    SUBIR A GITHUB - GESTOR DE FACTURAS
echo ================================================
echo.

set "APP_PATH=%~dp0"

echo Archivos que se subiran:
echo   - index.html (La app principal)
echo   - manifest.json (Para instalar como app)
echo   - sw.js (Service worker offline)
echo   - logo-redes_Transparente-216x216.png
echo.
echo Pasos:
echo   1. Crea un repositorio en GitHub.com (sin anyadir archivos)
echo   2. Copia la URL del repositorio (https://github.com/USUARIO/NOMBRE.git)
echo   3. Pegala abajo cuando se te pida
echo.
echo.

set /p REPO_URL="Pegar URL del repositorio GitHub: "

if "%REPO_URL%"=="" (
    echo ERROR: Debes pegar la URL del repositorio
    pause
    exit /b 1
)

echo.
echo Inicializando Git...
cd "%APP_PATH%"
git init
git add .
git commit -m "Initial commit: Gestor de Facturas v1.0"

echo.
echo Conectando con GitHub...
git remote add origin "%REPO_URL%"

echo.
echo Subiendo archivos...
git push -u origin main

echo.
echo ================================================
echo    PROCESO COMPLETADO
echo ================================================
echo.
echo Tu app se subira automaticamente a GitHub Pages.
echo.
echo Para activar GitHub Pages:
echo   1. Ve a tu repositorio en GitHub.com
echo   2. Clic en Settings > Pages
echo   3. En "Source" selecciona "main" y guarda
echo   4. Espera 1-2 minutos
echo.
echo La URL sera: https://TU_USUARIO.github.io/NOMBRE_REPOSITORIO/
echo.
pause
