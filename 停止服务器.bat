@echo off
REM 停止财务工具服务器脚本

echo 正在停止财务工具服务器...
echo.

REM 停止服务器（通过端口查找进程）
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo 停止服务器进程: %%a
    taskkill /PID %%a /F >nul 2>nul
)

if %errorlevel% equ 0 (
    echo 服务器已停止
) else (
    echo 服务器未运行
)

echo.
pause
