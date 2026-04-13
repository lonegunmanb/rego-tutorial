# 第三步：不可赋予不同的值

## 清理上一步文件

```bash
cd /root/workspace
rm -f policy/or.rego
```

## 只有一条规则成立时

当同名规则给变量赋予不同的值，但只有一条成立时，不会出错：

```bash
cat > policy/conflict.rego << 'EOF'
package main

import rego.v1

result := "yes" if {
    1 == 1
}

result := "no" if {
    1 == 2
}

warn contains msg if {
    msg := sprintf("result = %s", [result])
}
EOF
```

```bash
cat > input.json << 'EOF'
{}
EOF
```

```bash
conftest test input.json -p policy/
```

只有第一条规则成立，所以 `result` 为 `"yes"`，运行正常。你应该能看到一条警告显示 `result = yes`。

## 两条规则都成立时——冲突错误

现在修改代码，让两条规则都成立：

```bash
cat > policy/conflict.rego << 'EOF'
package main

import rego.v1

result := "yes" if {
    true
}

result := "no" if {
    true
}

warn contains msg if {
    msg := sprintf("result = %s", [result])
}
EOF
```

```bash
conftest test input.json -p policy/
```

你会看到一个错误：

```text
eval_conflict_error: complete rules must not produce multiple outputs
```

`result` 不能同时被赋予 `"yes"` 和 `"no"` 两个不同的值。

## 重要原则

在 Rego 中，**同一个规则在任何情况下，要么不成立，要么只能被赋予同样的值**。这就是为什么在逻辑或的例子中，我们让两条 `valid_user` 规则都赋值为 `true`——值必须相同。

```bash
rm -f policy/conflict.rego
```

> 💡 **要点**：如果需要在不同条件分支返回不同的值（比如不同的错误信息），应该使用"部分定义"（`deny contains msg if`），而不是对同一个规则赋不同的值。
