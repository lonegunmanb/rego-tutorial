# 迭代（Iteration）

Rego 没有传统的 `for` 循环，而是通过 `some ... in ...` 语法枚举集合成员、建立绑定关系。只要集合中**至少有一条路径**能让所有条件同时成立，规则就会成功。

本次实验你将学习：

1. 用 `some item in collection` 迭代集合与数组
2. 用 `some key, value in collection` 进行键值对迭代，以及用 `_` 忽略不需要的维度
3. 嵌套多重迭代，以及更简洁的自由迭代形式

## 准备工作

环境已预装 OPA。进入工作目录：

```bash
cd /root/workspace
mkdir -p policy
```
