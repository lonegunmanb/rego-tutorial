---
order: 1
title: Rego 初识：规则与条件赋值
---

# Rego 初识：规则与条件赋值

## Rego 101

[Rego](https://www.openpolicyagent.org/docs/latest/policy-language/) 是一门看起来很奇怪的领域特定语言（DSL），它与常用的命令式语言，以及 Terraform 这样的声明式语言都有不同。在学习的过程中你可能会发现目前有关 Rego 的系统性的教程不多，中文的更少。本教程将用一种极其浅显易懂的方式和节奏帮助你学习 Rego，这是一篇帮助你从救生圈开始到能够畅快地在 Rego 领域自由泳的教程。

Rego 以及 [Open Policy Agent（OPA）](https://www.openpolicyagent.org/) 背后的公司是 [Styra](https://www.styra.com/)，位于加州，他们专注于提供策略工具，OPA 就是由他们开发并且维护的开源项目。

本教程的章节设计和主要内容来自于 [Styra 的教程](https://academy.styra.com/)，倘若本文内容与官方教程有矛盾之处，请以官方教程为准。本教程聚焦于基础语法，以及一些对初学者来说理解起来有些困难的反直觉的知识点。

## Rego 版本

Rego 目前有 `v0` 和 `v1` 两大版本，其中 `v1` 引入了一些破坏性变更语法，这使得目前绝大多数你能找到的教程中的 Rego 代码都无法在 `v1` 版本下运行，这也是我们编写本教程的原因。**本教程将采用 `v1` 语法标准。**

## 教学工具

在本教程的动手实验中，我们使用 [conftest](https://www.conftest.dev/) 来执行 Rego 策略。conftest 是一个用 Rego 编写策略、对结构化数据（JSON、YAML、HCL 等）进行合规检查的命令行工具。

OPA 中最关键的三个概念是：**输入数据**、**规则（策略）**、**输出数据**。请牢记这三个概念，它们将贯穿整个教程。

如果你想快速试验 Rego 代码片段，也可以使用在线的 [OPA Playground](https://play.openpolicyagent.org/)。

## 规则

Rego 是一门用来定义规则的语言，但问题是：什么是规则？比如说，红灯停，绿灯行，这是一种规则，但规则的本质是什么？

在我看来，Rego 定义的规则的本质就是，输出数据是否满足某种预期。例如红灯停绿灯行，这里有两个规则，负责"刹车"的控制器只需要观察是否能够看到红灯，有红灯就踩紧刹车；负责"油门"的控制器只需要观察是否能看到绿灯，有绿灯就踩下油门。OPA 规则的本质就是把输入数据根据某种逻辑转换成输出数据，由外部根据输出数据来判断下一步的行为。

例如，我们编写以下 Rego 代码：

```rego
package play

import rego.v1

allow_review := true
```

运行后输出的是一个 JSON 对象：

```json
{
    "allow_review": true
}
```

本质上这是一个由我们的 OPA 策略运行得到的文档。你可以假想这个文档就是一张许可证，上面告诉你，你是否有权就某件商品进行点评，那么结果是 `true`。假设你开发的是一个电商网站，那如何解读这个 `true` 是你的自由，但你现在得到了一个 `true`。

需要特别解释的是，代码中的 `import rego.v1` 代表后续代码将使用 `v1` 版本语法。

## 条件赋值

那有人就要问了，这样简单的事情，我为什么不直接定义一个 JSON 对象呢？我为什么需要引入一个新的语言来做呢？

这是因为，OPA 可以进行一些更为复杂的计算，例如：

```rego
package play

import rego.v1

allow_review := true if {
  input.role == "customer"
}
```

这里我们使用了"条件赋值"语句，只有在 `if` 后面括号对内的表达式返回 `true` 时该赋值才会发生。`:=` 就是赋值操作符。

如果我们的输入数据是：

```json
{
    "role": "customer"
}
```

那么输出就是 `{ "allow_review": true }`。但如果我们把输入的 `role` 改成 `guest`，输出就变成了一个空对象 `{}`。

有些意外，结果不是 `{ "allow_review": false }`，而是空对象。这是因为，`input.role == "customer"` 的结果不为 `true`，所以 `allow_review := true` 这个赋值并没有发生，`allow_review` 并不存在，它没有被定义过。在 Rego 里，一个没被定义过的变量，很多时候也是可以当作 `false` 来对待的，但请注意："很多时候"。换到红灯停绿灯行的例子里，反过来说就是，没看到红灯，就不要踩刹车；没看到绿灯呢，就不要踩油门。现实世界里并不会有一个 `"红灯：false"` 这样的状态，但不妨碍我们可以这样理解。

这里我们给 Rego 的"规则"（Rule）下一个定义：**在 Rego 中所谓规则就是全局变量。** 全局变量是否被输出，输出的值是什么，我们如何解释这些输出值，构成了规则体系。

## default 关键字

假如我们就是觉得很别扭，就是希望在判断不成立的情况下 `allow_review` 也可以爽快地返回一个 `false`，我们也可以这样：

```rego
package play

import rego.v1

default allow_review := false
allow_review := true if {
  input.role == "customer"
}
```

我们给 `allow_review` 设置了一个默认值：`false`，假如后面的规则（`input.role == "customer"`）不成立，那么它就会被赋予默认值：

```json
{
    "allow_review": false
}
```

`default` 关键字非常实用，它确保了无论条件是否成立，规则变量都会有一个确定的值出现在输出中，这让调用方的处理逻辑更加简单和安全。

## 动手实验

<KillercodaEmbed src="https://killercoda.com/lonegunmanb/course/rego-tutorial/rego-rules-and-assignment" />
