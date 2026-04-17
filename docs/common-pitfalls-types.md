---
order: 11
title: 常见陷阱（上）：类型与比较
---

# 常见陷阱（上）：类型与比较

上一章我们学习了 `every` 全量迭代。从本章开始，我们将用两章的篇幅汇总 Rego 中最常见的**陷阱**——这些看似简单的细节，如果不小心处理，很可能在生产环境中导致匪夷所思的结果。

本章聚焦于**类型与比较**相关的陷阱，包括集合/对象比较、跨类型比较、部分定义的默认值，以及命名遮蔽。

## 集合与对象的比较陷阱

Rego 中数值、字符串、数组之间的比较运算与大多数语言一致：

```rego
import rego.v1

output1__same_type if {
  3 > 1                      # 数值比较
  true > false               # 布尔比较
  "b" > "a"                  # 字符串按字典序比较
  "b" > "ac"                 # "b" > "a"，所以 "b" > "ac"
  "ada" > "ac"               # "d" > "c"
  "ba" > "b"                 # 前缀相同时，更长的字符串更大
  ["b"] > ["a"]              # 数组也按字典序
  ["b"] > ["a", "c"]         # 同理
  ["a", "d", "a"] > ["a", "c"]
  ["b", "a"] > ["b"]         # 前缀相同时，更长的数组更大
}
```

数组之间的比较之所以有确定结果，是因为数组成员有明确且唯一的顺序。然而，**集合（set）与集合、对象（object）与对象**之间的大小比较并不可靠——因为它们的成员顺序是不确定的，甚至在不同版本的 OPA 中可能不同。

> ⚠️ **规则**：避免在集合与集合、对象与对象之间使用 `>`、`<`、`>=`、`<=` 比较大小。判断相等 `==` 是安全的，比较大小是不安全的。

## 跨类型比较陷阱

这大概是 Rego 中最令人意外的特性之一：**不同类型的数据也可以比较大小**，而且不会报错。

在 OPA 中，不同类型之间有一套固定的大小关系：

```
null < boolean < number < string < array < set < object
```

也就是说：

```rego
import rego.v1

output2__cross_type if {
  "a" > 1        # 字符串永远大于数值
  1 > true       # 数值永远大于布尔
  true > null    # 布尔永远大于 null
}
```

这意味着 `"0" > 3` 的结果是 `true`！在处理用户输入数据时，如果某个字段本应是数值却传入了字符串，很可能导致策略判断完全相反。

### 手动类型检查

最直接的办法是在比较前检查类型：

```rego
import rego.v1

allow if {
  is_number(input.access_level)
  input.access_level > 3
}
```

但这种做法有两个问题：代码中会充斥大量冗余的类型检查，而且很容易遗漏。

### 类型安全比较函数

更稳妥的做法是定义一组**类型安全的比较函数**，在类型不匹配时阻止比较并发出警告：

```rego
import rego.v1

greater_than(a, b) := true if {
  strictly_validate(a, b)
  a > b
}

greater_than(a, b) := false if {
  strictly_validate(a, b)
  a <= b
}

strictly_validate(a, b) := false if {
  type_name(a) != type_name(b)
  print(sprintf("WARN: comparing %v against %v", [type_name(a), type_name(b)]))
} else := false if {
  not type_name(a) in {"boolean", "number", "string"}
  print(sprintf("WARN: cannot compare type %v", [type_name(a)]))
} else := true
```

当类型不一致时，`strictly_validate` 返回 `false`，`greater_than` 的两个定义都不会成立，比较被安全地阻止。

## 部分定义的默认值陷阱

回顾一下：当规则的条件不满足时，规则变量不会被赋值，在输出中表现为"不存在"。我们可以用 `default` 关键字提供默认值。

但有一种情况会**自动产生默认值**——部分定义规则：

