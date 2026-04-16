# 第二步：在 every 中实现逻辑或

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
echo '{}' > input.json
```

`every` 内部的多个条件是**逻辑与**关系。如果需要在 `every` 中表达**逻辑或**，有两种方法。

## 方法一：利用 in 操作符

当逻辑或的条件是"属于某个集合"时，可以直接用 `in` 操作符：

```bash
cat > policy/every_in.rego << 'EOF'
package every_demo

import rego.v1

items := {
  {"id": "a-phone", "color": "red", "type": "phone"},
  {"id": "b-phone", "color": "red", "type": "phone"},
  {"id": "a-pad", "color": "red", "type": "tablet"},
  {"id": "b-pad", "color": "blue", "type": "tablet"},
}

# 每个商品的颜色都是红色或蓝色
every_item_is_red_or_blue if {
  every item in items {
    item.color in {"red", "blue"}
  }
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.every_demo' --format pretty
```

`every_item_is_red_or_blue` 为 `true`——所有商品颜色要么是红色要么是蓝色。

## 方法二：用辅助函数实现逻辑或

当逻辑或的条件更复杂时，可以用**函数重载**定义辅助函数。这利用了上一章学过的知识——多个同名函数实现逻辑或：

```bash
rm -f policy/*.rego
cat > policy/every_helper.rego << 'EOF'
package every_demo

import rego.v1

items := {
  {"id": "a-phone", "color": "red", "type": "phone"},
  {"id": "b-phone", "color": "red", "type": "phone"},
  {"id": "a-pad", "color": "red", "type": "tablet"},
  {"id": "b-pad", "color": "blue", "type": "tablet"},
}

# 辅助函数：颜色是红色或蓝色（两个同名函数 = 逻辑或）
is_red_or_blue(item) if item.color == "red"
is_red_or_blue(item) if item.color == "blue"

# 用辅助函数检查
every_item_is_red_or_blue if {
  every item in items {
    is_red_or_blue(item)
  }
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.every_demo' --format pretty
```

效果相同，`every_item_is_red_or_blue` 为 `true`。

## 表达蕴含关系：所有手机都是红色的

"所有手机都是红色的"可以转化为：**每件商品，要么不是手机，要么是红色的**。

```bash
rm -f policy/*.rego
cat > policy/every_imply.rego << 'EOF'
package every_demo

import rego.v1

items := {
  {"id": "a-phone", "color": "red", "type": "phone"},
  {"id": "b-phone", "color": "red", "type": "phone"},
  {"id": "a-pad", "color": "red", "type": "tablet"},
  {"id": "b-pad", "color": "blue", "type": "tablet"},
}

# 辅助函数：不是手机，或者是红色的
is_not_phone_or_is_red(item) if not item.type == "phone"
is_not_phone_or_is_red(item) if item.color == "red"

# 所有手机都是红色的 —— 成立
output1__every_phone_is_red if {
  every item in items {
    is_not_phone_or_is_red(item)
  }
}

# 辅助函数：不是红色的，或者是手机
is_not_red_or_is_phone(item) if not item.color == "red"
is_not_red_or_is_phone(item) if item.type == "phone"

# 所有红色商品都是手机 —— 不成立（存在红色的 tablet）
output2__every_red_item_is_phone if {
  every item in items {
    is_not_red_or_is_phone(item)
  }
}

# 辅助函数：不是蓝色的，或者是 tablet
is_not_blue_or_is_tablet(item) if not item.color == "blue"
is_not_blue_or_is_tablet(item) if item.type == "tablet"

# 所有蓝色商品都是 tablet —— 成立
output3__every_blue_item_is_tablet if {
  every item in items {
    is_not_blue_or_is_tablet(item)
  }
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.every_demo' --format pretty
```

观察输出：
- `output1__every_phone_is_red` 为 `true`——两部手机确实都是红色
- `output2__every_red_item_is_phone` 不出现——红色的 tablet（a-pad）存在
- `output3__every_blue_item_is_tablet` 为 `true`——唯一的蓝色商品是 tablet

这种"**要么不满足前提，要么满足结论**"的模式是形式逻辑中"蕴含"(P → Q ≡ ¬P ∨ Q) 的经典表达。
