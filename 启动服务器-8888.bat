@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title 财务工具 - Python服务器
echo.
echo ========================================
echo   财务分析工具 - Python HTTP 服务器
echo ========================================
echo.
echo 正在启动服务器...
echo.

python -m http.server 8888 --bind 127.0.0.1
