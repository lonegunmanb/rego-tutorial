# 第一步：JSON 语法声明集合

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
```

## 声明数组、对象、集合

Rego 支持用标准 JSON 语法声明数组（array）和对象（object），同时还有 Rego 特有的集合（set）字面量——与对象语法相同但成员之间无冒号：

```bash
cat > policy/declare.rego << 'EOF'
package col

import rego.v1

# 数组（Array）：有序，允许重复
phones_array := ["a-phone", "b-phone", "a-pad"]

# 对象（Object）：键值对
catalog_object := {
  "x-1": "a-phone",
  "x-2": "b-phone",
  "y-1": "a-pad"
}

# 集合（Set）：无序，自动去重
product_set := {"a-phone", "b-phone", "a-pad"}
EOF
```

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.col' --format pretty
```

注意输出中：
- 数组 `phones_array` 和集合 `product_set` 在输出里看起来都是 `[...]`——因为 JSON 没有原生的 set 类型，OPA 在输出时把集合序列化为已排序的数组
- 对象 `catalog_object` 输出为 `{"key": value}` 形式
- 集合的顺序按元素排序，而不是声明顺序；并且集合会自动去重

## 集合成员可以是任意 Rego 表达式

```bash
rm -f policy/*.rego
cat > policy/expr.rego << 'EOF'
package col

import rego.v1

phone_list := ["a-phone", "b-phone", "a-pad"]

# 集合成员可以是：数值表达式、内嵌对象、其他规则的值
mixed_set := {
  abs(-200 + 3),
  {"vendor": "acme"},
  phone_list
}
EOF
```

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.col' --format pretty
```

## 带条件的集合声明

和任何其他规则一样，集合声明也可以附带 `if {}` 条件块：

```bash
rm -f policy/*.rego
cat > policy/cond.rego << 'EOF'
package col

import rego.v1

# 只有 input.enabled 为 true 时，phones 才被定义
phones := ["a-phone", "b-phone"] if {
  input.enabled == true
}
EOF
```

先测试条件成立的情况：

```bash
cat > input.json << 'EOF'
{ "enabled": true }
EOF
opa eval -d policy/ -i input.json 'data.col.phones' --format pretty
```

再测试条件不成立的情况：

```bash
cat > input.json << 'EOF'
{ "enabled": false }
EOF
opa eval -d policy/ -i input.json 'data.col.phones' --format pretty
```

条件不成立时，`phones` 是 `undefined`（规则整体未定义），而不是空数组。
