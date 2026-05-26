
# Git 工作流程说明

## 分支策略

- **master分支**：稳定版本，用于发布和上传到GitHub
- **dev分支**：开发版本，用于日常开发

## 日常开发流程

### 1. 开始新功能开发
```bash
# 切换到dev分支
git checkout dev

# 拉取最新代码（如果有远程仓库）
git pull origin dev
```

### 2. 开发完成后测试
在dev分支上完成开发和测试，确认没问题后再合并到master。

### 3. 合并到master（发布版本）
```bash
# 先切换到master
git checkout master

# 合并dev分支
git merge dev

# 提交（如果需要）
git commit -m "发布新版本"

# 推送到GitHub
git push origin master
```

### 4. 继续开发
```bash
# 切回dev分支
git checkout dev
```

## 如果master出问题怎么办？

可以随时从master回退到之前的稳定版本：
```bash
# 查看提交历史
git log

# 回退到某个版本（例如上一个版本）
git reset --hard HEAD~1
```

## 连接到GitHub的步骤

1. 在GitHub上创建新仓库（不要初始化README）
2. 在本地添加远程仓库：
```bash
git remote add origin https://github.com/你的用户名/仓库名.git
```
3. 推送到GitHub：
```bash
git push -u origin master
git push -u origin dev
```

