# 第一步：every 基础用法：AllOf 语义

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
```

前面学过的 `some` 关键字实现的是 **AnyOf** 语义——只要集合中有一个成员满足条件就行。而 `every` 实现的是 **AllOf** 语义——集合中**每一个**成员都必须满足条件，规则才能成立。

## 基本用法

```bash
cat > policy/every_basic.rego << 'EOF'
package every_demo

import rego.v1

nums := {100, 200, 300}

# 每个数都大于 50 —— 成立
output1__every_num_is_above_50 if {
  every num in nums {
    num > 50
  }
}

# 每个数都大于 150 —— 不成立（100 不大于 150）
output2__every_num_is_above_150 if {
  every num in nums {
    num > 150
  }
}
EOF
```

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.every_demo' --format pretty
```

输出中只有 `output1__every_num_is_above_50` 为 `true`，而 `output2__every_num_is_above_150` 不出现——因为 100 不大于 150，`every` 条件不满足。

## every 中的多个条件

`every` 花括号中可以写多个条件，**每一个**成员必须同时满足所有条件：

```bash
rm -f policy/*.rego
cat > policy/every_multi.rego << 'EOF'
package every_demo

import rego.v1

nums := {100, 200, 300}

# 每个数都在 (50, 350) 范围内 —— 成立
output3__in_range if {
  every num in nums {
    num > 50
    num < 350
  }
}

# 每个数都在 (50, 250) 范围内 —— 不成立（300 不小于 250）
output4__in_narrow_range if {
  every num in nums {
    num > 50
    num < 250
  }
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.every_demo' --format pretty
```

只有 `output3__in_range` 为 `true`。`output4__in_narrow_range` 不成立，因为 300 不满足 `num < 250`。

## 实际场景：购物车库存检查

```bash
rm -f policy/*.rego
cat > policy/every_cart.rego << 'EOF'
package every_demo

import rego.v1

# 只有所有商品都有库存时，才允许提交订单
allow_checkout if {
  every item in input.cart {
    item.stock > 0
  }
}

# 统计无库存的商品
out_of_stock := {item.name |
  some item in input.cart
  item.stock == 0
}
EOF
```

先试一个所有商品都有库存的输入：

```bash
cat > input.json << 'EOF'
{
  "cart": [
    { "name": "手机", "stock": 5 },
    { "name": "耳机", "stock": 12 },
    { "name": "充电器", "stock": 3 }
  ]
}
EOF
opa eval -d policy/ -i input.json 'data.every_demo' --format pretty
```

`allow_checkout` 为 `true`，`out_of_stock` 为空集合。

再试一个有缺货商品的输入：

```bash
cat > input.json << 'EOF'
{
  "cart": [
    { "name": "手机", "stock": 5 },
    { "name": "耳机", "stock": 0 },
    { "name": "充电器", "stock": 3 }
  ]
}
EOF
opa eval -d policy/ -i input.json 'data.every_demo' --format pretty
```

`allow_checkout` 不出现（耳机库存为 0），`out_of_stock` 包含 `"耳机"`。
