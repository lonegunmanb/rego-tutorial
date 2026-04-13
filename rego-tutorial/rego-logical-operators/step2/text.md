# 第二步：逻辑或（OR）—— 同名规则实现或

## 清理上一步文件

```bash
cd /root/workspace
rm -f policy/and.rego
```

## 编写逻辑或规则

Rego 没有 `||` 或 `OR` 操作符。要实现逻辑或，需要声明**多个同名的规则**——可以把它想象成并联电路，任意一边通电就算通。

假设我们的访问控制逻辑是：角色为 `customer` 且声誉 >= 0，**或者**角色为 `admin`，就允许评论。

```bash
cat > policy/or.rego << 'EOF'
package main

import rego.v1

default allow_review := false

allow_review := true if {
  valid_user
}

valid_user := true if {
  input.role == "customer"
  input.reputation >= 0
}

valid_user := true if {
  input.role == "admin"
}
EOF
```

这里 `valid_user` 有两条规则定义，任意一条成立都会使 `valid_user` 被赋值为 `true`。

## 测试：customer 路径

```bash
cat > input.json << 'EOF'
{
    "role": "customer",
    "reputation": 10
}
EOF
```

```bash
conftest test input.json -p policy/ --all-namespaces
```

`allow_review` 为 `true`——因为 customer 路径成立。

## 测试：admin 路径

```bash
cat > input.json << 'EOF'
{
    "role": "admin"
}
EOF
```

```bash
conftest test input.json -p policy/ --all-namespaces
```

`allow_review` 同样为 `true`——虽然 customer 那条分支不成立，但 admin 分支成立了，这就是逻辑或。

## 测试：两条路径都不满足

```bash
cat > input.json << 'EOF'
{
    "role": "guest"
}
EOF
```

```bash
conftest test input.json -p policy/ --all-namespaces
```

这次 `allow_review` 为 `false`（使用了 `default` 默认值），因为两条路径都不满足。

> 💡 **要点**：在 Rego 中，通过声明多个同名规则来实现逻辑或。任意一条规则成立，变量就会被赋值。
