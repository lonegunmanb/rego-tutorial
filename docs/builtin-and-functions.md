---
order: 9
title: 内建函数与用户定义函数
---

# 内建函数与用户定义函数

上一章我们学习了部分定义（Partial Definition）。本章介绍 Rego 中的**函数**——包括丰富的内建函数库，以及如何定义自己的函数来封装和复用逻辑。

## 内建函数概览

Rego 内置了大约 [100 多个内建函数](https://www.openpolicyagent.org/docs/latest/policy-reference/)，涵盖比较、数学、聚合、字符串处理、类型转换、通配符匹配等领域。

关于函数的几个要点：

- 函数的入参是**拷贝**，对入参的修改不会影响函数外部
- 函数不支持可选参数，但可以将数组、对象、集合作为入参
- 函数运行出错时返回 **undefined**（例如除零、非法类型转换）

### 比较操作符

在 Rego 中，比较操作符本身也是函数：`==`、`!=`、`<`、`<=`、`>`、`>=`：

```rego
import rego.v1

check_comparison if {
  1 == 1
  "abc" == "abc"
  {1, "a"} == {"a", 1, "a"}       # 集合：忽略顺序和重复
  {"x": 1, "y": 2} == {"y": 2, "x": 1}  # 对象：忽略键顺序
  "abcxx" < "abd"                  # 字符串按字典序比较
}
```

### 数学计算

```rego
import rego.v1

check_math if {
  2 + 1 == 3
  6 / 3 == 2
  abs(-3) == 3
  ceil(-3.14) == -3
  floor(-3.14) == -4
}
```

### 聚合函数

```rego
import rego.v1

check_aggregation if {
  count("abc") == 3
  count([1, 3, 9]) == 3
  max([1, 3, 9]) == 9
  min([1, 3, 9]) == 1
  sum([1, 3, 9]) == 13
}
```

### 字符串函数

```rego
import rego.v1

check_string if {
  concat("--", ["a", "b"]) == "a--b"
  split("a--b", "--") == ["a", "b"]
  contains("abcdefg", "bc")
  startswith("abcdefg", "abc")
  endswith("abcdefg", "efg")
  upper("abcdefg") == "ABCDEFG"
  lower("ABCDEFG") == "abcdefg"
}
```

### 类型转换

```rego
import rego.v1

check_conversion if {
  to_number("10") == 10
  to_number(true) == 1
  to_number(false) == 0
}
```

### 通配符匹配（glob）

```rego
import rego.v1

check_glob if {
  glob.match("*.*.*.*:*", [".", ":"], "10.0.0.1:80")
  not glob.match("*.*.*.*:*", [".", ":"], "0.0.1:80")
}
```

### 字符串插值（sprintf）

```rego
import rego.v1

check_sprintf if {
  sprintf("%v", [10]) == "10"
  sprintf("%v-%v-%v", [10, 20, 30]) == "10-20-30"
  sprintf("%[3]v-%[3]v-%[1]v", [10, 20, 30]) == "30-30-10"
}
```

## 用户定义函数

当内建函数无法满足需求时，可以自定义函数。语法与部分定义对象相似，区别是用**圆括号**替代方括号：

```rego
import rego.v1

port_number(addr_str) := port if {
  strings := split(addr_str, ":")
  port := to_number(strings[1])
}

result := port_number("10.0.0.1:80")  # 80
```

### 函数重载实现逻辑或

与规则一样，可以定义多个同名函数，实现"逻辑或"——只要其中一个函数体的条件成立，就返回对应的值：

```rego
import rego.v1

# IPv4 情况
port_number(addr_str) := port if {
  glob.match("*.*.*.*:*", [".", ":"], addr_str)
  strings := split(addr_str, ":")
  port := to_number(strings[1])
}

# IPv6 情况
port_number(addr_str) := port if {
  parts := split(addr_str, ":")
  last_index := count(parts) - 1
  startswith(parts[0], "[")
  endswith(parts[last_index - 1], "]")
  port := to_number(parts[last_index])
}

ipv4_port := port_number("10.0.0.1:80")        # 80
ipv6_port := port_number("[2001:db8::1]:80")    # 80
invalid := port_number("10.0.0.1")              # undefined
```

### 函数与部分定义对象的区别

函数的运行原理与部分定义对象很相似（将输入映射到输出），但有两个关键区别：

1. **函数支持多个入参**，而对象键只能是一个值
2. **函数的输入空间是无限的**，而对象的键必须是有限集合

函数体中除了入参外，还可以访问全局数据（`data`）、输入数据（`input`）以及同包中的所有规则。

## 动手实验

<KillercodaEmbed src="https://killercoda.com/rego-tutorial/course/rego-tutorial/rego-builtin-and-functions" />
