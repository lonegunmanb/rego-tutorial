# 第三步：局部变量与作用域

## 局部变量基础

和大多数编程语言一样，Rego 支持在规则内部定义局部变量。局部变量的作用域仅限于声明它的规则内部。

先清理之前的策略文件：

```bash
cd /root/workspace
rm -f policy/*.rego
```

创建一个使用局部变量的策略：

```bash
cat > policy/local_vars.rego << 'EOF'
package main

import rego.v1

# 用局部变量提升可读性
formatted_name := upper(trimmed) if {
  raw_name := "  hello world  "
  trimmed := trim_space(raw_name)
}

# 从字符串中提取端口号
port_number := port if {
  addr := "10.0.0.1:8080"
  parts := split(addr, ":")
  port := to_number(parts[1])
}
EOF
```

查看输出：

```bash
echo '{}' > input.json
conftest doc --combine -p policy/ -i input.json
```

你应该看到 `formatted_name` 为 `"HELLO WORLD"`，`port_number` 为 `8080`。

## 作用域隔离

不同规则中的同名局部变量互不影响。让我们验证这一点：

```bash
cat > policy/scope.rego << 'EOF'
package main

import rego.v1

# 两条规则中都有名为 raw 的局部变量，但彼此不冲突
result1 := upper(processed) if {
  raw := "  foo  "
  processed := trim_space(raw)
}

result2 := lower(processed) if {
  raw := "  BAR  "
  processed := trim_space(raw)
}
EOF
```

查看输出：

```bash
conftest doc --combine -p policy/ -i input.json
```

`result1` 是 `"FOO"`，`result2` 是 `"bar"`——两条规则中的 `raw` 和 `processed` 各自独立，互不干扰。

## 局部变量不可变

Rego 中的变量一旦赋值就不能被更改。让我们验证这个行为：

```bash
cat > policy/immutable.rego << 'EOF'
package main

import rego.v1

deny contains msg if {
  x := 1
  x := 2
  msg := sprintf("x = %d", [x])
}
EOF
```

运行检查：

```bash
conftest test input.json -p policy/
```

你会看到一个编译错误，告诉你变量 `x` 不能被重新赋值。这是因为 Rego 是一门**声明式**语言，变量代表的是一个确定的值，不是一个可以改变的存储位置。

修复方法是使用不同的变量名：

```bash
cat > policy/immutable.rego << 'EOF'
package main

import rego.v1

deny contains msg if {
  x := 1
  y := x + 1
  y > 10
  msg := sprintf("y = %d 太大了", [y])
}
EOF
```

```bash
conftest test input.json -p policy/
```

这次没有错误了（规则不成立，因为 `y` 是 `2`，不大于 `10`）。

## 实战练习：从输入数据提取信息

让我们用局部变量完成一个贴近实际的任务——检查 Terraform 资源的标签：

```bash
cat > policy/tags.rego << 'EOF'
package main

import rego.v1

deny contains msg if {
  some name, resource in input.resource.aws_instance
  tags := resource.tags
  not tags.Environment
  msg := sprintf("实例 '%s' 缺少 Environment 标签", [name])
}

deny contains msg if {
  some name, resource in input.resource.aws_instance
  env := resource.tags.Environment
  valid_envs := {"dev", "staging", "prod"}
  not env in valid_envs
  msg := sprintf("实例 '%s' 的 Environment 标签值 '%s' 无效，允许的值为：dev, staging, prod", [name, env])
}
EOF
```

用一个标签不合规的输入测试：

```bash
cat > input.json << 'EOF'
{
  "resource": {
    "aws_instance": {
      "web": {
        "instance_type": "t3.micro",
        "tags": {
          "Name": "web-server",
          "Environment": "test"
        }
      },
      "db": {
        "instance_type": "t3.small",
        "tags": {
          "Name": "db-server"
        }
      }
    }
  }
}
EOF
conftest test input.json -p policy/
```

你应该看到两条违规：`web` 实例的 Environment 标签值无效（`test` 不在允许列表中），`db` 实例缺少 Environment 标签。
