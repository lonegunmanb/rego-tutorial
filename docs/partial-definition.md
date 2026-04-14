---
order: 8
title: 部分定义（Partial Definition）
---

# 部分定义（Partial Definition）

上一章我们学习了如何用生成表达式（comprehension）在一条语句中动态创建集合。本章介绍 Rego 中另一种强大的集合构建方式——**部分定义（Partial Definition）**：用多条规则逐步向同一个集合或对象中添加元素。

## 什么是部分定义

到目前为止，我们声明集合的方式都是"完整定义"——用一条赋值语句一次性定义整个集合的所有成员。部分定义则不同，它允许每条规则只贡献集合的一部分，最终由 OPA 将所有部分合并成完整的集合。

### `contains` 部分定义 Set

```rego
import rego.v1

# 完整定义（一次性）
output1 := {"a-phone", "b-phone", "a-pad"}

# 部分定义（逐个添加）
output2 contains "a-phone"
output2 contains "b-phone"
output2 contains "a-pad"
```

每一条 `contains` 语句都向 `output2` 集合中添加一个元素。最终 `output2` 的内容与 `output1` 完全相同。

### `[]` 部分定义 Object

类似地，可以用 `[key] := value` 语法逐步构建对象：

```rego
import rego.v1

# 完整定义
output1 := {"x-1": "a-phone", "x-2": "b-phone", "y-1": "a-pad"}

# 部分定义
output2["x-1"] := "a-phone"
output2["x-2"] := "b-phone"
output2["y-1"] := "a-pad"
```

## v0 语法 `deny[msg]` 的真相

在很多开源的 OPA 策略代码中，你会看到这样的写法：

```rego
deny[msg] {
    resource := input.resources[_]
    resource.type == "aws_s3_bucket"
    not resource.encryption
    msg = sprintf("S3 bucket '%s' must enable encryption", [resource.name])
}
```

初学者很容易把 `deny[msg]` 理解为"一个叫 `deny` 的函数接收参数 `msg`"——但其实这是 Rego **v0** 中**部分定义集合**的语法。`deny[msg]` 等价于 v1 中的 `deny contains msg if { ... }`。

> ⚠️ **重要**：`deny[msg]` 语法在 Rego v1 中已被废弃。如果你正在编写新的策略代码，请使用 `deny contains msg if { ... }` 语法。

## 带条件的批量部分定义

部分定义不仅可以逐个添加静态值，还可以结合迭代和条件一次定义多个成员：

### 批量部分定义 Set

```rego
import rego.v1

items := ["a-phone", "b-phone", "a-pad"]

# 从数组中筛选以 "-phone" 结尾的元素，逐个添加到集合中
phones contains item if {
  some item in items
  endswith(item, "-phone")
}
# phones 的值为 {"a-phone", "b-phone"}
```

### 批量部分定义 Object

```rego
import rego.v1

items := ["a-phone", "b-phone", "a-pad"]

phone_map[key] := item if {
  some index, item in items
  endswith(item, "-phone")
  key := sprintf("x-%v", [index])
}
# phone_map 的值为 {"x-0": "a-phone", "x-1": "b-phone"}
```

## 部分定义中的复杂表达式

部分定义中使用的值可以是任意 Rego 表达式：

```rego
import rego.v1

base_set := {"a-phone", "b-phone"}
catalog := {"x-1": "a-phone", "x-2": "b-phone"}

complex_set contains abs(-100 * 2 + 3)
complex_set contains {"key": 100}
complex_set contains base_set
complex_set contains [base_set, catalog]

complex_obj[abs(-100 * 2 + 3)] := base_set
complex_obj[[base_set, catalog]] := {"key": 100}
```

## 不支持部分定义数组

最后需要特别提醒：**Rego 不支持通过部分定义来定义数组**。部分定义只适用于 Set 和 Object。如果你需要构建数组，请使用 Array 生成表达式（comprehension）。

## 动手实验

<KillercodaEmbed src="https://killercoda.com/rego-tutorial/course/rego-tutorial/rego-partial-definition" />
