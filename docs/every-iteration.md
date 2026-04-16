---
order: 10
title: every 全量迭代
---

# `every` 全量迭代

上一章我们学习了内建函数与用户定义函数。本章介绍 Rego 中的 `every` 关键字——用于实现 **AllOf 语义**，确保集合中的**所有**成员都满足某种条件。

## `some` vs `every`：AnyOf vs AllOf

前面介绍过的 `some` 关键字实现的是 **AnyOf** 的语义——只要集合中有**一个**成员满足所有条件，规则就可以继续向下执行。而 `every` 实现的是 **AllOf** 语义——**每一个**成员都必须满足条件，规则才能成立。

例如，只有当购物车内所有商品都有库存时，才允许提交订单。

```rego
import rego.v1

nums := {100, 200, 300}

output1__every_num_is_above_50 if {  # 规则成立
  every num in nums {
    num > 50                          # 每个数都大于 50
  }
}

output2__every_num_is_above_150 if {  # 规则不成立
  every num in nums {
    num > 150                          # 100 不大于 150
  }
}
```

`every` 表达式只有在集合中**每一个**成员都满足了花括号中的**每一条**条件时才会成立：

```rego
import rego.v1

nums := {100, 200, 300}

output3__every_num_is_above_50_below_350 if {  # 规则成立
  every num in nums {
    num > 50
    num < 350                          # 两个条件都必须满足
  }
}

output4__every_num_is_above_50_below_250 if {  # 规则不成立
  every num in nums {
    num > 50
    num < 250                          # 300 不小于 250
  }
}
```

## 在 `every` 中实现逻辑或

有时候，我们想检查集合中的每个元素是否满足一组"逻辑或"条件。例如，检查所有商品的颜色是否**不是红色就是蓝色**。

### 方法一：利用 `in` 操作符

```rego
import rego.v1

items := {
  {"id": "a-phone", "color": "red", "type": "phone"},
  {"id": "b-phone", "color": "red", "type": "phone"},
  {"id": "a-pad", "color": "red", "type": "tablet"},
  {"id": "b-pad", "color": "blue", "type": "tablet"},
}

every_item_is_red_or_blue if {
  every item in items {
    item.color in {"red", "blue"}      # 利用 in 操作符实现逻辑或
  }
}
```

### 方法二：用辅助函数实现逻辑或

当逻辑或的条件比较复杂、无法用一个表达式概括时，可以声明辅助函数：

```rego
import rego.v1

# 辅助函数：通过函数重载实现逻辑或
is_red_or_blue(item) if item.color == "blue"
is_red_or_blue(item) if item.color == "red"

every_item_is_red_or_blue if {
  every item in items {
    is_red_or_blue(item)
  }
}
```

这种模式在检查"蕴含关系"时特别有用。例如，要检查"所有手机都是红色的"——等价于"每件商品，要么不是手机，要么是红色的"：

```rego
import rego.v1

is_not_phone_or_is_red(item) if not item.type == "phone"
is_not_phone_or_is_red(item) if item.color == "red"

every_phone_is_red if {
  every item in items {
    is_not_phone_or_is_red(item)
  }
}
```

## `some` + `every` 组合模式

上面的辅助函数方式也可以用 `some` + `every` 的组合来替代——先用 `some` 生成表达式筛选子集，再对子集做 `every` 全量检查：

```rego
import rego.v1

items := {
  {"id": "a-phone", "color": "red", "type": "phone"},
  {"id": "b-phone", "color": "red", "type": "phone"},
  {"id": "a-pad", "color": "red", "type": "tablet"},
  {"id": "b-pad", "color": "blue", "type": "tablet"},
}

# 所有手机都是红色的
every_phone_is_red if {
  phones := {item |
    some item in items
    item.type == "phone"
  }
  every item in phones {
    item.color == "red"
  }
}

# 所有红色商品都是手机（不成立，红色 tablet 存在）
every_red_item_is_phone if {
  red_items := {item |
    some item in items
    item.color == "red"
  }
  every item in red_items {
    item.type == "phone"
  }
}
```

这种方式的逻辑更直观：先"选出手机"，再"检查它们是不是都是红色的"。

## 动手实验

<KillercodaEmbed src="https://killercoda.com/rego-tutorial/course/rego-tutorial/rego-every-iteration" />
