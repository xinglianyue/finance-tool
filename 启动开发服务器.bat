@echo off
chcp 65001 >nul 2>&1
title 财务分析工具 - 开发服务器
echo.
echo ========================================
echo   财务分析工具 v17 开发服务器
echo ========================================
echo.
echo 正在启动服务器...
echo.

cd /d "%~dp0"

:: 尝试使用Python启动
python -m http.server 8888 --bind 127.0.0.1 >nul 2>&1
if %errorlevel% equ 0 (
    echo 服务器已启动: http://127.0.0.1:8888
    start http://127.0.0.1:8888/index.html
    goto :done
)

:: 尝试使用Python3启动
python3 -m http.server 8888 --bind 127.0.0.1 >nul 2>&1
if %errorlevel% equ 0 (
    echo 服务器已启动: http://127.0.0.1:8888
    start http://127.0.0.1:8888/index.html
    goto :done
)

:: 尝试使用Node.js的http-server
npx http-server -p 8888 -c-1 >nul 2>&1
if %errorlevel% equ 0 (
    echo 服务器已启动: http://127.0.0.1:8888
    start http://127.0.0.1:8888/index.html
    goto :done
)

:: 如果都没有，打开文件
echo.
echo 未找到Python或Node.js
echo 将直接打开HTML文件...
echo.
pause
start index.html

:done
echo.
echo 关闭此窗口将停止服务器
echo.
pause
