---
order: 6
title: 迭代（Iteration）
---

# 迭代（Iteration）

Rego 中的迭代与其他语言中的 `for` 循环有根本性的不同。Rego 没有显式的循环结构，而是通过**枚举可能的绑定关系**来实现迭代。只要集合中**至少有一条路径**能让所有条件同时成立，规则就会成功。

## 基础迭代：`some item in collection`

最常见的迭代语法是用 `some ... in ...` 引入一个局部变量，让它依次绑定集合中的每个成员：

```rego
import rego.v1

products := {"a-phone", "b-phone", "a-pad"}

# 成功：集合中存在以 "-phone" 结尾的成员
has_phone if {
  some item in products
  endswith(item, "-phone")
}

# 失败：集合中不存在以 "-car" 结尾的成员
has_car if {
  some item in products
  endswith(item, "-car")
}
```

**理解迭代语义**：Rego 会对集合的每个成员尝试执行后续条件，只要存在任意一个成员能让所有条件同时成立，规则就成功。这是"**存在量化**"语义——等价于"集合中**至少有一个**成员满足条件"。

数组的迭代语法完全相同：

```rego
import rego.v1

array := ["a-phone", "b-phone", "a-pad"]

has_phone if {
  some item in array
  endswith(item, "-phone")
}
```

## 键值对迭代

对数组和对象，还可以用 `some key, value in collection` 同时获取键（索引）和值：

```rego
import rego.v1

array := ["a-phone", "b-phone", "a-pad"]

# 索引 > 0 且值以 "-phone" 结尾
has_phone_after_index_0 if {
  some index, item in array   # 枚举 0:"a-phone", 1:"b-phone", 2:"a-pad"
  endswith(item, "-phone")
  index > 0                   # 1:"b-phone" 同时满足两个条件 → 规则成功
}
```

对象的键值对迭代：

```rego
import rego.v1

catalog := {
  "x-1": "a-phone",
  "x-2": "b-phone",
  "y-1": "a-pad"
}

# 键以 "x-" 开头且值以 "-phone" 结尾
has_x_key_phone if {
  some key, value in catalog
  startswith(key, "x-")
  endswith(value, "-phone")
}
```

## `_` 匿名变量

当只关心键或值之一时，用 `_` 作为占位符忽略不需要的部分：

```rego
import rego.v1

catalog := {
  "x-1": "a-phone",
  "x-2": "b-phone",
  "y-1": "a-pad"
}

# 只关心键，不关心值
has_x_key if {
  some key, _ in catalog
  startswith(key, "x-")
}
```

每个 `_` 都是独立的匿名变量，可以在同一条规则中多次使用。

## 嵌套迭代

在同一条规则中使用多个 `some ... in` 可以实现嵌套迭代：

```rego
import rego.v1

catalog1 := {"a-phone", "b-phone", "a-pad"}
catalog2 := {"a-watch", "b-watch", "a-phone"}

# 两个集合中存在相同的值
have_common_item if {
  some v1 in catalog1
  some v2 in catalog2
  v1 == v2              # "a-phone" 在两个集合中都存在 → 成功
}
```

对于更深层的嵌套结构，可以逐层引入迭代变量：

```rego
import rego.v1

catalog := {
  "x-1": {"name": "a-phone", "suppliers": ["a-corp", "z-corp"]},
  "x-2": {"name": "b-phone", "suppliers": ["b-corp", "z-corp"]},
  "y-1": {"name": "a-pad",   "suppliers": ["a-corp"]}
}

# catalog 中某个产品的 suppliers 包含 "b-corp"
has_supplier_b_corp if {
  some item in catalog
  some supplier in item.suppliers
  supplier == "b-corp"
}
```

## 自由迭代与 `_`

引入中间变量后，也可以用更简洁的"自由迭代"形式：

```rego
import rego.v1

# 等价于上面的 has_supplier_b_corp
# 用 some 声明迭代变量，直接在路径中使用
has_supplier_b_corp_free if {
  some id, index
  catalog[id].suppliers[index] == "b-corp"
}

# 最简形式：用 _ 替换所有不关心的迭代维度
has_supplier_b_corp_wildcard if {
  catalog[_].suppliers[_] == "b-corp"
}
```

> ⚠️ **注意**：不带 `some` 声明也不带 `_` 的自由迭代（直接写 `catalog[id].suppliers[index]`）是早期 Rego v0 的写法，容易引发难以察觉的 bug，我们将在"常见陷阱"章节详细讨论。现代 Rego v1 中应始终使用 `some` 声明或 `_` 占位符。

## 动手实验

下面的 Killercoda 环境已预装 OPA，你可以在真实的终端中运行上述所有例子：

<KillercodaEmbed src="https://killercoda.com/rego-tutorial/course/rego-tutorial/rego-iteration" />
