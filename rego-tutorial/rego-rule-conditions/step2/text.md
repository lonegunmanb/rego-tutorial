# 第二步：赋值语句条件与集合成员条件

## 赋值语句条件

规则中的赋值语句本身也是一种条件。赋值能成功完成则条件成功，赋值失败（右侧是 undefined）则整条规则失败。

先清理之前的策略文件：

```bash
cd /root/workspace
rm -f policy/*.rego
```

```bash
cat > policy/assign.rego << 'EOF'
package play

import rego.v1

# 赋值成功的例子
assign_success if {
  var1 := 1 + 2          # 成功：var1 = 3
  var2 := upper("str")   # 成功：var2 = "STR"
  var3 := false          # 成功：赋值 false 的操作本身是成功的！
}

# 赋值失败的例子
assign_fail_path if {
  var1 := input.no_such_field   # 失败：无效路径引用
}

assign_fail_div if {
  var2 := 5 / 0                 # 失败：除零错误
}

assign_fail_convert if {
  var3 := to_number("abc")      # 失败：转换失败
}
EOF
```

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.play' --format pretty
```

只有 `assign_success` 出现在输出中。特别注意：**`var3 := false` 是成功的**——赋值操作完成了，不管赋的值是什么。

## 赋值 false vs 条件 false

这个区别非常微妙但极其重要：

```bash
cat > policy/assign_vs_cond.rego << 'EOF'
package play

import rego.v1

# 赋值 false 成功，但后续把 var 当条件会失败
assign_then_use if {
  var := false    # 赋值成功
  var             # 条件失败！因为 var 的值是 false
}

# 赋值 false 成功，用 not 反转
assign_then_not if {
  var := false    # 赋值成功
  not var         # 条件成功！not false = true
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.play' --format pretty
```

`assign_then_use` 失败，`assign_then_not` 成功。

## 集合成员条件

使用 `in` 关键字检查成员是否属于集合：

```bash
cat > policy/membership.rego << 'EOF'
package play

import rego.v1

allowed_roles := {"admin", "editor", "viewer"}
items := ["apple", "banana", "cherry"]
config := {"host": "localhost", "port": 8080}

# 检查 set 成员
check_set if {
  "admin" in allowed_roles     # 成功
}

# 检查 array 元素（按值检查）
check_array if {
  "banana" in items            # 成功
}

# 检查 object 的值（不是键！）
check_object_value if {
  "localhost" in config        # 成功：检查的是值
}

# 常见错误：用 in 检查 object 的键会失败
check_object_key_fail if {
  "host" in config             # 失败！"host" 是键，不是值
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.play' --format pretty
```

`check_set`、`check_array`、`check_object_value` 成功，`check_object_key_fail` 不会出现。

## 用 some 检查键或索引是否存在

```bash
cat > policy/some_check.rego << 'EOF'
package play

import rego.v1

items := ["apple", "banana", "cherry"]
config := {"host": "localhost", "port": 8080}

# 检查索引是否存在
has_index_0 if { some 0, _ in items }
has_index_5 if { some 5, _ in items }    # 失败：索引 5 不存在

# 检查键是否存在
has_key_host if { some "host", _ in config }
has_key_name if { some "name", _ in config }  # 失败：键 "name" 不存在

# 反模式：用 [] 检查存在性的坑
bad_items := ["apple", false]
bad_check if {
  bad_items[0]    # 成功："apple"
  bad_items[1]    # 失败！值为 false
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.play' --format pretty
```

`has_index_0`、`has_key_host` 成功。`has_index_5`、`has_key_name`、`bad_check` 都不会出现。注意 `bad_check` 里 `bad_items[1]` 的值是 `false`，所以条件失败——这就是为什么推荐用 `some index, _ in array` 而非 `array[index]`。
