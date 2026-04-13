# 第一步：逻辑与（AND）—— 条件按顺序书写

进入工作目录：

```bash
cd /root/workspace
```

## 编写逻辑与规则

在大多数编程语言中，逻辑与用 `&&` 或 `AND` 来表示。但在 Rego 中，你只需要把多个条件按顺序写出来，它们之间就自动构成了逻辑与的关系——就像串联电路，所有条件都必须成立，整条规则才算成立。

创建策略文件，实现一个"是否允许评论"的规则——角色必须是 `customer`，**并且**声誉必须大于等于 `0`：

```bash
cat > policy/and.rego << 'EOF'
package main

import rego.v1

deny contains msg if {
  input.role != "customer"
  msg := "拒绝：角色不是 customer"
}

deny contains msg if {
  input.reputation < 0
  msg := "拒绝：声誉值小于 0"
}
EOF
```

## 测试：两个条件都满足

创建一个合格的输入：

```bash
cat > input.json << 'EOF'
{
    "role": "customer",
    "reputation": 10
}
EOF
```

运行检查：

```bash
conftest test input.json -p policy/
```

你应该看到检查通过——角色是 `customer` 并且声誉大于等于 `0`，没有任何违规。

## 测试：角色不满足

将角色改为 `guest`：

```bash
cat > input.json << 'EOF'
{
    "role": "guest",
    "reputation": 10
}
EOF
```

```bash
conftest test input.json -p policy/
```

你应该看到拒绝信息——角色不是 `customer`。

## 测试：声誉不满足

```bash
cat > input.json << 'EOF'
{
    "role": "customer",
    "reputation": -5
}
EOF
```

```bash
conftest test input.json -p policy/
```

同样会看到拒绝信息——声誉值小于 `0`。

> 💡 **要点**：在 Rego 中，规则体 `if { ... }` 里的多个条件是逻辑与的关系。所有条件都成立，规则才成立。
