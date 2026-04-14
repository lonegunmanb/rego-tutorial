---
order: 4
title: 赋值与局部变量
---

# 赋值与局部变量

在前面的章节中，我们赋予规则的值基本都是布尔类型（`true` / `false`）。实际上在 Rego 中，规则可以被赋予任意的 JSON 数据类型。本章将介绍各种类型的赋值方式、隐式 `true` 的行为，以及局部变量的作用域。

## 各种类型的赋值

在 Rego 中，我们可以给规则赋予任意的 JSON 数据类型——数字、字符串、数组、对象，甚至是表达式的计算结果：

```rego
package play
import rego.v1

output1__number := 4

output2__string := "string"

output3__array := ["str1", "str2"]

output4__expression := concat("--", output3__array)  # "str1--str2"

output5__expression := abs(1 - 3) * output1__number  # 8 = abs(-2) * 4

output6__string_conditional := "string" if {
  1 == 1
}

output7__implicit_true if {    # true
  1 == 1
}

output8_map := {
  "key": "world",
  "number": 123
}
```

输出值为：

```json
{
  "output1__number": 4,
  "output2__string": "string",
  "output3__array": ["str1", "str2"],
  "output4__expression": "str1--str2",
  "output5__expression": 8,
  "output6__string_conditional": "string",
  "output7__implicit_true": true,
  "output8_map": { "key": "world", "number": 123 }
}
```

需要注意几个要点：

- **表达式赋值** —— `:=` 右侧可以是任意 Rego 表达式，包括函数调用（如 `concat`、`abs`）和算术运算
- **条件赋值非布尔值** —— `output6__string_conditional` 展示了条件成立时赋予字符串值，而非布尔值
- **对象赋值** —— `output8_map` 直接赋予了一个 JSON 对象

## 隐式 true

假如一个规则没有显式地赋值（没有 `:=`），但规则条件成立，那么它会被隐式赋予 `true`：

```rego
output if {
    1 == 1
}
```

输出值是：

```json
{
    "output": true
}
```

这就是为什么我们在前面的章节中写 `allow_review := true if { ... }` 时，其实也可以简写成 `allow_review if { ... }`——效果是一样的。

## 局部变量

和大多数编程语言一样，Rego 也支持在规则或函数内部定义局部变量。局部变量的作用域仅限于声明它的规则或函数内部。例如：

```rego
package play
import rego.v1

output1 := upper(trimmed_string) if {
  starting_string := "  foo  "
  trimmed_string := trim_space(starting_string)  # "foo"
}

output2__port_number := port if {
  starting_string := "10.0.0.1:80"
  strings := split(starting_string, ":")  # ["10.0.0.1", "80"]
  port := to_number(strings[1])           # 80
}
```

两条规则内部都有局部变量 `starting_string`，但它们彼此之间不冲突——每个局部变量只在声明它的那条规则内部可见。以上代码的执行结果是：

```json
{
    "output1": "FOO",
    "output2__port_number": 80
}
```

### 局部变量的关键特性

1. **作用域隔离** —— 不同规则中的同名局部变量互不影响
2. **赋值即声明** —— 使用 `:=` 操作符同时完成声明和赋值
3. **可在规则输出中引用** —— 局部变量可以出现在 `:=` 左侧的赋值表达式中（如 `output1 := upper(trimmed_string)`），但前提是该变量在规则体内已被赋值
4. **不可变** —— 一旦赋值，局部变量的值不能被改变（Rego 没有变量重新赋值的概念）

## 动手实验

<KillercodaEmbed src="https://killercoda.com/rego-tutorial/course/rego-tutorial/rego-assignment-and-local-vars" />
