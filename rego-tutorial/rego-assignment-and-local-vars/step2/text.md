# 第二步：隐式 true 与条件赋值

## 隐式 true

在 Rego 中，如果一个规则没有显式地使用 `:=` 赋值，但规则条件成立，那么它会被隐式赋予 `true`。

让我们先清理之前的策略文件：

```bash
cd /root/workspace
rm -f policy/*.rego
```

创建新的策略来对比显式和隐式赋值：

```bash
cat > policy/implicit.rego << 'EOF'
package main

import rego.v1

# 显式赋值 true —— 冗余但清晰
is_valid_explicit := true if {
  input.score >= 60
}

# 隐式赋值 true —— 简洁写法，效果完全一样
is_valid_implicit if {
  input.score >= 60
}

# 显式赋值非布尔值 —— 这时必须用 :=
grade := "A" if {
  input.score >= 90
}

grade := "B" if {
  input.score >= 60
  input.score < 90
}
EOF
```

测试高分输入：

```bash
cat > input.json << 'EOF'
{
  "score": 95
}
EOF
opa eval -d policy/ -i input.json 'data.main' --format pretty
```

你会看到 `is_valid_explicit` 和 `is_valid_implicit` 都是 `true`，`grade` 是 `"A"`。

测试中等分数：

```bash
cat > input.json << 'EOF'
{
  "score": 75
}
EOF
opa eval -d policy/ -i input.json 'data.main' --format pretty
```

现在 `grade` 变成了 `"B"`。

## 条件赋值非布尔值

条件赋值不仅限于布尔值，可以赋予任意类型。这在实际策略中非常常用：

```bash
cat > policy/level.rego << 'EOF'
package main

import rego.v1

# 根据不同条件赋予不同类型的值
access_level := "admin" if {
  input.role == "admin"
}

access_level := "readonly" if {
  input.role == "viewer"
}

# 赋予数组
allowed_actions := ["read", "write", "delete"] if {
  input.role == "admin"
}

allowed_actions := ["read"] if {
  input.role == "viewer"
}
EOF
```

用 `admin` 角色测试：

```bash
cat > input.json << 'EOF'
{
  "role": "admin",
  "score": 95
}
EOF
opa eval -d policy/ -i input.json 'data.main' --format pretty
```

换成 `viewer` 角色：

```bash
cat > input.json << 'EOF'
{
  "role": "viewer",
  "score": 75
}
EOF
opa eval -d policy/ -i input.json 'data.main' --format pretty
```

> 💡 回忆一下第二章学过的内容——同名规则实现逻辑或。这里的 `access_level` 和 `allowed_actions` 各有两条同名规则，但由于 `admin` 和 `viewer` 的条件互斥，同一时刻只会有一条成立，不会触发 `eval_conflict_error`。
