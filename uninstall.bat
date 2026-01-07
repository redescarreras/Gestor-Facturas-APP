@echo off
title Desinstalador - Gestor de Facturas
color 0C

echo.
echo ================================================
echo    DESINSTALADOR - GESTOR DE FACTURAS
echo ================================================
echo.

set "INSTALL_DIR=%USERPROFILE%\GestorFacturas"
set "DESKTOP_LINK=%USERPROFILE%\Desktop\Gestor de Facturas.lnk"
set "STARTMENU_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Gestor de Facturas"

echo [1/3] Eliminando acceso directo del escritorio...
if exist "%DESKTOP_LINK%" (
    del "%DESKTOP_LINK%" >nul 2>&1
    echo        Eliminado
) else (
    echo        No encontrado
)

echo.
echo [2/3] Eliminando del menu inicio...
if exist "%STARTMENU_DIR%" (
    rmdir /s /q "%STARTMENU_DIR%" >nul 2>&1
    echo        Eliminado
) else (
    echo        No encontrado
)

echo.
echo [3/3] Eliminando archivos...
if exist "%INSTALL_DIR%" (
    rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
    echo        Carpeta eliminada
) else (
    echo        No encontrada
)

echo.
echo ================================================
echo    DESINSTALACION COMPLETADA
echo ================================================
echo.
echo   Todos los archivos han sido eliminados
echo   Tus datos en el navegador no se eliminan
echo.
pause