```rego
import rego.v1

# 部分定义：条件不成立时，自动得到空集合 {}
output1["key1"] := "val1" if {
  1 == 2       # 条件不成立
}

# 完整定义：条件不成立时，变量未定义
output2 := {"key1": "val1"} if {
  1 == 2       # 条件不成立
}
```

这里的差异非常微妙：
- `output1` 虽然条件不成立，但因为使用了**部分定义语法**，OPA 自动赋予了空对象 `{}`
- `output2` 使用的是完整定义，条件不成立时变量完全不存在

这在后续引用时会产生截然不同的行为：

```rego
import rego.v1

# 成立！因为 {} 是一个有效值（非 false、非 undefined）
output3 if {
  output1         # {} 作为条件 → 成功
}

# 不成立！因为 output2 是未定义值
output4 if {
  output2         # undefined 作为条件 → 失败
}
```

> ⚠️ **规则**：部分定义（`contains`、`[key] :=`）在所有规则都不成立时，会自动产生空集合/空对象作为默认值。这个"隐式默认值"可能导致条件判断意外成功。

## 命名遮蔽（Naming Shadowing）陷阱

和许多编程语言一样，Rego 允许在子作用域中声明与外部同名的变量，这叫**命名遮蔽**。

### 局部变量遮蔽全局变量

```rego
import rego.v1

var1 := "hello"

output1 if {
  var1 == "hello"      # 引用全局变量 → 成立
}

output2 if {
  var1 := "goodbye"    # 声明了同名局部变量
  var1 == "hello"      # 引用的是局部变量 → 不成立
}
```

### 用户函数遮蔽内建函数

更隐蔽的情况是遮蔽内建函数。假设你在包中定义了一个 `replace` 函数：

```rego
import rego.v1

output1 := replace("ab", "b", "bc")  # 期望 "abc"，实际是 "ab"
```

如果同包中有这样的自定义函数：

```rego
replace(item, old, new) := result if {
  result := replace_one(item, old, new)
}

replace_one(item, old, new) := new if { item == old }
replace_one(item, old, _) := item if { item != old }
```

那么自定义的 `replace` 遮蔽了内置的 `strings.replace`，导致结果完全不同。

### 遮蔽内建操作符

Rego 的比较操作符（`>`、`<` 等）本质上也是函数，有对应的函数名（如 `gt` 对应 `>`）。如果你不小心用了这些名字：

```rego
import rego.v1

output2 := (7 > 2022)  # 期望 false
# 实际结果："Gran Turismo 7 (2022)"

gt(version, year) := sprintf("Gran Turismo %v (%v)", [version, year])
```

自定义的 `gt` 函数遮蔽了内建的 `>` 操作符！

> ⚠️ **建议**：
> 1. 避免使用 `gt`、`lt`、`gte`、`lte`、`eq`、`neq`、`replace` 等与内建函数/操作符同名的名字
> 2. OPA 的编译时类型检查能帮助发现大部分遮蔽问题，但不要完全依赖它
> 3. 遮蔽行为本身是有道理的——它允许包作者自由命名而不必了解所有内建名称

## 本章小结

| 陷阱 | 问题 | 建议 |
|------|------|------|
| 集合/对象比较 | 成员顺序不确定，比较结果不可靠 | 只用 `==` 判等，不要比大小 |
| 跨类型比较 | `"0" > 3` 为 `true`，结果反直觉 | 比较前检查类型，或用类型安全函数 |
| 部分定义默认值 | 空集合 `{}` 自动出现，可能导致条件意外成立 | 留意部分定义规则的隐式默认值 |
| 命名遮蔽 | 局部变量或自定义函数遮蔽内建名称 | 避免使用内建函数/操作符的名字 |

下一章我们将继续学习**常见陷阱（下）：引用与迭代**——未声明迭代变量、无效路径引用等更多实战中的高频问题。

## 动手实验

<KillercodaEmbed src="https://killercoda.com/rego-tutorial/course/rego-tutorial/rego-common-pitfalls-types" />
