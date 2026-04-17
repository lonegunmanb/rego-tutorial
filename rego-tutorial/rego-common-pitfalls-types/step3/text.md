# 第三步：部分定义的默认值陷阱

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
echo '{}' > input.json
```

## 回顾：条件不成立时规则变量的行为

当规则条件不满足时，变量不会被赋值——它是"未定义"的：

```bash
cat > policy/no_default.rego << 'EOF'
package pitfalls

import rego.v1

# 条件不成立 → 变量不存在
output1 := 1 if {
  1 == 2
}

# 赋值出错 → 变量也不存在
output2 := {"key1": 1/0} if {
  1 == 1
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

输出是空对象 **{}**——两条规则的变量都未被赋值。

## default 显式默认值

我们可以用 **default** 显式设置默认值：

```bash
rm -f policy/*.rego
cat > policy/explicit_default.rego << 'EOF'
package pitfalls

import rego.v1

output1 := 1 if {
  1 == 2
}
default output1 := 100

output2 := {"key1": 1/0} if {
  1 == 1
}
default output2 := {"key1": 100}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

现在 **output1** 为 **100**，**output2** 为 **{"key1": 100}**——显式默认值生效了。

## 部分定义的隐式默认值

接下来是陷阱所在——部分定义规则会**自动产生空集合/空对象作为默认值**：

```bash
rm -f policy/*.rego
cat > policy/partial_default.rego << 'EOF'
package pitfalls

import rego.v1

# 部分定义（对象）：条件不成立 → 自动得到空对象 {}
output1__partial["key1"] := "val1" if {
  1 == 2
}

# 完整定义（对象）：条件不成立 → 变量未定义
output2__complete := {"key1": "val1"} if {
  1 == 2
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

注意观察输出：**output1__partial** 的值是 **{}**（空对象），而 **output2__complete** 完全不存在！

## 隐式默认值的影响

这个差异在用作条件判断时会产生完全不同的结果：

```bash
rm -f policy/*.rego
cat > policy/partial_condition.rego << 'EOF'
package pitfalls

import rego.v1

# 部分定义 → 自动得到 {}
output1__partial["key1"] := "val1" if {
  1 == 2
}

# 完整定义 → 未定义
output2__complete := {"key1": "val1"} if {
  1 == 2
}

# 用部分定义的结果做条件 → 成功！（{} 是有效值）
output3__partial_exists if {
  output1__partial
}

# 用完整定义的结果做条件 → 失败（未定义值）
output4__complete_exists if {
  output2__complete
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

**output3__partial_exists** 为 **true**——因为 **{}** 空对象是一个有效的非 **false** 值，作为条件时被视为"成功"。而 **output4__complete_exists** 不出现。

## 对 set 的部分定义同样如此

```bash
rm -f policy/*.rego
cat > policy/partial_set.rego << 'EOF'
package pitfalls

import rego.v1

# 部分定义 set：条件不成立 → 自动得到空集合
denied contains msg if {
  msg := "something wrong"
  1 == 2
}

# 用 denied 做条件 → 成功！（空集合也是有效值）
has_denied_rules if {
  denied
}

# 正确的检查方式：检查集合是否非空
has_real_denied if {
  count(denied) > 0
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

**has_denied_rules** 为 **true**（空集合作为条件为真），而 **has_real_denied** 不出现（**count** 为 0）。

**教训**：如果要检查部分定义的集合是否"真的有内容"，用 **count(xxx) > 0**，而不是直接把它放在条件中。
