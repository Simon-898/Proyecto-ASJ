@echo off
echo Cerrando ASJ Ordenes (puerto 8081)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8081 ^| findstr LISTENING') do (
  taskkill /PID %%a /F >nul 2>nul
)
echo Listo.
pause