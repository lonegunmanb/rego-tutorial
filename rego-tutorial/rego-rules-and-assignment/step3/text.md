# 第三步：用 conftest 执行策略检查

前面我们已经接触了 conftest 的基本用法，现在让我们来写一个更贴近真实场景的策略：检查 Terraform 配置是否合规。

## 编写一个 deny 策略

在实际使用中，conftest 默认检查的规则名是 `deny`。当 `deny` 集合中包含元素时，conftest 会报告检查失败并输出对应的错误信息。

先创建一个模拟的 Terraform 配置文件：

```bash
cat > main.tf << 'EOF'
resource "aws_instance" "example" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.2xlarge"

  tags = {
    Name = "example"
  }
}
EOF
```

然后编写一条策略，禁止使用过大的实例类型：

```bash
cat > policy/deny.rego << 'EOF'
package main

import rego.v1

deny contains msg if {
  input.resource.aws_instance[name].instance_type == "t3.2xlarge"
  msg := sprintf("实例 '%s' 使用了过大的实例类型 t3.2xlarge，请使用 t3.medium 或更小的类型", [name])
}
EOF
```

> 💡 这里的 `deny contains msg if` 是 Rego `v1` 的语法，表示向 `deny` 集合中添加一条错误信息。我们将在后续的"部分定义"章节中详细介绍这种语法。

运行 conftest 检查：

```bash
conftest test main.tf -p policy/
```

你应该看到类似这样的输出：

```text
FAIL - main.tf - main - 实例 'example' 使用了过大的实例类型 t3.2xlarge，请使用 t3.medium 或更小的类型
```

## 修复配置

现在修改 Terraform 配置，把实例类型改成 `t3.medium`：

```bash
cat > main.tf << 'EOF'
resource "aws_instance" "example" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"

  tags = {
    Name = "example"
  }
}
EOF
```

再次运行检查：

```bash
conftest test main.tf -p policy/
```

这次应该会看到检查通过的输出。

## 添加 default 规则

让我们再添加一条策略，确保所有实例都定义了 `tags`，并使用 `default` 提供明确的输出：

```bash
cat > policy/tags.rego << 'EOF'
package main

import rego.v1

default has_tags := false

has_tags := true if {
  count(input.resource.aws_instance[_].tags) > 0
}
EOF
```

运行检查：

```bash
conftest test main.tf -p policy/ --all-namespaces
```

你可以尝试删除 `main.tf` 中的 `tags` 块，再运行一次看看 `has_tags` 的变化。
