@echo off
setlocal
cd /d "%~dp0"
echo PIUWeb - http://127.0.0.1:8765/
echo Mantenha esta janela aberta enquanto estiver jogando.
echo Para encerrar o servidor, pressione Ctrl+C.
echo.
python -m http.server 8765 --bind 127.0.0.1
if errorlevel 1 (
  echo.
  echo Nao foi possivel iniciar. Verifique se o Python esta instalado
  echo e se ja existe um servidor usando a porta 8765.
  pause
)
endlocal
