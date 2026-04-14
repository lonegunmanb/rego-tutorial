# 第一步：各种类型的赋值

进入工作目录：

```bash
cd /root/workspace
```

## 基本类型赋值

在 Rego 中，规则可以被赋予任意 JSON 数据类型。让我们来逐一体验：

```bash
cat > policy/types.rego << 'EOF'
package main

import rego.v1

# 数字
server_port := 8080

# 字符串
app_name := "my-service"

# 数组
allowed_regions := ["us-east-1", "eu-west-1", "ap-southeast-1"]

# 对象（map）
server_config := {
  "host": "0.0.0.0",
  "port": 8080,
  "debug": false
}
EOF
```

用 `opa eval` 查看这些规则的输出：

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.main' --format pretty
```

你可以看到输出中包含了数字、字符串、数组和对象类型的规则值。

## 表达式赋值

`:=` 右侧可以是任意 Rego 表达式，包括函数调用和算术运算：

```bash
cat > policy/expressions.rego << 'EOF'
package main

import rego.v1

# 字符串拼接
greeting := concat(" ", ["Hello", "Rego"])

# 算术运算
total_cost := 3 * 100 + 50

# 函数调用
upper_name := upper(app_name)

# 组合表达式
service_url := sprintf("http://%s:%d", [server_config.host, server_config.port])
EOF
```

查看输出：

```bash
opa eval -d policy/ -i input.json 'data.main' --format pretty
```

注意 `upper_name` 引用了同一个包中另一条规则 `app_name` 的值，`service_url` 引用了 `server_config` 对象中的字段。在 Rego 中，同一个包内的规则可以互相引用。

## 用 conftest 检查输入数据

表达式赋值在策略检查中非常实用。比如我们可以从输入数据中提取和计算值：

```bash
cat > policy/check.rego << 'EOF'
package main

import rego.v1

total_price := sum([item.price | some item in input.items])

deny contains msg if {
  total_price > 5000
  msg := sprintf("订单总价 %d 超过了 5000 的限额", [total_price])
}
EOF
```

测试一个超过限额的订单：

```bash
cat > input.json << 'EOF'
{
  "items": [
    {"name": "phone", "price": 3000},
    {"name": "pad", "price": 2500}
  ]
}
EOF
conftest test input.json -p policy/
```

再试一个未超限的订单：

```bash
cat > input.json << 'EOF'
{
  "items": [
    {"name": "phone", "price": 2000},
    {"name": "case", "price": 100}
  ]
}
EOF
conftest test input.json -p policy/
```
