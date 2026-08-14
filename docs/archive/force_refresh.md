# 紧急：强制刷新GitHub Pages缓存

## 立即执行步骤

### 第一步：触发GitHub重新部署

**方法A：通过GitHub网站操作**
1. 访问：https://github.com/xinglianyue/finance-tool/settings/pages
2. 找到 "Build and deployment" 部分
3. 点击 "View logs" 查看最新部署日志
4. 点击页面底部的 "Deploy to GitHub Pages" 按钮（如果存在）
5. 或者点击 "Restart deployment" 重新开始部署

**方法B：通过API触发**
```bash
# 在PowerShell或cmd中运行
curl -X POST https://api.github.com/repos/xinglianyue/finance-tool/deployments \
  -H "Authorization: token [YOUR_GITHUB_TOKEN]" \
  -H "Accept: application/vnd.github.v3+json" \
  -d '{"ref":"main","description":"Force rebuild"}'
```

### 第二步：清除JSdelivr CDN缓存

GitHub Pages使用jsdelivr作为CDN，需要清除其缓存：

```bash
# 清除index-new.html缓存
curl -X DELETE "https://purge.jsdelivr.net/gh/xinglianyue/finance-tool@main/index-new.html"

# 清除data-store.js缓存
curl -X DELETE "https://purge.jsdelivr.net/gh/xinglianyue/finance-tool@main/js/data-store.js"

# 清除state-manager.js缓存
curl -X DELETE "https://purge.jsdelivr.net/gh/xinglianyue/finance-tool@main/js/state-manager.js"

# 清除xlsx缓存
curl -X DELETE "https://purge.jsdelivr.net/gh/xinglianyue/finance-tool@main/js/xlsx.full.min.js"
```

如果没有curl，可以直接在浏览器访问这些URL（会返回200或404，表示缓存已清除）

### 第三步：彻底清除本地缓存

**清除浏览器所有缓存：**
```
1. 打开浏览器设置
2. 搜索"清除浏览数据"
3. 时间范围：全部时间
4. 勾选：
   - 浏览历史
   - Cookie和其他站点数据
   - 缓存的图片和文件
5. 点击清除
6. 关闭所有浏览器窗口
7. 等待10分钟
```

**清除DNS缓存：**
```
按 Win + R，输入 cmd，执行：
ipconfig /flushdns
```

### 第四步：验证部署状态

**检查最新提交是否已推送到main分支：**
```bash
cd C:\Users\xinxi\Desktop\财务工具
git log --oneline origin/main -3
```

**访问Raw URL验证内容（绕过Pages）：**
访问：https://raw.githubusercontent.com/xinglianyue/finance-tool/main/index-new.html

然后按 Ctrl+F 搜索 "data-store.js"，确认版本号是否为 `v=1785809667` 或更新的数字

**如果Raw URL显示正确版本：**
说明代码已更新，只是GitHub Pages缓存问题。继续等待5-10分钟让Pages重新构建。

**如果Raw URL显示旧版本：**
需要重新推送代码。

### 第五步：使用无缓存方式访问

**临时解决方案：**
在URL后添加随机参数强制绕过缓存：
```
https://xinglianyue.github.io/finance-tool/index-new.html?t=1785809667
```

或使用GitHub Pages的原始URL（如果有配置的话）

## 验证清单

在完成上述步骤后，请按以下顺序验证：

- [ ] Git最新提交包含正确的版本号
- [ ] GitHub Actions部署成功（检查Actions标签页）
- [ ] Raw URL显示正确内容
- [ ] 浏览器Network标签显示加载的是新文件
- [ ] Console不再显示旧的版本号错误

## 备用方案

如果以上方法都不行：

**方案1：创建新的GitHub Pages分支**
```bash
git checkout -b gh-pages
git push -u origin gh-pages
```
然后在GitHub设置中将Pages分支改为gh-pages

**方案2：使用其他静态托管服务**
将项目部署到Vercel、Netlify等更快缓存的服务

---

**紧急联系：** 如果问题持续，可能需要检查GitHub的status页面：https://www.githubstatus.com/