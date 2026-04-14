# 第一步：常用内建函数（上）：比较、数学、聚合

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
```

Rego 内置了大约 100 多个函数。函数入参是拷贝（不会影响外部），函数出错时返回 undefined（例如除零）。

## 比较操作符

在 Rego 中，比较操作符本身也是函数。让我们验证各种类型的比较行为：

```bash
cat > policy/comparison.rego << 'EOF'
package func

import rego.v1

check_comparison if {
  # 数值比较
  1 == 1
  2 != 1

  # 字符串比较
  "abc" == "abc"
  "abd" != "abc"

  # 集合比较（忽略顺序和重复）
  {1, "a"} == {"a", 1, "a"}
  {1, "b"} != {"a", 1, "a"}

  # 数组比较（顺序和元素必须完全一致）
  [1, {1, 2}] == [1, {2, 1, 2}]
  [{1, 2}, 1] != [1, {2, 1, 2}]

  # 对象比较（忽略键顺序）
  {"x": 1, "y": 2} == {"y": 2, "x": 1}
  {"x": 2, "y": 1} != {"y": 2, "x": 1}
  {"x": 1} != {"y": 2, "x": 1}

  # 字符串按字典序比较
  "abcxx" < "abd"
  "abd" >= "abcxx"
}
EOF
```

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.func.check_comparison' --format pretty
```

所有条件都成立，输出 `true`。注意几个要点：
- **集合**比较忽略顺序和重复元素
- **数组**比较必须顺序和元素完全一致
- **对象**比较忽略键的顺序，但键集合和对应值必须一致

## 数学计算

```bash
rm -f policy/*.rego
cat > policy/math.rego << 'EOF'
package func

import rego.v1

check_math if {
  2 + 1 == 3
  3 - 2 == 1
  2 * 3 == 6
  6 / 3 == 2
  abs(-3) == 3
  ceil(-3.14) == -3
  floor(-3.14) == -4
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.func.check_math' --format pretty
```

## 聚合函数

聚合函数可以对集合、数组、字符串进行统计：

```bash
rm -f policy/*.rego
cat > policy/aggregation.rego << 'EOF'
package func

import rego.v1

check_aggregation if {
  # count 可以作用于字符串、数组、集合、对象
  count("abc") == 3
  count([1, 3, 9]) == 3

  # max / min / sum 作用于数组或集合
  max([1, 3, 9]) == 9
  min([1, 3, 9]) == 1
  sum([1, 3, 9]) == 13
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.func.check_aggregation' --format pretty
```

试试在实际场景中使用聚合函数：

```bash
rm -f policy/*.rego
cat > policy/agg_demo.rego << 'EOF'
package func

import rego.v1

# 检查购物车总价是否超过预算
over_budget if {
  prices := [item.price | some item in input.cart]
  sum(prices) > input.budget
}

# 统计购物车中的商品数量
item_count := count(input.cart)
EOF
```

```bash
cat > input.json << 'EOF'
{
  "cart": [
    { "name": "phone", "price": 999 },
    { "name": "case", "price": 29 },
    { "name": "charger", "price": 49 }
  ],
  "budget": 1000
}
EOF
opa eval -d policy/ -i input.json 'data.func' --format pretty
```

总价 1077 超过预算 1000，所以 `over_budget` 为 `true`。
