# 第一步：contains 部分定义 Set

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
```

## 完整定义 vs 部分定义

到目前为止，我们声明集合都是用一条赋值语句一次性定义全部成员。部分定义允许每条规则只贡献集合的一部分，OPA 会自动合并所有部分。

```bash
cat > policy/partial_set.rego << 'EOF'
package partial

import rego.v1

# 完整定义（一次性声明全部成员）
complete_set := {"a-phone", "b-phone", "a-pad"}

# 部分定义（逐条添加）
partial_set contains "a-phone"
partial_set contains "b-phone"
partial_set contains "a-pad"
EOF
```

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.partial' --format pretty
```

你会看到 `complete_set` 和 `partial_set` 的内容完全相同——都包含 `"a-phone"`、`"b-phone"` 和 `"a-pad"` 三个元素。

## 部分定义的价值

你可能会问：既然结果一样，为什么要用部分定义？因为在实际策略编写中，集合的不同成员往往来自**不同的逻辑分支**。每条规则关注一种情况，各自独立地向同一个集合中添加元素，这使得策略代码更清晰、更易维护。

让我们看一个更实际的例子——分别检查不同的违规情况，把所有违规原因收集到同一个 `deny` 集合中：

```bash
rm -f policy/*.rego
cat > policy/deny_example.rego << 'EOF'
package partial

import rego.v1

# 第一条规则：检查名称是否为空
deny contains "name must not be empty" if {
  input.name == ""
}

# 第二条规则：检查年龄是否合法
deny contains "age must be positive" if {
  input.age <= 0
}

# 第三条规则：检查角色是否合法
deny contains "role must be admin or user" if {
  not input.role in {"admin", "user"}
}
EOF
```

```bash
cat > input.json << 'EOF'
{ "name": "", "age": -1, "role": "guest" }
EOF
opa eval -d policy/ -i input.json 'data.partial.deny' --format pretty
```

三个条件都满足，所以 `deny` 集合包含三条违规信息。试试修改输入使部分条件不成立：

```bash
cat > input.json << 'EOF'
{ "name": "Alice", "age": 25, "role": "guest" }
EOF
opa eval -d policy/ -i input.json 'data.partial.deny' --format pretty
```

现在只有角色不合法这一条违规信息。这就是部分定义的典型用法——每条规则独立贡献一个可能的违规原因。
