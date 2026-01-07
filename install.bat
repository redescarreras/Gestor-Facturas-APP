@echo off
title Instalador - Gestor de Facturas App
color 0A

echo.
echo ================================================
echo    INSTALADOR - GESTOR DE FACTURAS (APP NATIVA)
echo ================================================
echo.

set "APP_PATH=%~dp0"
set "INSTALL_DIR=%USERPROFILE%\GestorFacturas"
set "DESKTOP_DIR=%USERPROFILE%\Desktop"

echo [1/5] Creando directorio...
mkdir "%INSTALL_DIR%" 2>nul
echo        OK

echo.
echo [2/5] Copiando archivos de la app...
copy /Y "%APP_PATH%GestorFacturas.hta" "%INSTALL_DIR%\" >nul
copy /Y "%APP_PATH%lanzar_app.bat" "%INSTALL_DIR%\" >nul
copy /Y "%APP_PATH%logo-redes_Transparente-216x216.png" "%INSTALL_DIR%\" >nul
echo        OK

echo.
echo [3/5] Copiando archivos opcionales (web)...
copy /Y "%APP_PATH%index.html" "%INSTALL_DIR%\" >nul
copy /Y "%APP_PATH%app.py" "%INSTALL_DIR%\" >nul
copy /Y "%APP_PATH%requirements.txt" "%INSTALL_DIR%\" >nul
echo        OK

echo.
echo [4/5] Creando acceso directo en escritorio...
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\sc.vbs"
echo Set oLink = oWS.CreateShortcut("%DESKTOP_DIR%\Gestor de Facturas.lnk") >> "%TEMP%\sc.vbs"
echo oLink.TargetPath = "%INSTALL_DIR%\lanzar_app.bat" >> "%TEMP%\sc.vbs"
echo oLink.WorkingDirectory = "%INSTALL_DIR%" >> "%TEMP%\sc.vbs"
echo oLink.Description = "Gestor de Facturas - App de Escritorio" >> "%TEMP%\sc.vbs"
echo oLink.Save >> "%TEMP%\sc.vbs"
cscript //nologo "%TEMP%\sc.vbs" >nul 2>&1
del "%TEMP%\sc.vbs" >nul 2>&1
echo        OK

echo.
echo [5/5] Verificando instalacion...
if exist "%INSTALL_DIR%\GestorFacturas.hta" (
    echo        INSTALACION COMPLETA
) else (
    echo ERROR: Algo salio mal
    pause
    exit /b 1
)

echo.
echo ================================================
echo    INSTALACION COMPLETADA
echo ================================================
echo.
echo Carpeta: %INSTALL_DIR%
echo.
echo ACCESO DIRECTO CREADO EN EL ESCRITORIO
echo.
echo Para usar la app:
echo   - Haz doble clic en "Gestor de Facturas" del escritorio
echo   - Se abrira como aplicacion de Windows (no navegador)
echo.
echo La app funciona sin internet y guarda tus datos localmente.
echo.
pause
