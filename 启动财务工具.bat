@echo off
cd /d "%~dp0"
echo ======================================
echo   财务分析工具 - 本地服务器
echo ======================================
echo.
echo 正在启动服务器...
echo 请在浏览器中打开: http://localhost:8888
echo 按 Ctrl+C 停止服务器
echo.
python -m http.server 8888
pause
