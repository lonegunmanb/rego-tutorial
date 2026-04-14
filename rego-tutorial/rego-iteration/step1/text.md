# 第一步：迭代集合与数组

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
```

## 迭代集合（Set）

Rego 的迭代语法是 `some <变量> in <集合>`。每次迭代将集合中的一个成员绑定给变量，然后尝试执行后续的所有条件。只要**至少有一次**能让所有条件同时成立，规则就成功。

```bash
cat > policy/set_iter.rego << 'EOF'
package iter

import rego.v1

# input: { "products": ["a-phone", "b-phone", "a-pad"] }

# 成功：集合中存在以 "-phone" 结尾的成员
has_phone if {
  some item in input.products
  endswith(item, "-phone")
}

# 失败：集合中不存在以 "-car" 结尾的成员
has_car if {
  some item in input.products
  endswith(item, "-car")
}
EOF
```

准备输入数据，然后查看结果：

```bash
cat > input.json << 'EOF'
{ "products": ["a-phone", "b-phone", "a-pad"] }
EOF
opa eval -d policy/ -i input.json 'data.iter' --format pretty
```

你应该看到 `has_phone: true`。`has_car` 不会出现在输出中，因为没有成员能满足条件，规则未定义（undefined）。

## 迭代数组

数组的迭代语法与集合完全相同：

```bash
rm -f policy/*.rego
cat > policy/array_iter.rego << 'EOF'
package iter

import rego.v1

# input: { "items": ["a-phone", "b-phone", "a-pad"] }

has_phone if {
  some item in input.items
  endswith(item, "-phone")
}

has_car if {
  some item in input.items
  endswith(item, "-car")
}
EOF
```

```bash
cat > input.json << 'EOF'
{ "items": ["a-phone", "b-phone", "a-pad"] }
EOF
opa eval -d policy/ -i input.json 'data.iter' --format pretty
```

## 迭代对象的值

用相同的语法也可以迭代对象的所有**值**：

```bash
rm -f policy/*.rego
cat > policy/obj_iter.rego << 'EOF'
package iter

import rego.v1

# input.catalog 是一个对象，some item in ... 迭代它的所有值
has_phone if {
  some item in input.catalog
  endswith(item, "-phone")
}
EOF
```

```bash
cat > input.json << 'EOF'
{
  "catalog": {
    "x-1": "a-phone",
    "x-2": "b-phone",
    "y-1": "a-pad"
  }
}
EOF
opa eval -d policy/ -i input.json 'data.iter.has_phone' --format pretty
```

`some item in object` 只枚举**值**，不枚举键。如果需要同时获取键，请看下一步。
