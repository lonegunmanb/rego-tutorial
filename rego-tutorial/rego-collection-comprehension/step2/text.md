# 第二步：Set 与 Array 生成表达式

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
```

## Set 生成表达式

生成表达式可以从已有集合中按条件筛选，生成新集合。Set 生成表达式的形式为：

```
{ 输出表达式 | 迭代语句 ; 条件 }
```

```bash
cat > policy/set_comp.rego << 'EOF'
package col

import rego.v1

# 从 input.items 中筛选出以 "-phone" 结尾的元素，生成集合
phones := {
  item |
    some item in input.items
    endswith(item, "-phone")
}

# 没有任何元素满足条件时，结果是空集合 {} 而非 undefined
cars := {
  item |
    some item in input.items
    endswith(item, "-car")
}
EOF
```

```bash
cat > input.json << 'EOF'
{ "items": ["a-phone", "b-phone", "a-pad"] }
EOF
opa eval -d policy/ -i input.json 'data.col' --format pretty
```

你会看到 `phones` 是 `["a-phone", "b-phone"]`（OPA 将集合序列化为已排序的数组输出），而 `cars` 是 `[]`（空集合）而不是 `undefined`。

> **这与普通条件规则不同**：普通条件规则在条件不满足时是 `undefined`，而生成表达式永远会产生一个结果（可能为空集合/空数组/空对象）。

## Array 生成表达式

Array 生成表达式把 `{}` 换成 `[]`：

```bash
rm -f policy/*.rego
cat > policy/array_comp.rego << 'EOF'
package col

import rego.v1

# 生成数组（保留顺序，允许重复）
phones := [
  item |
    some item in input.items
    endswith(item, "-phone")
]

# 条件不满足时结果为空数组 []，而非 undefined
cars := [
  item |
    some item in input.items
    endswith(item, "-car")
]
EOF
```

```bash
cat > input.json << 'EOF'
{ "items": ["a-phone", "b-phone", "a-pad"] }
EOF
opa eval -d policy/ -i input.json 'data.col' --format pretty
```

## Set vs Array 的区别

两者行为相近，核心差别：

```bash
rm -f policy/*.rego
cat > policy/set_vs_array.rego << 'EOF'
package col

import rego.v1

# input.nums 中有重复值时的对比
unique := { n | some n in input.nums }   # 集合：自动去重
ordered := [ n | some n in input.nums ]  # 数组：保留顺序和重复
EOF
```

```bash
cat > input.json << 'EOF'
{ "nums": [3, 1, 2, 1, 3] }
EOF
opa eval -d policy/ -i input.json 'data.col' --format pretty
```

`unique` 自动去重并按升序排列，输出为 `[1, 2, 3]`（OPA 将集合序列化为已排序的数组）。`ordered` 保留原始顺序和重复，输出为 `[3, 1, 2, 1, 3]`。
