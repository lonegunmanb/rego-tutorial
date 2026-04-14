# 第二步：常用内建函数（下）：字符串、类型转换、glob、sprintf

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
```

## 字符串函数

Rego 提供了丰富的字符串操作函数：

```bash
cat > policy/string.rego << 'EOF'
package func

import rego.v1

check_string if {
  # 拼接与分割
  concat("--", ["a", "b"]) == "a--b"
  split("a--b", "--") == ["a", "b"]

  # 包含判断
  contains("abcdefg", "bc") == true
  startswith("abcdefg", "abc") == true
  endswith("abcdefg", "efg") == true

  # 大小写转换
  upper("abcdefg") == "ABCDEFG"
  lower("ABCDEFG") == "abcdefg"
}
EOF
```

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.func.check_string' --format pretty
```

## 类型转换

`to_number` 可以将字符串、布尔值转为数值：

```bash
rm -f policy/*.rego
cat > policy/conversion.rego << 'EOF'
package func

import rego.v1

check_conversion if {
  to_number("10") == 10
  to_number(10) == 10
  to_number(true) == 1
  to_number(false) == 0
}

# 转换失败时返回 undefined，而非报错
bad_convert := to_number("not-a-number")
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.func' --format pretty
```

注意 `bad_convert` 不会出现在输出中——因为 `to_number("not-a-number")` 返回 undefined，而不是抛出错误。**这是 Rego 函数的通用行为：出错时返回 undefined。**

## 通配符匹配（glob）

`glob.match` 用于模式匹配，第二个参数指定分隔符：

```bash
rm -f policy/*.rego
cat > policy/glob.rego << 'EOF'
package func

import rego.v1

check_glob if {
  # 匹配 IPv4:port 格式（分隔符为 . 和 :）
  glob.match("*.*.*.*:*", [".", ":"], "10.0.0.1:80") == true

  # 少了一个点分段，匹配失败
  glob.match("*.*.*.*:*", [".", ":"], "0.0.1:80") == false

  # 额外的冒号导致匹配失败（: 是分隔符）
  glob.match("*.*.*.*:*", [".", ":"], "10.0.0.1:8:0") == false

  # 如果不把 : 作为分隔符，则额外的冒号不会导致失败
  glob.match("*.*.*.*:*", ["."], "10.0.0.1:8:0") == true
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.func.check_glob' --format pretty
```

`glob.match` 的关键在于**分隔符参数**——它决定了 `*` 不能跨越哪些字符。

## 字符串插值（sprintf）

`sprintf` 的用法类似 Go 的 `fmt.Sprintf`，使用 `%v` 作为占位符：

```bash
rm -f policy/*.rego
cat > policy/sprintf.rego << 'EOF'
package func

import rego.v1

# 基本用法
msg1 := sprintf("%v", [10])                          # "10"
msg2 := sprintf("%v-%v-%v", [10, 20, 30])            # "10-20-30"

# 指定参数位置（从 1 开始）
msg3 := sprintf("%[3]v-%[3]v-%[1]v", [10, 20, 30])  # "30-30-10"

# 实际场景：生成错误消息
deny_msg := sprintf("Resource '%v' of type '%v' is missing tag '%v'",
  ["my-bucket", "aws_s3_bucket", "Environment"])
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.func' --format pretty
```

`sprintf` 是编写策略错误消息时最常用的函数。`%v` 可以格式化任意类型的值，`%[n]v` 可以指定使用第 n 个参数（从 1 开始计数）。
