# 第三步：错别字与输入数据预校验

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
echo '{}' > input.json
```

## 错别字不会报错

Rego 中拼错字段名不会引发语法错误——无效路径引用只会静默地让规则失败：

```bash
cat > policy/typo.rego << 'EOF'
package pitfalls

import rego.v1

# 正确的字段名
output1__correct if {
  input.payload.items[0].price > 500
}

# 错别字：items 拼成 itmes
output2__typo_field if {
  input.payload.itmes[0].price > 500
}

# 路径层级错误：少了 payload
output3__typo_path if {
  input.items[0].price > 500
}

# 单复数搞混：items 写成 item
output4__typo_plural if {
  input.payload.item[0].price > 500
}
EOF
```

```bash
cat > input.json << 'EOF'
{
  "payload": {
    "items": [
      {"id": "a-phone", "price": 1000}
    ]
  }
}
EOF
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

只有 **output1__correct** 为 **true**。其他三条规则因为路径无效而静默失败——没有任何错误提示！

在实际项目中，这种错误可能需要很长时间才能被发现。

## 输入数据预校验

更好的做法是在执行策略前，先校验输入数据的结构和类型：

```bash
rm -f policy/*.rego
cat > policy/validate.rego << 'EOF'
package pitfalls

import rego.v1

# ===== 输入预校验 =====

input_is_valid if {
  is_number(input.user.access_level)
  glob.match("/**", ["/"], input.path)
  is_array(input.payload.items)
  every item in input.payload.items {
    item_is_valid(item)
  }
}

item_is_valid(item) := true if {
  item.type in {"phone", "tablet", "accessory"}
  is_number(item.price)
  item.price >= 0
  is_string(item.id)
}

# ===== 策略规则 =====

# 普通用户只能添加 1000 以下的商品
policy_allow if {
  input.user.access_level >= 1
  every item in input.payload.items {
    item.price <= 1000
  }
}

# 高级用户可以添加 2000 以下的商品
policy_allow if {
  input.user.access_level >= 2
  every item in input.payload.items {
    item.price <= 2000
  }
}

# ===== 最终决策 =====

# 先校验数据，再执行策略
allow if {
  input_is_valid == true
  policy_allow == true
}

# 数据无效时明确拒绝
deny := "invalid input data" if {
  not input_is_valid
}
EOF
```

用合法数据测试：

```bash
cat > input.json << 'EOF'
{
  "user": {"access_level": 2},
  "path": "/catalog",
  "payload": {
    "items": [
      {"id": "a-phone", "type": "phone", "price": 1000},
      {"id": "b-phone", "type": "phone", "price": 500}
    ]
  }
}
EOF
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

**allow** 为 **true**，**input_is_valid** 为 **true**。

用非法数据测试（price 是字符串）：

```bash
cat > input.json << 'EOF'
{
  "user": {"access_level": 2},
  "path": "/catalog",
  "payload": {
    "items": [
      {"id": "a-phone", "type": "phone", "price": "free"}
    ]
  }
}
EOF
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

**allow** 不出现，**deny** 为 **"invalid input data"**——预校验在策略执行前就拦截了非法数据。

用空数据测试：

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

同样被预校验拦截。无论数据如何畸形，都不会影响策略规则的判断。
