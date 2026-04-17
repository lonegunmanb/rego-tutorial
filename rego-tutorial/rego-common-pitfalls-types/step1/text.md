# 第一步：集合与对象的比较陷阱

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
echo '{}' > input.json
```

## 同类型比较：数值、字符串、数组

先来看一组行为正常的比较，确认我们的理解没有偏差：

```bash
cat > policy/same_type.rego << 'EOF'
package pitfalls

import rego.v1

output1__same_type if {
  3 > 1                      # 数值比较
  true > false               # true 大于 false
  "b" > "a"                  # 字符串按字典序
  "b" > "ac"                 # "b" > "a"，所以 "b" > "ac"
  "ada" > "ac"               # "d" > "c"
  "ba" > "b"                 # 前缀相同时，更长的更大

  # 数组也是按字典序（从索引 0 开始逐个比较）
  ["b"] > ["a"]
  ["b"] > ["a", "c"]
  ["a", "d", "a"] > ["a", "c"]
  ["b", "a"] > ["b"]
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

**output1__same_type** 为 **true**——数值、字符串、数组的比较规则清晰明确。

## 集合（set）之间的比较

数组有确定的顺序，所以比较结果是可预测的。但集合（set）没有确定的成员顺序：

```bash
rm -f policy/*.rego
cat > policy/set_compare.rego << 'EOF'
package pitfalls

import rego.v1

# 两个集合是否相等？—— 安全的
output1__sets_equal if {
  {1, 2, 3} == {3, 2, 1}    # true：集合相等不依赖顺序
}

# 两个集合比大小？—— 不安全！
output2__set_a_gt_b := {1, 2, 3} > {4, 5}

# 再试另一对
output3__set_c_gt_d := {"a", "b"} > {"c"}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

**output1__sets_equal** 为 **true**——集合的**相等判断**是安全的，不依赖成员顺序。

但 **output2__set_a_gt_b** 和 **output3__set_c_gt_d** 的结果可能会因 OPA 版本不同而不同，因为集合内部迭代的顺序不确定。

## 对象（object）之间的比较

类似地，对象的键值对顺序也不确定：

```bash
rm -f policy/*.rego
cat > policy/obj_compare.rego << 'EOF'
package pitfalls

import rego.v1

# 对象相等？—— 安全
output1__obj_equal if {
  {"a": 1, "b": 2} == {"b": 2, "a": 1}
}

# 对象比大小？—— 不安全！
output2__obj_a_gt_b := {"a": 1, "b": 2} > {"c": 3}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

**要记住的规则**：对集合和对象，只使用 **==** 和 **!=** 判等，**不要**使用 **>**、**<**、**>=**、**<=** 比较大小。
