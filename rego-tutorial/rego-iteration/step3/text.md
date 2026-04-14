# 第三步：嵌套迭代与自由迭代

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
```

## 嵌套迭代

在同一条规则中使用多个 `some ... in` 可以实现嵌套迭代，用来检查两个集合是否有公共元素：

```bash
cat > policy/nested.rego << 'EOF'
package iter

import rego.v1

# input: {
#   "catalog1": {"x-1": "a-phone", "x-2": "b-phone", "y-1": "a-pad"},
#   "catalog2": {"104": "a-watch", "105": "b-watch", "108": "a-phone"}
# }

have_common_item if {
  some v1 in input.catalog1
  some v2 in input.catalog2
  v1 == v2
}
EOF
```

```bash
cat > input.json << 'EOF'
{
  "catalog1": {"x-1": "a-phone", "x-2": "b-phone", "y-1": "a-pad"},
  "catalog2": {"104": "a-watch", "105": "b-watch", "108": "a-phone"}
}
EOF
opa eval -d policy/ -i input.json 'data.iter.have_common_item' --format pretty
```

`"a-phone"` 同时出现在两个目录中，所以规则成功返回 `true`。

## 对嵌套结构逐层迭代

当结构有多层嵌套时，逐层引入迭代变量：

```bash
rm -f policy/*.rego
cat > policy/nested2.rego << 'EOF'
package iter

import rego.v1

# input.catalog 结构：
# {
#   "x-1": {"name": "a-phone", "suppliers": ["a-corp", "z-corp"]},
#   "x-2": {"name": "b-phone", "suppliers": ["b-corp", "z-corp"]},
#   "y-1": {"name": "a-pad",   "suppliers": ["a-corp"]}
# }

# 判断 catalog 中是否有某个产品的 suppliers 包含 "b-corp"
has_supplier_b_corp if {
  some item in input.catalog         # 第一层迭代：枚举每个产品
  some supplier in item.suppliers    # 第二层迭代：枚举每个供应商
  supplier == "b-corp"
}
EOF
```

```bash
cat > input.json << 'EOF'
{
  "catalog": {
    "x-1": {"name": "a-phone", "suppliers": ["a-corp", "z-corp"]},
    "x-2": {"name": "b-phone", "suppliers": ["b-corp", "z-corp"]},
    "y-1": {"name": "a-pad",   "suppliers": ["a-corp"]}
  }
}
EOF
opa eval -d policy/ -i input.json 'data.iter.has_supplier_b_corp' --format pretty
```

## 自由迭代：`some` 声明 + 路径访问

对于上面的嵌套迭代，还有一种更简洁的写法——"自由迭代"。先用 `some` 声明所有迭代变量，然后直接在路径表达式中使用：

```bash
rm -f policy/*.rego
cat > policy/free_iter.rego << 'EOF'
package iter

import rego.v1

# 标准形式（逐层迭代）
has_supplier_b_corp_standard if {
  some item in input.catalog
  some supplier in item.suppliers
  supplier == "b-corp"
}

# 自由迭代形式：one声明，路径中直接使用
has_supplier_b_corp_free if {
  some id, index
  input.catalog[id].suppliers[index] == "b-corp"
}

# 最简形式：用 _ 替代所有不关心的迭代维度
has_supplier_b_corp_wildcard if {
  input.catalog[_].suppliers[_] == "b-corp"
}
EOF
```

```bash
cat > input.json << 'EOF'
{
  "catalog": {
    "x-1": {"name": "a-phone", "suppliers": ["a-corp", "z-corp"]},
    "x-2": {"name": "b-phone", "suppliers": ["b-corp", "z-corp"]},
    "y-1": {"name": "a-pad",   "suppliers": ["a-corp"]}
  }
}
EOF
opa eval -d policy/ -i input.json 'data.iter' --format pretty
```

三条规则都成功，输出结果相同。

> ⚠️ **注意**：`_` 每次出现都代表一个全新的匿名变量，与之前或之后的 `_` 互不相关。但如果你想在条件之间**引用同一个值**，应使用命名变量（如 `id`、`index`），而不是 `_`。

> ⚠️ **反模式警告**：不加 `some` 声明也不用 `_` 直接写 `catalog[id].suppliers[index] == "b-corp"` 是 Rego v0 的旧写法，在 v1 中会报错。始终使用 `some` 或 `_`。
