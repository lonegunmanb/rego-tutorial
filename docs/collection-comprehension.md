---
order: 7
title: 集合声明与生成表达式
---

# 集合声明与生成表达式

上一章我们学习了如何通过迭代语法枚举集合成员。本章介绍 Rego 中**创建集合**的两种主要方式：用 JSON 语法直接枚举，以及用**生成表达式（comprehension）**从已有集合中动态生成新集合。

## JSON 语法声明集合

Rego 支持用标准 JSON 语法直接声明数组和对象，用 `{}` 加逗号分隔（无冒号）声明集合（set）：

```rego
import rego.v1

# 数组（Array）— JSON 语法
phones := ["a-phone", "b-phone", "a-pad"]

# 对象（Object）— JSON 语法
catalog := {
  "x-1": "a-phone",
  "x-2": "b-phone",
  "y-1": "a-pad"
}

# 集合（Set）— Rego 特有语法，无冒号
product_ids := {"a-phone", "b-phone", "a-pad"}
```

集合的成员可以包含任意 Rego 表达式，包括函数调用结果、其他规则的值：

```rego
import rego.v1

phone_list := ["a-phone", "b-phone", "a-pad"]

mixed_set := {
  abs(-200 + 3),   # 数值表达式
  {"key": 100},    # 内嵌对象
  phone_list       # 另一条规则的值
}
```

## 生成表达式（Comprehension）

生成表达式让你用一条简洁的语法从已有集合中按条件筛选或变换出新集合，形式为：

```
{ 输出表达式 | 迭代语句 ; 条件... }   # Set comprehension
[ 输出表达式 | 迭代语句 ; 条件... ]   # Array comprehension
{ 键 : 值   | 迭代语句 ; 条件... }   # Object comprehension
```

### Set 生成表达式

```rego
import rego.v1

# 从数组中筛选出以 "-phone" 结尾的成员，生成集合
phones := {
  item |
    some item in input.items
    endswith(item, "-phone")
}

# 若没有成员满足条件，结果为空集合 {}（而非 undefined！）
cars := {
  item |
    some item in input.items
    endswith(item, "-car")
}
```

> **关键区别**：生成表达式在条件不满足时返回**空集合 `{}`**，而不是 `undefined`。这与普通条件规则的行为不同。

### Array 生成表达式

```rego
import rego.v1

# 生成数组（保留顺序，允许重复）
phone_list := [
  item |
    some item in input.items
    endswith(item, "-phone")
]
```

Set 和 Array 生成表达式的区别：
- **Set**：自动去重，元素无序
- **Array**：保留顺序，允许重复元素，支持按索引访问

### Object 生成表达式

Object 生成表达式同时构造键和值：

```rego
import rego.v1

# 从数组生成对象：键为 "x-<索引>"，值为元素本身
phone_map := {
  key: item |
    some index, item in input.items
    endswith(item, "-phone")
    key := sprintf("x-%v", [index])
}
# 输入 ["a-phone", "b-phone", "a-pad"] 时输出 {"x-0": "a-phone", "x-1": "b-phone"}
```

## 生成表达式作为内联条件

生成表达式不仅可以赋值给规则，也可以直接内联在条件中使用：

```rego
import rego.v1

# 检查筛选后的集合是否非空
has_phone if {
  phones := { item | some item in input.items; endswith(item, "-phone") }
  count(phones) > 0
}

# 直接统计匹配数量
phone_count := count([ item | some item in input.items; endswith(item, "-phone") ])
```

## 动手实验

<KillercodaEmbed src="https://killercoda.com/rego-tutorial/course/rego-tutorial/rego-collection-comprehension" />
