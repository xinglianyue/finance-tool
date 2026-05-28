@echo off
chcp 65001 >nul
title 财务分析工具 v17
echo.
echo ========================================
echo    财务分析工具 v17
echo ========================================
echo.
echo 正在打开财务工具...
echo.

REM 尝试使用默认浏览器打开 index-complete.html
start "" "%~dp0index-complete.html"

echo 如果页面没有自动打开，请手动双击打开 index-complete.html
echo.
echo 按任意键退出...
pause >nul
