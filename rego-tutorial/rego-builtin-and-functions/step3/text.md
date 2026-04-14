# 第三步：用户定义函数与函数重载

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
```

## 定义函数

当内建函数不够用时，可以自定义函数。语法与部分定义对象很相似，区别是把方括号换成**圆括号**：

```bash
cat > policy/user_func.rego << 'EOF'
package func

import rego.v1

# 从 "IP:端口" 格式的字符串中提取端口号
port_number(addr_str) := port if {
  strings := split(addr_str, ":")       # ["10.0.0.1", "80"]
  port := to_number(strings[1])         # 80
}

# 使用示例
result1 := port_number("10.0.0.1:80")     # 80
result2 := port_number("192.168.1.1:443") # 443

# 函数可以在条件中使用
high_port if {
  port_number(input.addr) > 1024
}
EOF
```

```bash
cat > input.json << 'EOF'
{ "addr": "10.0.0.1:8080" }
EOF
opa eval -d policy/ -i input.json 'data.func' --format pretty
```

`port_number` 函数接收一个地址字符串，返回端口号。`high_port` 规则调用该函数判断端口是否大于 1024。

## 函数重载实现逻辑或

与规则一样，Rego 允许定义**多个同名函数**。只要其中一个函数体的条件成立，就返回对应的值——这实现了"逻辑或"的效果。

下面是一个同时支持 IPv4 和 IPv6 地址的端口提取函数：

```bash
rm -f policy/*.rego
cat > policy/overload.rego << 'EOF'
package func

import rego.v1

# IPv4 情况：格式为 "10.0.0.1:80"
port_number(addr_str) := port if {
  glob.match("*.*.*.*:*", [".", ":"], addr_str)  # 验证 IPv4:port 格式
  strings := split(addr_str, ":")
  port := to_number(strings[1])
}

# IPv6 情况：格式为 "[2001:db8::1]:80"
port_number(addr_str) := port if {
  parts := split(addr_str, ":")
  last_index := count(parts) - 1
  startswith(parts[0], "[")                      # 简单格式验证
  endswith(parts[last_index - 1], "]")
  port := to_number(parts[last_index])
}

# 测试各种输入
ipv4_port := port_number("10.0.0.1:80")          # 80
ipv6_port := port_number("[2001:db8::1]:80")      # 80
invalid1 := port_number("10.0.0.1")              # undefined（无端口）
invalid2 := port_number("2001:db8::1")            # undefined（无方括号）
EOF
```

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.func' --format pretty
```

观察输出：
- `ipv4_port` 和 `ipv6_port` 都成功提取了端口号 80
- `invalid1` 和 `invalid2` 不出现在输出中——两个函数体的条件都不满足，返回 undefined

这就是函数重载的威力：两个同名函数分别处理 IPv4 和 IPv6 格式，OPA 会逐一尝试，只要有一个成功就返回结果。

## 函数与部分定义对象的区别

函数和部分定义对象都是"将输入映射到输出"，但有两个关键差异：

```bash
rm -f policy/*.rego
cat > policy/func_vs_obj.rego << 'EOF'
package func

import rego.v1

# 部分定义对象：键必须是有限的、预先确定的值
status_text["active"] := "活跃"
status_text["inactive"] := "未激活"
status_text["pending"] := "待审核"

# 函数：入参空间是无限的，可以接受任意输入
describe(status, name) := msg if {
  text := status_text[status]
  msg := sprintf("用户 %v 的状态为：%v", [name, text])
}
EOF
```

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.func.describe("active", "Alice")' --format pretty
opa eval -d policy/ -i input.json 'data.func.describe("unknown", "Bob")' --format pretty
```

第一个查询返回 `"用户 Alice 的状态为：活跃"`；第二个返回 undefined，因为 `status_text` 中没有 `"unknown"` 键。

函数还有一个优势：**支持多个入参**。部分定义对象的键只能是一个值（虽然可以用数组包装多个值，但不如函数直观）。

## 综合练习

试着定义一个函数，判断输入的 IP 地址是否属于内网地址段（以 `10.`、`172.16.` 或 `192.168.` 开头）：

```bash
rm -f policy/*.rego
cat > policy/exercise.rego << 'EOF'
package func

import rego.v1

is_private(ip) if {
  startswith(ip, "10.")
}

is_private(ip) if {
  startswith(ip, "172.16.")
}

is_private(ip) if {
  startswith(ip, "192.168.")
}

check_private := is_private(input.ip)
check_result := sprintf("IP %v is private: %v", [input.ip, is_private(input.ip)])
EOF
```

```bash
cat > input.json << 'EOF'
{ "ip": "192.168.1.100" }
EOF
opa eval -d policy/ -i input.json 'data.func' --format pretty
```

```bash
cat > input.json << 'EOF'
{ "ip": "8.8.8.8" }
EOF
opa eval -d policy/ -i input.json 'data.func' --format pretty
```

第一个输入是内网地址，`check_private` 为 `true`；第二个是公网地址，`check_private` 不出现在输出中（undefined）。三个同名的 `is_private` 函数分别处理三种内网地址段，实现了逻辑或。
