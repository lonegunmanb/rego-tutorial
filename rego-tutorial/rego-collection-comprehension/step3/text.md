# 第三步：Object 生成表达式与内联用法

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
```

## Object 生成表达式

Object 生成表达式以 `{ 键: 值 | 迭代语句 ; 条件 }` 的形式同时生成键和值：

```bash
cat > policy/obj_comp.rego << 'EOF'
package col

import rego.v1

# 将以 "-phone" 结尾的元素按 "x-<索引>" 为键构建对象
# input: { "items": ["a-phone", "b-phone", "a-pad"] }
phone_map := {
  key: item |
    some index, item in input.items
    endswith(item, "-phone")
    key := sprintf("x-%v", [index])
}

# 没有元素满足条件时，结果为空对象 {}
car_map := {
  key: item |
    some index, item in input.items
    endswith(item, "-car")
    key := sprintf("x-%v", [index])
}
EOF
```

```bash
cat > input.json << 'EOF'
{ "items": ["a-phone", "b-phone", "a-pad"] }
EOF
opa eval -d policy/ -i input.json 'data.col' --format pretty
```

输入中索引 0 是 `"a-phone"`，索引 1 是 `"b-phone"`，所以 `phone_map` 为 `{"x-0": "a-phone", "x-1": "b-phone"}`。`car_map` 为 `{}`。

## 生成表达式作为内联条件

生成表达式也可以直接写在规则条件中，而不必单独赋值给规则：

```bash
rm -f policy/*.rego
cat > policy/inline.rego << 'EOF'
package col

import rego.v1

# 用 count() 统计筛选结果，不必先定义中间规则
phone_count := count([item | some item in input.items; endswith(item, "-phone")])

# 条件：筛选后的集合非空
has_phone if {
  phones := {item | some item in input.items; endswith(item, "-phone")}
  count(phones) > 0
}
EOF
```

```bash
cat > input.json << 'EOF'
{ "items": ["a-phone", "b-phone", "a-pad"] }
EOF
opa eval -d policy/ -i input.json 'data.col' --format pretty
```

## 综合练习

试着修改 `input.json` 使 `has_phone` 变为 `undefined`（即没有任何 phone）：

```bash
cat > input.json << 'EOF'
{ "items": ["a-pad", "a-watch"] }
EOF
opa eval -d policy/ -i input.json 'data.col' --format pretty
```

`phone_count` 为 `0`，`has_phone` 为 `undefined`（因为 `count(phones) > 0` 条件不成立）。注意 `phone_count` 本身不会是 `undefined`，因为它使用了 Array comprehension，空数组的 `count` 是 `0`。
