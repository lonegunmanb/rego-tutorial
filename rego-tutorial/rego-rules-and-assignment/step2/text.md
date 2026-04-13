# 第二步：条件赋值与 default 关键字

## 条件赋值

现在让我们让规则变得更有意义——根据输入数据来决定输出。修改策略文件：

```bash
cat > policy/play.rego << 'EOF'
package main

import rego.v1

allow_review := true if {
  input.role == "customer"
}

warn contains "allow_review = true" if {
  allow_review
}
EOF
```

这里我们使用了**条件赋值**语句：只有在 `if` 后面括号对内的表达式返回 `true` 时，`allow_review := true` 这个赋值才会发生。

创建一个角色为 `customer` 的输入文件：

```bash
cat > input.json << 'EOF'
{
    "role": "customer"
}
EOF
```

运行 conftest 测试：

```bash
conftest test input.json -p policy/
```

你应该能看到一条警告，说明 `allow_review` 的值为 `true`。

现在把输入改成 `guest`：

```bash
cat > input.json << 'EOF'
{
    "role": "guest"
}
EOF
```

再运行一次：

```bash
conftest test input.json -p policy/
```

你会发现，这次没有任何警告输出——当 `role` 不是 `customer` 时，`allow_review` 的赋值并没有发生，变量**未定义**。这是 Rego 的一个重要特性：条件不成立时，赋值不会发生，变量不会被定义。

## default 关键字

假如我们希望在判断不成立的情况下 `allow_review` 也能返回一个明确的 `false`，可以使用 `default` 关键字：

```bash
cat > policy/play.rego << 'EOF'
package main

import rego.v1

default allow_review := false

allow_review := true if {
  input.role == "customer"
}

warn contains msg if {
  msg := sprintf("allow_review = %v", [allow_review])
}
EOF
```

`default` 给 `allow_review` 设置了一个默认值 `false`。如果后面的条件规则都不成立，它就会被赋予这个默认值。

用 `guest` 的输入测试一下：

```bash
conftest test input.json -p policy/
```

现在即使条件不成立，你也能看到警告信息显示 `allow_review = false`——变量有了明确的默认值。

再换回 `customer` 试试：

```bash
cat > input.json << 'EOF'
{
    "role": "customer"
}
EOF
conftest test input.json -p policy/
```

条件成立时，`allow_review` 的值为 `true`，覆盖了默认值。

## 清理

```bash
rm -f policy/play.rego input.json
```
