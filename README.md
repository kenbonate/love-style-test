# 💕 恋爱风格深度测评

> 基于依恋理论 · 爱情三角理论 · 情绪表达研究 | 60题专业版 | 5维度全面解析

---

## 🎯 测试简介

从**依恋安全感、亲密开放度、浪漫表达力、关系理性度、冲突修复力**五个核心维度，深度解析你的恋爱风格。

- 📋 **60道题目**，5级评分（😤→😆）
- 📊 **4 Tab 报告页**：维度总览 / 深度解读 / 组合分析 / 成长建议
- 🔍 **25份详细报告**（5维度 × 5等级 × 12板块）
- 🧩 **6种组合恋爱类型**匹配
- ⏱️ 约5-8分钟完成

## 🚀 一键部署到 GitHub Pages（免费）

### 第 1 步：创建 GitHub 仓库
1. 打开 https://github.com/new
2. Repository name 填写：`love-style-test`（或任意名称）
3. **不要**勾选 "Add a README file"
4. 点击 "Create repository"

### 第 2 步：推送代码
```bash
cd love-style
git remote add origin https://github.com/你的用户名/love-style-test.git
git branch -M main
git push -u origin main
```

### 第 3 步：开启 GitHub Pages
1. 进入仓库 → Settings → Pages
2. Source 选择 "Deploy from a branch"
3. Branch 选择 `main`，文件夹选择 `/ (root)`
4. 点击 Save
5. **1-2分钟后**，你的测试链接就生成了：
   `https://你的用户名.github.io/love-style-test/`

### 第 4 步：分享到小红书！
把链接复制到小红书笔记、个人简介或评论中，即可开始变现。

---

## 📂 项目结构

```
love-style/
├── index.html            # 页面壳
├── styles.css            # 浪漫粉色主题样式
├── app.js                # 评分引擎 + 报告渲染
├── config.json           # 题目/维度/等级配置（可修改）
├── config-data.js        # 嵌入式配置（file:// 协议回退）
├── report-templates.js   # 详细报告模板（可修改）
└── README.md
```

## 🎨 定制你自己的测试

修改 `config.json` 换题目，修改 `report-templates.js` 换报告内容。详见 [test-factory](../test-factory/README.md)。

---

## 📝 理论基础

- **依恋理论** (Attachment Theory) — John Bowlby & Mary Ainsworth
- **爱情三角理论** (Triangular Theory of Love) — Robert Sternberg
- **情绪表达研究** — 情感开放度与关系满意度相关研究

---

## ⚠️ 免责声明

本测评基于公开学术资源改编，结果仅供自我探索参考，不构成婚恋建议或临床诊断。
