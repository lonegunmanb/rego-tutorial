# 第二步：跨类型比较与类型安全函数

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
echo '{}' > input.json
```

## 跨类型比较的意外结果

OPA 中，不同类型的数据也可以比较大小，且不会报错。类型之间的大小关系是固定的：

```
null < boolean < number < string < array < set < object
```

```bash
cat > policy/cross_type.rego << 'EOF'
package pitfalls

import rego.v1

output1__cross_type if {
  "a" > 1        # 字符串永远大于数值 → true
  1 > true       # 数值永远大于布尔 → true
  true > null    # 布尔永远大于 null → true
}

# 这个结果是 true！"0"（字符串）大于 3（数值）
output2__string_zero_gt_three := "0" > 3
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

**output2__string_zero_gt_three** 为 **true**——字符串 **"0"** 大于数值 **3**，因为字符串类型永远大于数值类型。

## 在实际场景中的危害

假设我们有一条策略：当用户的 **access_level** 大于 3 时允许访问。如果输入数据中 **access_level** 意外地是字符串类型：

```bash
rm -f policy/*.rego
cat > policy/access_check.rego << 'EOF'
package pitfalls

import rego.v1

# 不安全的写法：没有类型检查
allow_unsafe if {
  input.access_level > 3
}

# 安全的写法：先检查类型
allow_safe if {
  is_number(input.access_level)
  input.access_level > 3
}
EOF
```

先用正确的数值类型测试：

```bash
echo '{"access_level": 5}' > input.json
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

两条规则都输出 **true**，看起来没问题。

现在模拟脏数据——**access_level** 是字符串 **"0"**：

```bash
echo '{"access_level": "0"}' > input.json
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

**allow_unsafe** 为 **true**（因为字符串 > 数值），而 **allow_safe** 不出现（**is_number** 阻止了比较）。在生产环境中，这可能意味着一个本不该有权限的用户获得了访问权。

## 定义类型安全比较函数

每次都手动加 **is_number** 检查很容易遗漏。更好的方式是封装成类型安全比较函数：

```bash
rm -f policy/*.rego
cat > policy/safe_compare.rego << 'EOF'
package pitfalls

import rego.v1

# 类型安全的"大于"比较函数
greater_than(a, b) := true if {
  _validate_compare(a, b)
  a > b
}

greater_than(a, b) := false if {
  _validate_compare(a, b)
  a <= b
}

# 类型验证：要求两边类型相同，且是可比较类型
_validate_compare(a, b) := false if {
  type_name(a) != type_name(b)
  print(sprintf("WARN: comparing %v against %v", [type_name(a), type_name(b)]))
} else := false if {
  not type_name(a) in {"boolean", "number", "string"}
  print(sprintf("WARN: cannot compare type %v", [type_name(a)]))
} else := true

# 使用类型安全函数
allow if {
  greater_than(input.access_level, 3)
}
EOF
```

用数值测试：

```bash
echo '{"access_level": 5}' > input.json
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

**allow** 为 **true**。

用字符串测试：

```bash
echo '{"access_level": "0"}' > input.json
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

**allow** 不出现——类型验证阻止了比较。注意观察控制台可能输出的 **WARN** 信息。

```bash
echo '{}' > input.json
```
