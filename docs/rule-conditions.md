---
order: 5
title: 规则条件详解与小测验
---

# 规则条件详解与小测验

在前面的章节中我们已经多次使用了 `if {}` 中的条件表达式。本章将系统地梳理 Rego 中四种不同类型的规则条件，并通过小测验来巩固你的理解。

## 四类规则条件

Rego 中的规则条件可以被分为以下四类：

1. **常规条件** —— 求值成功且不为 `false` 即为成功
2. **逻辑非条件** —— 用 `not` 反转条件的成功/失败
3. **赋值语句条件** —— 赋值失败会导致规则失败
4. **集合成员条件** —— 用 `in` 检查成员是否属于集合

### 常规条件

常规条件是 Rego 中最常见的一种规则条件。核心规则是：**所有可以成功求值，并且值不为 `false` 的表达式**，都等同于 `true`。

以下所有表达式在规则条件中都等同于 `true`：

```rego
all_values_other_than_false_succeed if {
  true         # true
  3 == 3       # true
  "a" == "a"   # true
  3.14         # number
  -1           # number
  abs(-1)      # number
  3 + 4 * 10   # number
  "a string"   # string
  upper("str") # string
  [1, "a"]     # array
  {1, "a"}     # set
  {"k": "v"}   # object
}
```

**Rego 中没有 falsy 的概念！** 以下这些在其他语言中通常被视为 `false` 的值，在 Rego 中也等同于 `true`：

```rego
even_falsy_values_succeed if {
  0            # zero
  ""           # empty string
  []           # empty array
  {}           # empty object
  {1} - {1}    # empty set
  null         # JSON null
}
```

产生布尔类型 `false` 值的表达式被认定为失败：

```rego
output1 if { false }           # 布尔字面量 false
output2 if { 1 == 2 }          # 比较结果为 false
output3 if { is_number("a") }  # 函数返回 false
```

无法顺利求值的表达式（undefined）也等同于失败：

```rego
output4 if { input.no_such_field }       # 无效路径引用
output5 if { 0 / 0 }                     # 除零错误
output6 if { to_number("not a number") } # 转换失败
```

### 逻辑非条件

`not` 可以把原来失败的条件转为成功的，把原来成功的条件转为失败的：

```rego
# 以下条件全部成功（取反失败的表达式）
output1 := true if {
  not false
  not 1 == 2
  not input.no_such_path
}
```

```rego
# 以下条件全部失败（取反成功的表达式）
output2 := true if {
  not true
  not 1 == 1
  not 1
  not 0       # 注意：0 在 Rego 中不是 false！
  not "str"
  not ""      # 注意：空字符串在 Rego 中不是 false！
  not null    # 注意：null 在 Rego 中不是 false！
}
```

> ⚠️ **反直觉的陷阱**：`not` 与函数调用结合使用时，如果函数参数包含无效路径引用，即使加了 `not` 也会直接返回失败。我们将在"常见陷阱"章节中详细介绍。

### 赋值语句条件

规则中的赋值语句本身也是条件。赋值成功则条件成功，赋值失败则整条规则失败：

```rego
# 成功的赋值（即使赋值 false 也算成功）
output1 if {
  var1 := 1 + 2          # 成功
  var2 := upper("str")   # 成功
  var3 := false          # 赋值 false 也是成功的！
}
```

```rego
# 失败的赋值
output2 if { var1 := input.no_such_field }       # 无效路径
output3 if { var2 := 5 / 0 }                     # 除零错误
output4 if { var3 := to_number("not a number") } # 转换失败
```

关键区别：**`var := false` 是成功的**（赋值操作本身成功了），但在后续条件中直接使用 `var` 会失败（因为 `var` 的值是 `false`）。

### 集合成员条件

使用 `in` 关键字检查成员是否属于集合：

```rego
set1 := {"member1", "member2"}
array1 := ["member1", "member2"]
object1 := { "key1": "value1", "key2": "value2" }

# 成功的成员检查
output1 if {
  "member1" in set1       # set 中的成员
  "member1" in array1     # array 中的元素
  "value1" in object1     # object 中的值（注意：是值，不是键！）
}

# 失败的成员检查
output2 if {
  "key1" in object1       # "key1" 是键不是值，失败！
  1 in array1             # 1 是索引不是元素，失败！
}
```

也可以使用 `some` 关键字配合 `in` 检查键或索引是否存在：

```rego
output3 if {
  some 0, _ in array1           # 索引 0 存在
  some "key1", _ in object1     # 键 "key1" 存在
}
```

> ⚠️ 不要用 `array[index]` 来检查索引是否存在，因为如果该位置的值恰好是 `false`，条件会失败。应使用 `some index, _ in array`。

## 规则条件小测验

请判断以下每条规则是否成功（答案在动手实验中验证）：

```rego
rule1 := true if { true }
rule2 := true if { false }
rule3 := true if { not true }
rule4 := true if { not false }
rule5 := true if { null }
rule6 := true if { not null }
rule7 := true if { 100 / 0 }
rule8 := true if { not 100 / 0 }
rule9 := true if { var := true }
rule10 := true if { var := false }
rule11 := true if { var := 100 / 0 }
rule12 := true if { var := false; var }
rule13 := true if { var := false; not var }
```

<details>
<summary>点击查看答案</summary>

| 规则 | 结果 | 解释 |
|------|------|------|
| rule1 | ✅ 成功 | `true` 是成功的 |
| rule2 | ❌ 失败 | `false` 是失败的 |
| rule3 | ❌ 失败 | `not true` → 失败 |
| rule4 | ✅ 成功 | `not false` → 成功 |
| rule5 | ✅ 成功 | `null` 不是 `false`，是成功的 |
| rule6 | ❌ 失败 | `null` 是成功的，`not` 反转为失败 |
| rule7 | ❌ 失败 | 除零是 undefined，等同于失败 |
| rule8 | ✅ 成功 | undefined 经 `not` 反转为成功 |
| rule9 | ✅ 成功 | 赋值操作本身成功 |
| rule10 | ✅ 成功 | 赋值 `false` 的操作本身也是成功的！ |
| rule11 | ❌ 失败 | 除零导致赋值失败 |
| rule12 | ❌ 失败 | `var` 为 `false`，作为条件失败 |
| rule13 | ✅ 成功 | `var` 为 `false`，`not var` 成功 |

</details>

## 动手实验

<KillercodaEmbed src="https://killercoda.com/rego-tutorial/course/rego-tutorial/rego-rule-conditions" />
