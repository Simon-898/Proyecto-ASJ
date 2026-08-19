@echo off
cd /d "%~dp0"

set "PORT=8081"
set "URL=http://localhost:%PORT%/"

echo ====================================================
echo             ASJ ORDENES - INICIANDO...
echo ====================================================
echo.
echo No cierres esta ventana manualmente. 
echo Puedes apagar la aplicacion desde la web.
echo.

:: Abrir la URL en el navegador por defecto
start "" "%URL%"

:loop
"%~dp0jre\bin\java.exe" -jar "%~dp0ordenes-app.jar"

:: Si el codigo de salida es 10, reiniciamos automaticamente
if %errorlevel% equ 10 (
    echo.
    echo [SISTEMA] Reiniciando servidor para cargar base de datos...
    timeout /t 2 >nul
    goto loop
)

:: Si sale con otro codigo (como 0), cerramos el CMD
echo [SISTEMA] Aplicacion apagada de forma segura.
exit