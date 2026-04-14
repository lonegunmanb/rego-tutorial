---
order: 3
title: 路径引用与包（Package）
---

# 路径引用与包（Package）

在前两章中我们已经会用 `input.role` 这样的语法读取输入数据了。在这一章中，我们将深入了解 Rego 中的路径引用机制——当引用的路径不存在时会发生什么？以及如何使用 Package 组织和跨包引用规则。

## 无效的路径引用

Rego 被设计用来检查结构化的、多层级的数据结构，例如下面这段用来控制 K8s 集群的 Rego：

```rego
package kubernetes.admission

deny contains msg if {
    input.request.kind.kind == "Pod"
    cpu := input.request.object.spec.containers[_].resources.requests.cpu
    to_number(cpu) > 1
    msg := sprintf("cpu is too high %s", [input.request.metadata.name])
}
```

这段策略使用了 `input.request.object.spec.containers[_].resources.requests.cpu` 来读取 `requests.cpu`。那么假如输入数据中没有定义 `requests` 时会发生什么？

答案是：`cpu` 的值会变成"无效路径引用"，也就是"未赋值的值"，它等同于 `false`，那么从这一行开始后续的条件也不用再看了，该规则不成立。

上述策略实际上有一个**隐含的条件**：输入的 Pod 定义中，必须至少存在一个 `containers` 成员，定义了 `resources.requests.cpu`。

### 无效路径的例子

对于如下输入：

```json
{
  "items": [
    "a-phone",
    "b-phone"
  ]
}
```

以下 Rego 表达式均属无效路径引用：

* `input.name` — 不存在的属性
* `input.name == "Alice"` — 不存在的属性参与比较
* `input.items[2]` — 越界的数组索引

### 判定属性是否不存在

假如我们想要编写一条规则，判定某属性是否不存在，例如，我们希望在输入数据不包含 `name` 属性时 `no_name` 规则成立，我们可以：

```rego
no_name := true if {
    not input.name
}
```

假如 `name` 不存在，那么 `input.name` 就是无效路径引用，等同于 `false`，搭配 `not` 就成了 `true`。

但这里实际上隐藏了一个陷阱——如果 `input.name` 存在但值恰好是 `false`，那 `not input.name` 也会是 `true`，无法区分"不存在"和"值为 false"这两种情况。我们将在后续的"常见陷阱"章节中详细描述。这里先给出一个更稳妥但稍显怪异的写法：

```rego
no_name := true if {
    not input.name == input.name
}
```

为什么这个写法更好？因为 `input.name == input.name`：
- 如果 `name` 存在，无论值是什么（包括 `false`），自己等于自己一定为 `true`，`not true` 就是 `false`——规则不成立
- 如果 `name` 不存在，`input.name` 是无效路径引用，整个 `==` 表达式的值未定义，`not` 将其反转为 `true`——规则成立

## Package

我们注意到，前面给出的样例 Rego 代码中，第一行基本上都是 `package` 关键字开头的声明，例如 `package play`。Rego 中的策略是以包（Package）为逻辑组合单元的。

处于两个不同文件甚至不同文件夹，但拥有同名 `package` 的代码在逻辑上处于同一命名空间，就好像它们的代码被声明在同一个代码文件中那样。

### 跨包引用

不同包之间的代码可以通过 `import` 和 `data` 关键字引用。例如：

```rego
package policy.role

import rego.v1

is_customer := true if {
    input.role == "customer"
}
```

```rego
package main

import rego.v1
import data.policy.role

allow_review := true if {
    data.policy.role.is_customer
    input.reputation >= 0
}

allow_delete := true if {
    role.is_customer
}
```

在第二段 Rego 中我们展示了两种不同的跨包引用方式：

1. **完整路径引用** — `data.policy.role.is_customer`，使用 `data.` 前缀指示 OPA 从 `policy.role` 包中寻找 `is_customer` 规则
2. **简写引用** — `role.is_customer`，因为在头部声明了 `import data.policy.role`，后续代码中 `role` 就都指代 `data.policy.role` 了

`data` 是 Rego 中的一个特殊全局变量，它包含了所有包的所有规则输出，形成一棵树状结构。通过 `import` 可以把树的某个子节点引入当前作用域。

## 动手实验

<KillercodaEmbed src="https://killercoda.com/rego-tutorial/course/rego-tutorial/rego-path-ref-and-package" />
