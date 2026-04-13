# 第四步：逻辑非（NOT）—— not 关键字

## 编写逻辑非规则

Rego 使用 `not` 关键字来对条件取反——把失败的条件变成成功，把成功的条件变成失败。

```bash
cd /root/workspace
cat > policy/not.rego << 'EOF'
package main

import rego.v1

# not 可以反转失败的条件
deny contains "用户被封禁" if {
  not input.banned == false
}

# 利用 not 和无效路径引用判断字段缺失
deny contains "缺少 role 字段" if {
  not input.role
}

# not 反转一个成功的条件
deny contains "不应该出现" if {
  not true
}
EOF
```

## 测试：被封禁的用户

```bash
cat > input.json << 'EOF'
{
    "role": "customer",
    "banned": true
}
EOF
```

```bash
conftest test input.json -p policy/
```

由于 `input.banned` 是 `true`，`input.banned == false` 不成立，`not` 取反后成立，所以会看到"用户被封禁"。

## 测试：正常用户

```bash
cat > input.json << 'EOF'
{
    "role": "customer",
    "banned": false
}
EOF
```

```bash
conftest test input.json -p policy/
```

`input.banned == false` 成立，`not` 取反后不成立，所以不会看到"用户被封禁"的信息。

## 测试：缺少 role 字段

```bash
cat > input.json << 'EOF'
{
    "banned": false
}
EOF
```

```bash
conftest test input.json -p policy/
```

由于输入中没有 `role` 字段，`input.role` 是无效路径引用（等同于 `false`），`not` 取反后成立，所以会看到"缺少 role 字段"。

注意 `not true` 永远不成立（`true` 被取反为失败），所以"不应该出现"这条消息永远不会输出。

```bash
rm -f policy/not.rego
```

> 💡 **要点**：`not` 可以反转条件的真假。特别有用的场景是用 `not input.xxx` 来检测输入数据中是否缺少某个字段。
