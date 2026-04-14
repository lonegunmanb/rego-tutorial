# 第一步：常规条件与逻辑非条件

进入工作目录：

```bash
cd /root/workspace
```

## 常规条件：Rego 中没有 falsy

在 Rego 中，**所有可以成功求值且不为 `false` 的表达式**都等同于 `true`。这与 JavaScript、Python 等语言中的 falsy 概念完全不同。

让我们用 OPA 验证：

```bash
cat > policy/normal.rego << 'EOF'
package play

import rego.v1

# 这些在其他语言中是 "falsy" 的值，在 Rego 中全部成功
no_falsy_in_rego if {
  0            # zero —— 成功！
  ""           # 空字符串 —— 成功！
  []           # 空数组 —— 成功！
  null         # null —— 成功！
}

# 在 Rego 中唯一的 "失败" 条件
only_false_fails if {
  false        # 布尔 false —— 这是唯一通过值本身导致失败的
}

# 比较结果为 false 也会失败
comparison_false if {
  1 == 2       # false
}

# undefined（无法求值）也等同于失败
undefined_fails if {
  0 / 0        # 除零 —— undefined
}
EOF
```

查看结果：

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.play' --format pretty
```

你会看到只有 `no_falsy_in_rego` 出现在输出中（值为 `true`），其余三条规则因为条件失败都没有被定义。

## 逻辑非条件

`not` 可以把失败的条件转为成功，把成功的条件转为失败：

```bash
cat > policy/not_cond.rego << 'EOF'
package play

import rego.v1

# 取反失败的表达式 → 成功
negate_fails := true if {
  not false
  not 1 == 2
  not input.no_such_path
}

# 取反成功的表达式 → 全部失败（所以整条规则失败）
negate_succeeds := true if {
  not true     # 失败
  not 0        # 0 不是 false，取反后失败！
  not ""       # 空字符串不是 false，取反后失败！
  not null     # null 不是 false，取反后失败！
}
EOF
```

查看结果：

```bash
opa eval -d policy/ -i input.json 'data.play' --format pretty
```

`negate_fails` 成功了，`negate_succeeds` 没有出现——因为 `not true` 这第一个条件就失败了，整条规则就不成立了。

## 重点理解：not 0、not ""、not null 都是失败的

这一点非常重要且反直觉。让我们分别单独验证：

```bash
cat > policy/not_detail.rego << 'EOF'
package play

import rego.v1

test_not_zero if { not 0 }
test_not_empty_string if { not "" }
test_not_null if { not null }
test_not_empty_array if { not [] }
test_not_false if { not false }
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.play' --format pretty
```

只有 `test_not_false` 会出现在输出中。其余的 `not 0`、`not ""`、`not null`、`not []` 全部失败——因为 `0`、`""`、`null`、`[]` 在 Rego 中都是成功的条件，取反后就是失败的。
