# 第一步：无效的路径引用

进入工作目录：

```bash
cd /root/workspace
```

## 理解无效路径引用

在 Rego 中，当你访问一个不存在的路径时，不会报错，而是得到一个"无效路径引用"（undefined），它等同于 `false`，会导致整条规则不成立。

让我们通过实验来验证。先创建一个输入文件：

```bash
cat > input.json << 'EOF'
{
  "items": [
    "a-phone",
    "b-phone"
  ]
}
EOF
```

然后创建策略文件，尝试访问一些不存在的路径：

```bash
cat > policy/path_ref.rego << 'EOF'
package main

import rego.v1

# 尝试访问不存在的属性
deny contains "name 属性不存在但被访问了" if {
  input.name == "Alice"
}

# 尝试访问越界的数组索引
deny contains "items[2] 不存在但被访问了" if {
  input.items[2] == "c-phone"
}

# 访问存在的路径 —— 这条应该成功
deny contains msg if {
  input.items[0] == "a-phone"
  msg := "items[0] 确实是 a-phone"
}
EOF
```

运行检查：

```bash
conftest test input.json -p policy/
```

你会看到只有第三条规则（访问存在的路径 `items[0]`）成功产生了输出。前两条规则因为路径无效，整个条件被视为 `false`，规则静默地不成立——**不会报错，也不会有任何输出**。

## 无效路径引用的"隐含条件"效应

这个行为意味着，每一个路径引用都隐含了一个条件："这个路径必须存在"。让我们用一个更贴近实际的例子来理解：

```bash
cat > policy/tags_check.rego << 'EOF'
package main

import rego.v1

deny contains msg if {
  input.resource.aws_instance[name].instance_type == "t3.2xlarge"
  msg := sprintf("实例 '%s' 使用了过大的实例类型", [name])
}
EOF
```

先用一个包含 `instance_type` 的输入测试：

```bash
cat > input.json << 'EOF'
{
  "resource": {
    "aws_instance": {
      "example": {
        "instance_type": "t3.2xlarge"
      }
    }
  }
}
EOF
conftest test input.json -p policy/
```

策略会报告违规。现在用一个没有 `resource` 字段的空输入来测试：

```bash
echo '{}' > input.json
conftest test input.json -p policy/
```

检查通过了——不是因为配置合规，而是因为路径不存在导致规则不成立。这个行为在编写安全策略时需要格外小心！
