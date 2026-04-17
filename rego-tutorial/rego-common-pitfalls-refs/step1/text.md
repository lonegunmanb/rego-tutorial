# 第一步：未声明迭代变量陷阱

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
echo '{}' > input.json
```

## 看似无害的迭代

先来看一段正常工作的代码：

```bash
cat > policy/iter_ok.rego << 'EOF'
package pitfalls

import rego.v1

array1 := ["a", "b", "c"]

# 用未声明的变量 i 迭代 —— 通常能正常工作
output1__has_a if {
  array1[i] == "a"
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

`output1__has_a` 为 `true`——`i` 被自动创建为局部变量，遍历了数组的所有索引。

## 当变量名冲突时

现在，我们模拟同一个包中另一个文件定义了一个包级变量 `x`：

```bash
rm -f policy/*.rego
cat > policy/module1.rego << 'EOF'
package pitfalls

import rego.v1

array1 := ["a", "b", "c"]

# 用未声明的变量 i 迭代 —— 正常
output1__has_a_with_i if {
  array1[i] == "a"
}

# 用未声明的变量 x 迭代 —— 可能有问题！
output2__has_a_with_x if {
  array1[x] == "a"
}
EOF
```

```bash
cat > policy/module2.rego << 'EOF'
package pitfalls

import rego.v1

# 同一个包中定义了包级变量 x
x := 2 if {
  1 == 1
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

`output1__has_a_with_i` 为 `true`，而 `output2__has_a_with_x` **不出现**！

原因：`x` 在包级作用域已经被定义为 `2`，所以 `array1[x]` 实际上是 `array1[2]`（即 `"c"`），`"c" == "a"` 当然不成立。

## 用 some 解决问题

```bash
rm -f policy/*.rego
cat > policy/iter_safe.rego << 'EOF'
package pitfalls

import rego.v1

array1 := ["a", "b", "c"]

# 同一个包里仍然有 x := 2
x := 2 if { 1 == 1 }

# 方式一：some x 显式声明局部变量（遮蔽包级 x）
output1__safe_some if {
  some x
  array1[x] == "a"
}

# 方式二：some item in（推荐）
output2__safe_some_in if {
  some item in array1
  item == "a"
}

# 方式三：匿名变量 _
output3__safe_wildcard if {
  array1[_] == "a"
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

三种方式都输出 `true`——显式声明迭代变量后，包级的 `x` 不再影响迭代行为。

**规则**：始终用 `some` 声明迭代变量，或使用 `_` 匿名变量。永远不要依赖"自动创建局部变量"的行为。
