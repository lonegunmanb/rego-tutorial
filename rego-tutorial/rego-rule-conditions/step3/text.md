# 第三步：规则条件小测验

现在让我们通过一个小测验来巩固对规则条件的理解。先清理之前的文件：

```bash
cd /root/workspace
rm -f policy/*.rego
```

## 测验一：判断规则是否成功

在动手验证之前，先自己想一想每条规则是否成功：

```bash
cat > policy/quiz1.rego << 'EOF'
package quiz

import rego.v1

rule1 := true if { true }
rule2 := true if { false }
rule3 := true if { not true }
rule4 := true if { not false }
rule5 := true if { null }
rule6 := true if { not null }
rule7 := true if { 100 / 0 }
rule8 := true if { not 100 / 0 }
rule9 := true if { var := true }
rule10 := true if { var := false }
rule11 := true if { var := 100 / 0 }
rule12 := true if {
  var := false
  var
}
rule13 := true if {
  var := false
  not var
}
EOF
```

先想一想，然后查看答案：

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.quiz' --format pretty
```

你应该看到输出中只有这些规则：`rule1`、`rule4`、`rule5`、`rule8`、`rule9`、`rule10`、`rule13`。

逐条分析：

| 规则 | 结果 | 解释 |
|------|------|------|
| rule1 | ✅ | `true` 成功 |
| rule2 | ❌ | `false` 失败 |
| rule3 | ❌ | `not true` → 失败 |
| rule4 | ✅ | `not false` → 成功 |
| rule5 | ✅ | `null` 不是 `false`，成功 |
| rule6 | ❌ | `null` 是成功的，`not` 反转为失败 |
| rule7 | ❌ | 除零 → undefined → 失败 |
| rule8 | ✅ | undefined 经 `not` → 成功 |
| rule9 | ✅ | 赋值成功 |
| rule10 | ✅ | 赋值 `false` 的操作也是成功的！ |
| rule11 | ❌ | 除零导致赋值失败 |
| rule12 | ❌ | `var` 为 `false`，作为条件失败 |
| rule13 | ✅ | `var` 为 `false`，`not var` 成功 |

## 测验二：哪些输入能让规则成功？

```bash
cat > policy/quiz2.rego << 'EOF'
package quiz

import rego.v1

output := true if {
  input.a != input.b
}
EOF
```

分别测试以下五组输入，预测哪些会让 `output` 为 `true`：

输入 1：`a` 和 `b` 都是 `false`

```bash
cat > input.json << 'EOF'
{ "a": false, "b": false }
EOF
opa eval -d policy/ -i input.json 'data.quiz.output' --format pretty
```

输入 2：`a` 为 `true`，`b` 为 `false`

```bash
cat > input.json << 'EOF'
{ "a": true, "b": false }
EOF
opa eval -d policy/ -i input.json 'data.quiz.output' --format pretty
```

输入 3：`a` 为 `false`，`b` 为数字 `100`

```bash
cat > input.json << 'EOF'
{ "a": false, "b": 100 }
EOF
opa eval -d policy/ -i input.json 'data.quiz.output' --format pretty
```

输入 4：只有 `a`，没有 `b`

```bash
cat > input.json << 'EOF'
{ "a": false }
EOF
opa eval -d policy/ -i input.json 'data.quiz.output' --format pretty
```

输入 5：空对象

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.quiz.output' --format pretty
```

答案：只有**输入 2** 和**输入 3** 会让 `output` 为 `true`。

- 输入 1：`false != false` → `false` → 规则失败
- 输入 2：`true != false` → `true` → 规则成功 ✅
- 输入 3：`false != 100` → `true` → 规则成功 ✅
- 输入 4：`input.b` 是无效路径引用 → 整个 `!=` 表达式 undefined → 规则失败
- 输入 5：`input.a` 和 `input.b` 都是无效路径引用 → 规则失败
