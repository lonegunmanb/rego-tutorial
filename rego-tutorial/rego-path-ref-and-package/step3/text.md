# 第三步：Package 与跨包引用

## Package 声明

Rego 中的策略以包（Package）为逻辑组合单元。处于不同文件甚至不同文件夹，但拥有同名 `package` 的代码在逻辑上处于同一个命名空间，就好像它们的代码被写在同一个文件中那样。

让我们先清理之前的策略文件，然后构建一个多包结构：

```bash
cd /root/workspace
rm -f policy/*.rego
```

创建一个角色判定包：

```bash
cat > policy/role.rego << 'EOF'
package policy.role

import rego.v1

is_customer := true if {
    input.role == "customer"
}

is_admin := true if {
    input.role == "admin"
}
EOF
```

## 跨包引用

现在创建主策略文件，从 `policy.role` 包中引用规则。Rego 提供了两种跨包引用方式：

```bash
cat > policy/main.rego << 'EOF'
package main

import rego.v1
import data.policy.role

# 方式一：完整路径引用
deny contains "非 customer 不允许评论" if {
  not data.policy.role.is_customer
}

# 方式二：简写引用（因为已经 import 了 data.policy.role）
deny contains "非 admin 不允许删除" if {
  not role.is_admin
}
EOF
```

两种方式的区别：
- `data.policy.role.is_customer` — 使用完整路径，`data.` 前缀指示 OPA 从 `policy.role` 包中查找
- `role.is_admin` — 因为头部声明了 `import data.policy.role`，所以 `role` 就是 `data.policy.role` 的简写

## 测试跨包引用

用 `customer` 角色测试：

```bash
cat > input.json << 'EOF'
{
    "role": "customer"
}
EOF
conftest test input.json -p policy/
```

`is_customer` 成立，所以"非 customer 不允许评论"这条规则不会触发；但 `is_admin` 不成立，所以"非 admin 不允许删除"会触发。

换成 `admin` 角色：

```bash
cat > input.json << 'EOF'
{
    "role": "admin"
}
EOF
conftest test input.json -p policy/
```

这次反过来，"不允许评论"触发了，"不允许删除"没有触发。

## 同名包跨文件合并

让我们验证同名 `package` 跨文件合并的行为。在 `policy/role.rego` 旁边再创建一个同包的文件：

```bash
cat > policy/role_extra.rego << 'EOF'
package policy.role

import rego.v1

is_moderator := true if {
    input.role == "moderator"
}
EOF
```

在主策略中引用新规则：

```bash
cat > policy/main.rego << 'EOF'
package main

import rego.v1
import data.policy.role

deny contains "非 customer 不允许评论" if {
  not role.is_customer
}

deny contains "非 admin 不允许删除" if {
  not role.is_admin
}

deny contains "非 moderator 不允许审核" if {
  not role.is_moderator
}
EOF
```

用 `moderator` 角色测试：

```bash
cat > input.json << 'EOF'
{
    "role": "moderator"
}
EOF
conftest test input.json -p policy/
```

虽然 `is_moderator` 定义在 `role_extra.rego` 中，但因为它和 `role.rego` 声明了相同的 `package policy.role`，所以 `role.is_moderator` 可以正常引用——两个文件的代码在逻辑上被合并到了一起。
