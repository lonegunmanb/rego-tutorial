# 第二步：键值对迭代与 `_` 匿名变量

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
```

## 数组的键值对迭代

用 `some index, item in array` 可以同时获取数组的**索引**和**值**：

```bash
cat > policy/kv_array.rego << 'EOF'
package iter

import rego.v1

# 索引 > 0 且值以 "-phone" 结尾
# input: { "items": ["a-phone", "b-phone", "a-pad"] }
has_phone_after_index_0 if {
  some index, item in input.items  # 枚举：0:"a-phone", 1:"b-phone", 2:"a-pad"
  endswith(item, "-phone")          # 满足: 0:"a-phone", 1:"b-phone"
  index > 0                         # 满足: 1:"b-phone", 2:"a-pad"
                                    # 交集: 1:"b-phone" → 两个条件同时满足 → 成功
}

has_phone_after_index_1 if {
  some index, item in input.items
  endswith(item, "-phone")  # 满足: 0:"a-phone", 1:"b-phone"
  index > 1                 # 满足: 2:"a-pad"
                            # 无交集 → 失败
}
EOF
```

```bash
cat > input.json << 'EOF'
{ "items": ["a-phone", "b-phone", "a-pad"] }
EOF
opa eval -d policy/ -i input.json 'data.iter' --format pretty
```

只有 `has_phone_after_index_0` 出现在输出中。

## 对象的键值对迭代

```bash
rm -f policy/*.rego
cat > policy/kv_object.rego << 'EOF'
package iter

import rego.v1

# input.catalog: {"x-1": "a-phone", "x-2": "b-phone", "y-1": "a-pad"}

# 键以 "x-" 开头且值以 "-phone" 结尾
has_x_key_phone if {
  some key, value in input.catalog
  startswith(key, "x-")
  endswith(value, "-phone")
}

# 键以 "y-" 开头且值以 "-phone" 结尾（无满足条件的键值对 → 失败）
has_y_key_phone if {
  some key, value in input.catalog
  startswith(key, "y-")
  endswith(value, "-phone")
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
opa eval -d policy/ -i input.json 'data.iter' --format pretty
```

## `_` 匿名变量

当你只关心键或值之一时，用 `_` 占位来忽略不需要的那个：

```bash
rm -f policy/*.rego
cat > policy/wildcard.rego << 'EOF'
package iter

import rego.v1

# 只关心键，不关心值
has_x_key if {
  some key, _ in input.catalog
  startswith(key, "x-")
}

# 只关心值，不关心索引
has_phone_value if {
  some _, value in input.catalog
  endswith(value, "-phone")
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
opa eval -d policy/ -i input.json 'data.iter' --format pretty
```

> **注意**：每个 `_` 都是独立的匿名变量，同一条规则中可以出现多个 `_`，它们互相独立、互不干扰。
