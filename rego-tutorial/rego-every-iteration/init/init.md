# every 全量迭代

本次实验你将学习 Rego 中的 `every` 关键字：

1. **AllOf 语义**：确保集合中的每一个成员都满足条件
2. **在 every 中实现逻辑或**：利用 `in` 操作符和辅助函数
3. **some + every 组合模式**：先筛选子集，再全量检查

## 准备工作

环境已预装 OPA。进入工作目录：

```bash
cd /root/workspace
mkdir -p policy
```
