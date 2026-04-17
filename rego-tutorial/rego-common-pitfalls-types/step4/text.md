# 第四步：命名遮蔽陷阱

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
echo '{}' > input.json
```

## 局部变量遮蔽全局变量

在子作用域中声明与外部同名的变量时，会发生命名遮蔽——局部变量"挡住"了全局变量：

```bash
cat > policy/shadow_var.rego << 'EOF'
package pitfalls

import rego.v1

var1 := "hello"

# 引用全局变量 → 成立
output1 if {
  var1 == "hello"
}

# 声明同名局部变量 → 遮蔽了全局变量
output2 if {
  var1 := "goodbye"
  var1 == "hello"        # 这里的 var1 是局部变量 "goodbye"
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

**output1** 为 **true**，**output2** 不出现——因为局部变量 **var1** 的值是 **"goodbye"**，不等于 **"hello"**。

## 自定义函数遮蔽内建函数

更隐蔽的场景是自定义函数与内建函数同名：

```bash
rm -f policy/*.rego
cat > policy/shadow_builtin.rego << 'EOF'
package pitfalls

import rego.v1

# 期望调用内建的 strings.replace("ab", "b", "bc") → "abc"
output1 := replace("ab", "b", "bc")

# 自定义的 replace 函数遮蔽了内建 replace
replace(item, old, new) := result if {
  result := _replace_one(item, old, new)
}

_replace_one(item, old, new) := new if {
  item == old
}

_replace_one(item, old, _) := item if {
  item != old
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

**output1** 的值是 **"ab"**——而不是期望的 **"abc"**！自定义的 **replace** 函数只做了简单的"整体匹配替换"，**"ab"** 不等于 **"b"**（**item != old**），所以返回了原值。

## 遮蔽内建操作符

Rego 的比较操作符本质上也是函数。例如 **>** 的函数名是 **gt**。如果你不小心定义了一个叫 **gt** 的函数：

```bash
rm -f policy/*.rego
cat > policy/shadow_operator.rego << 'EOF'
package pitfalls

import rego.v1

# 期望 7 > 2022 → false
output1 := (7 > 2022)

# 自定义的 gt 函数遮蔽了内建 > 操作符！
gt(version, year) := sprintf("Gran Turismo %v (%v)", [version, year])
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

**output1** 的值不是 **false**，而是 **"Gran Turismo 7 (2022)"**！**>** 操作符被自定义的 **gt** 函数劫持了。

## 为什么 Rego 允许这种行为？

这种设计有合理的原因：

1. **向前兼容**：如果不允许遮蔽，每次 OPA 新增内建关键字时，已有代码都需要修改
2. **命名自由**：包作者可以自由选择名称
3. **局部行为**：遮蔽只影响当前包，不影响其他包

不过，OPA 的编译时类型检查能发现大部分遮蔽问题。

## 如何避免

```bash
rm -f policy/*.rego
cat > policy/avoid_shadow.rego << 'EOF'
package pitfalls

import rego.v1

# 不好的命名（容易遮蔽内建名称）
# replace(...), gt(...), lt(...), count(...), max(...), min(...)

# 好的命名（加前缀或上下文）
my_replace(item, old, new) := result if {
  result := concat("", split(item, old))
}

safe_gt(a, b) := true if {
  type_name(a) == type_name(b)
  a > b
}

output1 := my_replace("ab", "b", "")
output2 := safe_gt(5, 3)

# 内建函数不受影响
output3 := replace("ab", "b", "bc")
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

**output1** 为 **"a"**，**output2** 为 **true**，**output3** 为 **"abc"**——自定义函数和内建函数各司其职，互不干扰。

**最佳实践**：
- 避免使用 **gt**、**lt**、**gte**、**lte**、**eq**、**neq**、**replace**、**count**、**max**、**min** 等与内建名称相同的函数名
- 为自定义函数加上有意义的前缀（如业务领域前缀）
- 如果怀疑名称冲突，可以用 **opa check --strict** 检查
