# 第二步：无效路径引用与 exists 技巧

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
echo '{}' > input.json
```

## 无效路径引用导致规则静默失败

```bash
cat > policy/invalid_ref.rego << 'EOF'
package pitfalls

import rego.v1

# 当 access_level < 3 时拒绝访问
deny_access if {
  input.access_level < 3
}
EOF
```

先用正常数据测试：

```bash
echo '{"access_level": 1}' > input.json
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

`deny_access` 为 `true`——正确。

现在用空数据测试：

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

输出为空！`deny_access` 未定义——`input.access_level` 是无效路径引用，规则直接失败了。攻击者可以通过发送空数据绕过检查！

## 用 not 检测缺失字段的局限

```bash
rm -f policy/*.rego
cat > policy/not_check.rego << 'EOF'
package pitfalls

import rego.v1

deny_access if {
  input.access_level < 3
}

# 尝试用 not 检测字段缺失
deny_access := "Error: access_level missing" if {
  not input.access_level
}
EOF
```

空数据时：

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

`deny_access` 为 `"Error: access_level missing"`——看起来对了。

但如果 `access_level` 是布尔 `false` 呢？

```bash
echo '{"access_level": false}' > input.json
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

也报了 `"Error: access_level missing"`！因为 `not false` 是 `true`，把"值为 false"误判成了"字段不存在"。

## exists 函数：安全判断路径存在

```bash
rm -f policy/*.rego
cat > policy/exists.rego << 'EOF'
package pitfalls

import rego.v1

# 安全的 exists 函数
exists(x) if {
  x == x
}

# 测试各种情况
output1__missing := exists(input.admin)       # 字段不存在
output2__false := exists(input.is_active)     # 值为 false
output3__true := exists(input.name)           # 值为字符串
EOF
```

```bash
echo '{"is_active": false, "name": "Alice"}' > input.json
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

- `output1__missing` 不出现（`input.admin` 不存在 → 函数调用失败）
- `output2__false` 为 `true`（`false == false` 成立）
- `output3__true` 为 `true`（`"Alice" == "Alice"` 成立）

`exists` 正确地区分了"字段不存在"和"值为 false"。

## not x == x：判断路径不存在

为什么不用 `not exists(input.admin)`？因为当路径无效时，函数调用直接失败，`not` 无法反转函数调用的失败。但 `==` 操作符是例外——它在包含无效路径引用时返回 `false`，而不是直接失败：

```bash
rm -f policy/*.rego
cat > policy/not_exists.rego << 'EOF'
package pitfalls

import rego.v1

# 判断路径不存在的正确方式
admin_absent if {
  not input.admin == input.admin
}

# 错误方式：not exists 不行
exists(x) if { x == x }

admin_absent_wrong if {
  not exists(input.admin)
}
EOF
```

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

`admin_absent` 为 `true`——`not x == x` 方式正确工作了。

`admin_absent_wrong` 也看看是否出现——由于无效路径引用传入函数调用时触发的是直接失败而非返回 `false`，`not` 无法对其反转。

验证有值时是否正确：

```bash
echo '{"admin": false}' > input.json
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

`admin_absent` 不出现——字段存在（即使值为 `false`），`false == false` 为 `true`，被 `not` 反转后不成立。

```bash
echo '{}' > input.json
```
