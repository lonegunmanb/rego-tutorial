---
order: 2
title: 逻辑运算符：与、或、非
---

# 逻辑运算符：与、或、非

在上一章中我们学会了如何用 Rego 编写规则和条件赋值。在这一章中，我们将学习 Rego 中的逻辑运算——与（AND）、或（OR）、非（NOT）。Rego 的逻辑运算方式与大多数编程语言大相径庭，这也是最容易让初学者感到困惑的地方之一。

## 逻辑与（AND）

在绝大多数通用编程语言中，逻辑与由 `&&` 或是 `AND` 关键字来声明，例如：

```java
if cond1 && cond2
```

但是 Rego 很特别的一点是，它没有显式的逻辑与操作符。回到我们上一章判断是否可以评论的例子，假设现在的条件是：角色必须是顾客，**并且**声誉必须大于等于 `0`：

```rego
package play

import rego.v1

allow_review := true if {
  input.role == "customer"
  input.reputation >= 0
}
```

在 Rego 中，你把判定条件按顺序写出来，它们之间就是逻辑与的关系了。就像一条串联电路，所有条件都必须成立，整条规则才算成立。

如果输入数据是：

```json
{
    "role": "customer",
    "reputation": 10
}
```

你会看到 `allow_review` 为 `true`。然而如果 `role` 不为 `"customer"` 或是 `reputation` 为负数时，`allow_review` 都不会被赋值——规则不成立。

## 逻辑或（OR）

在绝大多数通用编程语言中，逻辑或由 `||` 或是 `OR` 关键字来声明，例如：

```java
if cond1 || cond2
```

Rego 中的逻辑或与其他语言大相径庭——它并没有我们所认为的逻辑或操作符。在 Rego 中实现逻辑或，主要靠的是**声明多个同名的规则**来实现的。

例如，我们在上面的点评规则基础上扩展一下。假如用户的角色是 `customer` 并且声誉大于等于 `0`，**或者**用户的角色是 `admin`，那么就可以评论。这个逻辑可以用以下的 Rego 代码实现：

```rego
package play

import rego.v1

allow_review := true if {
  valid_user
}

valid_user := true if {
  input.role == "customer"
  input.reputation >= 0
}

valid_user := true if {
  input.role == "admin"
}
```

可以把 Rego 中同名的规则想象成**并联电路**，任意一边成立都可以被视作成立。虽然 `customer` 那条分支不成立，但只要 `admin` 那条分支成立，`valid_user` 就会被赋值为 `true`，进而 `allow_review` 也就被赋值为 `true` 了。

尝试用以下输入数据去测试：

```json
{
    "role": "admin"
}
```

结果是：

```json
{
    "allow_review": true,
    "valid_user": true
}
```

## 不可赋予不同的值

在上面的例子里，我们对 `valid_user` 声明了两条赋值规则实现了逻辑或，但无论是哪一条，规则成立时 `valid_user` 的值都是 `true`。假如我们对同一个规则赋予不同的值会发生什么？

分两种情况来看。第一种，两条规则只有一条成立：

```rego
package play

import rego.v1

result := true if {
    true
}

result := false if {
    1 == 2
}
```

`result := true` 这条规则的条件为 `true`，所以 `result` 被赋值为 `true`；`result := false` 这条规则的条件 `1 == 2` 不成立，所以赋值不会发生。最终 `result` 为 `true`，运行正常。

但如果我们让两条规则都成立：

```rego
package play

import rego.v1

result := true if {
    true
}

result := false if {
    true
}
```

这时 `result` 会被赋予两个不同的值，执行结果是报错：

```text
eval_conflict_error: complete rules must not produce multiple outputs
```

在 Rego 中，对同一个规则赋予多个不同的值是一种**反模式**，请不要这样做。确保代码中同一条规则在任何情况下，要么不成立，要么只会被赋予同样的值。

> 💡 如果你确实需要在不同条件分支下返回不同的值（例如返回不同的错误信息），应该使用"部分定义"（Partial Definition）——我们将在后续章节中详细介绍。

## 逻辑非（NOT）

Rego 中的逻辑非操作与 Python 类似，使用 `not` 关键字。例如：

```rego
package play

import rego.v1

always_false := false

result := "should_be_true" if {
  not always_false
}
```

`always_false` 是 `false`，所以 `not always_false` 就变成了 `true`，规则成立，`result` 被赋值为 `"should_be_true"`。

简单来讲，`not` 可以把原来失败的条件转化为成功的，把原来成功的条件转化为失败的。以下是一系列通过 `not` 反转后**成功**的条件：

```rego
output := true if {
  not false        # false 被反转为成功
  not 1 == 2       # false 被反转为成功
  not input.no_such_path  # 无效路径引用被反转为成功
}
```

以下条件通过 `not` 反转后**失败**：

```rego
output := true if {
  not true       # true 被反转为失败
  not 1 == 1     # true 被反转为失败
  not 1          # 成功的表达式被反转为失败
  not "str"      # 成功的表达式被反转为失败
}
```

### not 与函数调用的反直觉行为

需要特别注意的是，`not` 关键字与函数调用结合使用时，可能触发非常反直觉的结果：

```rego
package play

import rego.v1

output1 := true if {
  not input.no_such_field
  # 成功 —— 无效的路径引用被 not 取反为成功
}

output2 := true if {
  not upper(input.no_such_field)
  # 失败！—— 包含函数调用的表达式中有无效路径引用，即使有 not 也会直接失败
}

helper_rule := upper(input.no_such_field)

output3 := true if {
  not helper_rule
  # 成功 —— 将函数调用包裹在另一个规则中，配合 not 就能得到预期结果
}
```

当 `not` 直接修饰一个包含无效路径引用的函数调用时，它不会按预期工作。解决方法是将函数调用包裹在一个辅助规则（helper rule）中，然后对辅助规则使用 `not`。

> ⚠️ 这是 Rego 中一个常见的陷阱，我们将在后续章节"常见陷阱与最佳实践"中进行更深入的讨论。

## 动手实验

<KillercodaEmbed src="https://killercoda.com/lonegunmanb/course/rego-tutorial/rego-logical-operators" />
