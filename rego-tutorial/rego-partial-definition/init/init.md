# 部分定义（Partial Definition）

本次实验你将学习 Rego 中**部分定义**的核心技术：

1. **`contains` 部分定义 Set**：逐条向集合中添加元素
2. **`[]` 部分定义 Object**：逐条向对象中添加键值对
3. **v0 `deny[msg]` 语法对比 v1 `contains` 语法**
4. **带条件的批量部分定义**：结合迭代与条件动态构建集合
5. **复杂表达式与数组限制**

## 准备工作

环境已预装 OPA。进入工作目录：

```bash
cd /root/workspace
mkdir -p policy
```
