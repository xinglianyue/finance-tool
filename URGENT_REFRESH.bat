@echo off
chcp 65001 >nul
echo ========================================
echo 紧急刷新GitHub Pages缓存脚本
echo ========================================
echo.

:: 1. 清除JSdelivr CDN缓存
echo [1/4] 清除JSdelivr CDN缓存...
echo.

echo - 清除index-new.html缓存
curl -X DELETE "https://purge.jsdelivr.net/gh/xinglianyue/finance-tool@main/index-new.html" -s
echo.

echo - 清除data-store.js缓存
curl -X DELETE "https://purge.jsdelivr.net/gh/xinglianyue/finance-tool@main/js/data-store.js" -s
echo.

echo - 清除state-manager.js缓存
curl -X DELETE "https://purge.jsdelivr.net/gh/xinglianyue/finance-tool@main/js/state-manager.js" -s
echo.

echo - 清除xlsx缓存
curl -X DELETE "https://purge.jsdelivr.net/gh/xinglianyue/finance-tool@main/js/xlsx.full.min.js" -s
echo.

:: 2. 清除DNS缓存
echo [2/4] 清除DNS缓存...
ipconfig /flushdns
if %errorlevel%==0 (
    echo ✓ DNS缓存已清除
) else (
    echo ✗ DNS缓存清除失败，请以管理员身份运行
)
echo.

:: 3. 验证Git状态
echo [3/4] 验证Git状态...
git log --oneline -3
echo.

:: 4. 显示下一步操作
echo [4/4] 下一步操作指南
echo ========================================
echo.
echo 已完成自动刷新操作！
echo.
echo 请执行以下步骤：
echo.
echo 1. 打开浏览器，按 Ctrl+Shift+Delete
echo    - 选择"全部时间"
echo    - 勾选"缓存的图片和文件"
echo    - 点击"清除数据"
echo.
echo 2. 关闭所有浏览器窗口
echo.
echo 3. 等待5分钟让GitHub重新部署
echo.
echo 4. 使用无痕模式访问：
echo    https://xinglianyue.github.io/finance-tool/index-new.html?t=%date:~0,4%%date:~5,2%%date:~8,2%
echo.
echo 5. 如果还有问题，请访问Raw URL验证：
echo    https://raw.githubusercontent.com/xinglianyue/finance-tool/main/index-new.html
echo    (按Ctrl+F搜索"data-store"确认版本号)
echo.
echo ========================================
pause