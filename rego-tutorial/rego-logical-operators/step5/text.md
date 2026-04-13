# 第五步：综合练习 —— 访问控制策略

现在让我们把与、或、非组合起来，编写一个完整的访问控制策略。

## 需求描述

我们要为一个论坛系统编写发帖权限策略：

- 用户必须已登录（`input.authenticated` 为 `true`）**并且**未被封禁（`input.banned` 不为 `true`）—— **逻辑与 + 逻辑非**
- 允许发帖的角色：`admin` **或** `moderator` **或**（`member` 且注册天数 >= 7）—— **逻辑或**

## 编写策略

```bash
cd /root/workspace
cat > policy/forum.rego << 'EOF'
package main

import rego.v1

default allow_post := false

allow_post := true if {
  input.authenticated == true
  not input.banned == true
  can_post
}

# 逻辑或：admin 可以发帖
can_post := true if {
  input.role == "admin"
}

# 逻辑或：moderator 可以发帖
can_post := true if {
  input.role == "moderator"
}

# 逻辑或：member 注册满 7 天可以发帖（逻辑与：两个条件同时满足）
can_post := true if {
  input.role == "member"
  input.days_since_registration >= 7
}

deny contains "不允许发帖" if {
  not allow_post
}
EOF
```

## 测试场景 1：admin 用户

```bash
cat > input.json << 'EOF'
{
    "authenticated": true,
    "banned": false,
    "role": "admin"
}
EOF
```

```bash
conftest test input.json -p policy/
```

检查通过——admin 已登录且未被封禁，允许发帖。

## 测试场景 2：新注册的 member

```bash
cat > input.json << 'EOF'
{
    "authenticated": true,
    "banned": false,
    "role": "member",
    "days_since_registration": 3
}
EOF
```

```bash
conftest test input.json -p policy/
```

你应该看到"不允许发帖"——虽然已登录且未被封禁，但注册天数不到 7 天。

## 测试场景 3：老 member

```bash
cat > input.json << 'EOF'
{
    "authenticated": true,
    "banned": false,
    "role": "member",
    "days_since_registration": 30
}
EOF
```

```bash
conftest test input.json -p policy/
```

检查通过——已登录、未被封禁、注册满 7 天，允许发帖。

## 测试场景 4：被封禁的 admin

```bash
cat > input.json << 'EOF'
{
    "authenticated": true,
    "banned": true,
    "role": "admin"
}
EOF
```

```bash
conftest test input.json -p policy/
```

你应该看到"不允许发帖"——虽然是 admin，但被封禁了（`not input.banned == true` 不成立）。

## 测试场景 5：未登录的用户

```bash
cat > input.json << 'EOF'
{
    "authenticated": false,
    "role": "admin"
}
EOF
```

```bash
conftest test input.json -p policy/
```

你应该看到"不允许发帖"——未登录（`input.authenticated == true` 不成立），即使是 admin 也不允许发帖。

> 💡 **总结**：通过这个综合练习，我们看到了 Rego 三种逻辑运算的配合使用——规则体内的多个条件构成**逻辑与**，同名规则构成**逻辑或**，`not` 关键字实现**逻辑非**。
