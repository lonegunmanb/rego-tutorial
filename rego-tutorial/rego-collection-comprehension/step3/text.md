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

输出结果：

- `phone_map`：索引 0 对应 `"a-phone"`，索引 1 对应 `"b-phone"`，结果为 `{"x-0": "a-phone", "x-1": "b-phone"}`
- `car_map`：没有任何元素满足条件，结果为空对象 `{}`

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

你应该看到输出只有 `phone_count: 0`，而 `has_phone` **不出现在输出中**。

这正是"undefined"在 OPA 中的表现方式——OPA 不会输出 `has_phone: undefined`，而是直接把未定义的规则从结果中省略。`phone_count` 本身始终有值（空数组的 `count` 是 `0`），因为 Array comprehension 在没有元素匹配时返回空数组 `[]`，而不是 `undefined`。
