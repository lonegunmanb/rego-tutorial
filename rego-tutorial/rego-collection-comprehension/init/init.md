# 集合声明与生成表达式

本次实验你将学习 Rego 中创建集合的两种主要方式：

1. **JSON 语法直接枚举**：用数组/对象/集合字面量声明集合
2. **生成表达式（comprehension）**：从已有集合中按条件筛选或变换，生成新的 Set、Array 或 Object

## 准备工作

环境已预装 OPA。进入工作目录：

```bash
cd /root/workspace
mkdir -p policy
```
