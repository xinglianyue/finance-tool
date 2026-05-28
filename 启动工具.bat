@echo off
chcp 65001 >nul 2>&1
title 财务分析工具 v17

echo.
echo ========================================
echo    财务分析工具 v17.0
echo    美团代理商财务数据智能分析
echo ========================================
echo.

:menu
echo [1] 启动完整版（推荐）
echo [2] 启动开发版（需要HTTP服务器）
echo [3] 打开数据管理工具
echo [4] 查看备份历史
echo [5] 导出当前数据
echo [6] 导入备份文件
echo [7] 退出
echo.
set /p choice=请选择 (1-7):

if "%choice%"=="1" (
    echo 正在打开完整版...
    start "" "%~dp0index-complete.html"
    goto end
)

if "%choice%"=="2" (
    echo 正在启动开发服务器...
    start http://localhost:8888/index.html
    python -m http.server 8888 --bind 127.0.0.1
    goto end
)

if "%choice%"=="3" (
    echo 正在打开数据管理工具...
    start "" "%~dp0load-data.html"
    goto menu
)

if "%choice%"=="4" (
    echo.
    echo === 查看备份历史 ===
    echo 请在浏览器控制台(F12)输入以下命令查看备份:
    echo.
    echo   BackupManager.getBackups()
    echo.
    echo 或直接在浏览器中打开工具查看设置面板
    echo.
    pause
    goto menu
)

if "%choice%"=="5" (
    echo.
    echo === 导出数据 ===
    echo 请在浏览器中:
    echo 1. 打开工具 (选项1)
    echo 2. 按F12打开控制台
    echo 3. 输入: BackupManager.export()
    echo 4. 选择保存位置
    echo.
    pause
    goto menu
)

if "%choice%"=="6" (
    echo.
    echo === 导入备份 ===
    echo 请在浏览器中:
    echo 1. 打开工具 (选项1)
    echo 2. 按F12打开控制台
    echo 3. 输入以下代码导入文件:
    echo.
    echo   var input = document.createElement('input');
    echo   input.type = 'file';
    echo   input.accept = '.json';
    echo   input.onchange = e =^> BackupManager.import(e.target.files[0]);
    echo   input.click();
    echo.
    pause
    goto menu
)

if "%choice%"=="7" (
    echo 退出
    exit /b
)

echo.
echo 无效选择，请输入 1-7
echo.
goto menu

:end
echo.
echo ========================================
echo 关闭浏览器即可退出程序
echo ========================================
pause
