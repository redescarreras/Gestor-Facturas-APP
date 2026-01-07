@echo off
title Lanzador - Gestor de Facturas
color 0A

echo.
echo ================================================
echo    GESTOR DE FACTURAS - APLICACION DE ESCRITORIO
echo ================================================
echo.

set "APP_DIR=%~dp0"

echo Iniciando aplicacion...
echo.
mshta "%APP_DIR%GestorFacturas.hta"

if %errorlevel% equ 0 (
    echo.
    echo Aplicacion cerrada.
) else (
    echo.
    echo Error al iniciar la aplicacion.
)
echo.
pause
