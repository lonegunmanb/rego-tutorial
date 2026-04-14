# 第三步：带条件的批量部分定义

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
```

## 批量部分定义 Set

前面的例子中，每条部分定义只添加一个静态值。但部分定义真正强大之处在于可以结合**迭代和条件**，一条规则定义多个成员：

```bash
cat > policy/batch_set.rego << 'EOF'
package partial

import rego.v1

items := ["a-phone", "b-phone", "a-pad"]

# 迭代 items，只将以 "-phone" 结尾的元素加入集合
phones contains item if {
  some item in items
  endswith(item, "-phone")
}

# 迭代 items，只将以 "-car" 结尾的元素加入集合
# 没有任何元素满足条件，但集合仍然存在（值为空集合 {}）
cars contains item if {
  some item in items
  endswith(item, "-car")
}
EOF
```

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.partial' --format pretty
```

注意观察：
- `phones` 包含 `"a-phone"` 和 `"b-phone"`
- `cars` 是空集合 `[]`（OPA 将空集合序列化为 `[]`），而**不是 undefined**

> **关键点**：使用部分定义语法时，即使没有任何规则成功，规则的值也是**空集合 `{}`**（或空对象 `{}`），而不是 `undefined`。这一点与完整定义规则不同——完整定义规则在条件不满足时是 `undefined`。

## 批量部分定义 Object

同样的模式也适用于对象：

```bash
rm -f policy/*.rego
cat > policy/batch_obj.rego << 'EOF'
package partial

import rego.v1

items := ["a-phone", "b-phone", "a-pad"]

# 将以 "-phone" 结尾的元素构建为对象，键为 "x-<索引>"
phone_map[key] := item if {
  some index, item in items
  endswith(item, "-phone")
  key := sprintf("x-%v", [index])
}

# 没有满足条件的元素，结果为空对象 {}
car_map[key] := item if {
  some index, item in items
  endswith(item, "-car")
  key := sprintf("x-%v", [index])
}
EOF
```

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.partial' --format pretty
```

`phone_map` 的值为 `{"x-0": "a-phone", "x-1": "b-phone"}`，`car_map` 为空对象 `{}`。

## 实际场景：conftest 策略

部分定义是编写 conftest 策略时最常用的模式。以下是一个检查 Terraform 配置的典型例子：

```bash
rm -f policy/*.rego
cat > policy/conftest_demo.rego << 'EOF'
package partial

import rego.v1

# 检查所有 S3 存储桶是否启用了加密
deny contains msg if {
  some resource in input.resources
  resource.type == "aws_s3_bucket"
  not resource.encryption
  msg := sprintf("S3 bucket '%s' must enable encryption", [resource.name])
}

# 检查所有安全组是否没有开放 0.0.0.0/0
deny contains msg if {
  some resource in input.resources
  resource.type == "aws_security_group"
  some rule in resource.ingress_rules
  rule.cidr == "0.0.0.0/0"
  msg := sprintf("Security group '%s' must not allow 0.0.0.0/0 ingress", [resource.name])
}
EOF
```

```bash
cat > input.json << 'EOF'
{
  "resources": [
    { "type": "aws_s3_bucket", "name": "my-bucket", "encryption": false },
    { "type": "aws_s3_bucket", "name": "secure-bucket", "encryption": true },
    { "type": "aws_security_group", "name": "open-sg", "ingress_rules": [
      { "cidr": "0.0.0.0/0", "port": 22 }
    ]}
  ]
}
EOF
opa eval -d policy/ -i input.json 'data.partial.deny' --format pretty
```

两条独立的规则各自检查不同类型的违规，结果汇聚到同一个 `deny` 集合中。这就是部分定义在实际策略中的核心价值。
