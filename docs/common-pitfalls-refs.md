---
order: 12
title: 常见陷阱（下）：引用与迭代
---

# 常见陷阱（下）：引用与迭代

上一章我们介绍了类型与比较方面的陷阱。本章继续汇总 Rego 中与**引用和迭代**相关的常见陷阱——包括未声明迭代变量、无效路径引用、错别字问题、输入数据预校验，以及反转含迭代规则时的逻辑错误。

## 未声明迭代变量陷阱

在前面的章节中，我们学过用 `some` 声明迭代变量。但 Rego 也允许不声明直接使用变量来迭代：

```rego
import rego.v1

array1 := ["a", "b", "c"]

output1__has_a if {
  array1[i] == "a"    # i 未声明，Rego 自动创建局部变量
}
```

这段代码看起来没问题。但如果只是把 `i` 换成 `x`，结果可能就完全不同了：

```rego
import rego.v1

output2__has_a if {
  array1[x] == "a"    # 结果可能不成立！
}
```

原因是：同一个包的另一个文件中可能定义了 `x := 2`。Rego 解析变量时按照**局部变量 → 包级变量 → 全局变量**的顺序查找。如果找到了包级变量 `x`（值为 `2`），就不会创建局部迭代变量，而是直接用 `array1[2]`（即 `"c"`）来比较。

**解决方案**：始终用 `some` 显式声明迭代变量：

```rego
import rego.v1

output3__has_a if {
  some x
  array1[x] == "a"    # 显式声明 → 一定是局部变量
}

output4__has_a if {
  some item in array1
  item == "a"          # 更推荐的写法
}
```

## 无效路径引用陷阱

当访问 `input` 中不存在的字段时，整个表达式会变成"无效路径引用"，导致规则计算被打断。这在安全策略中可能造成严重后果：

```rego
import rego.v1

deny_access if {
  input.access_level < 3
}
```

如果输入是空对象 `{}`，`input.access_level` 是无效路径引用，`deny_access` 变为未定义——攻击者可以用空数据绕过检查。

### 用 `not` 检测路径是否存在

```rego
import rego.v1

deny_access if {
  input.access_level < 3
}

deny_access := "Error: access_level missing" if {
  not input.access_level
}
```

但这种方式有一个陷阱：如果 `input.access_level` 的值恰好是布尔 `false`，那么 `not input.access_level` 也会是 `true`，误判为"字段不存在"。

### `exists` 函数：安全判断路径是否存在

```rego
import rego.v1

exists(x) if {
  x == x
}
```

这个看起来奇怪的函数利用了一个特性：
- 如果 `x` 是无效路径引用 → 函数调用直接失败，`exists` 不成立
- 如果 `x` 是 `false` → `false == false` 为 `true`，`exists` 成立
- 如果 `x` 是任何其他有效值 → `x == x` 为 `true`，`exists` 成立

### `not x == x`：判断路径不存在

如果需要判断某路径**不存在**，不能简单地写 `not exists(input.xxx)`——因为当路径无效时，函数调用会直接失败，`not` 无法反转函数调用的失败。

但 `==` 是个特例：即使包含无效路径引用，`==` 表达式只会返回 `false`（而不是直接失败），因此可以被 `not` 反转：

```rego
import rego.v1

is_admin_absent if {
  not input.admin == input.admin
}
```

- `input.admin` 不存在 → `input.admin == input.admin` 失败 → `not` 反转 → `true`
- `input.admin` 为 `false` → `false == false` 为 `true` → `not` 反转 → 不成立
- `input.admin` 为 `true` → `true == true` 为 `true` → `not` 反转 → 不成立

## 错别字陷阱

Rego 中打错字段名通常不会引发语法错误——无效路径引用只会被静默地视为失败。常见的错别字类型：

- 字段名拼错：`input.payload.itmes` → 应该是 `input.payload.items`
- 路径层级错误：`input.items` → 应该是 `input.payload.items`
- 单复数搞混：`input.payload.item` → 应该是 `input.payload.items`
- 类型假设错误：把数值当字符串处理

> ⚠️ **建议**：所有策略在部署前都应编写完整的单元测试，覆盖各种分支条件，确保拼写和路径的正确性。可以使用 `opa check --strict` 进行静态检查。

## 输入数据预校验最佳实践

与其在每条策略规则中都小心翼翼地处理类型和路径问题，不如在规则执行之前先做一轮**输入数据预校验**：

```rego
import rego.v1

input_is_valid if {
  is_number(input.user.access_level)
  glob.match("/**", ["/"], input.path)
  every item in input.payload.items {
    item_is_valid(item)
  }
}

item_is_valid(item) := true if {
  item.type in {"phone", "tablet", "accessory"}
  is_number(item.price)
  item.price >= 0
}

# 策略规则
policy_allow if {
  input.user.access_level >= 1
  every item in input.payload.items {
    item.price <= 1000
  }
}

# 最终决策：先校验数据，再执行策略
allow if {
  input_is_valid == true
  policy_allow == true
}
```

如果数据格式与预期不符，在 `input_is_valid` 阶段就会返回失败，避免了后续规则中因脏数据产生的各种意外行为。

## 反转含迭代规则的陷阱

假设有一条规则判断数组是否包含 `"a"`：

```rego
import rego.v1

array1 := ["a", "b"]

has_a if {
  some item in array1
  item == "a"
}
```

如果要写一条**相反**的规则——"数组不包含 `a`"，你可能会这样写：

```rego
import rego.v1

# 错误！含义是"数组中至少有一个不是 a 的元素"
does_not_have_a if {
  some item in array1
  item != "a"
}
```

对于 `["a", "b"]`，这条规则也会成立（因为 `"b" != "a"`）——这显然不是我们想要的。

| 规则 | 实际含义 | `["a"]` | `["b"]` | `["a","b"]` | `[]` |
|------|---------|---------|---------|-------------|------|
| `has_a` | 包含 `a` | ✅ | ❌ | ✅ | ❌ |
| 错误的 `does_not_have_a` | 包含非 `a` 元素 | ❌ | ✅ | ✅ | ❌ |
| 正确的 `not_has_a` | 不包含 `a` | ❌ | ✅ | ❌ | ✅ |

正确的实现有两种方式：

```rego
import rego.v1

# 方式一：用 not 反转正向规则
not_has_a if {
  not has_a
}

# 方式二：用 every 全量检查
not_has_a_v2 if {
  every item in array1 {
    item != "a"
  }
}
```

> ⚠️ **记住**：`some x in collection; x != val` 的含义是"存在一个不等于 val 的元素"，而不是"所有元素都不等于 val"。要表达后者，用 `not` 反转正向规则，或用 `every`。

## 本章小结

| 陷阱 | 问题 | 建议 |
|------|------|------|
| 未声明迭代变量 | 变量名可能与包级变量冲突 | 始终用 `some` 声明迭代变量 |
| 无效路径引用 | 缺失字段导致规则静默失败 | 用 `exists(x)` 或 `not x == x` 技巧 |
| 错别字 | 拼错的字段名不会报错 | 编写单元测试，使用 `opa check --strict` |
| 缺乏预校验 | 脏数据导致意外结果 | 在规则前添加 `input_is_valid` 预校验 |
| 反转含迭代规则 | `!=` 不等于"不包含" | 用 `not` 反转正向规则，或用 `every` |

恭喜你完成了 Rego 基础教程的全部章节！掌握这些知识后，你已经可以开始编写生产级别的 OPA 策略了。

## 动手实验

<KillercodaEmbed src="https://killercoda.com/rego-tutorial/course/rego-tutorial/rego-common-pitfalls-refs" />
