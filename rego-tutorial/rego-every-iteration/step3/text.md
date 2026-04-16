# 第三步：some + every 组合模式

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
echo '{}' > input.json
```

除了使用辅助函数，还可以用 `some` + `every` 的组合来表达相同的逻辑——先用生成表达式筛选子集，再对子集做 `every` 全量检查。

## 先筛选，再检查

```bash
cat > policy/some_every.rego << 'EOF'
package every_demo

import rego.v1

items := {
  {"id": "a-phone", "color": "red", "type": "phone"},
  {"id": "b-phone", "color": "red", "type": "phone"},
  {"id": "a-pad", "color": "red", "type": "tablet"},
  {"id": "b-pad", "color": "blue", "type": "tablet"},
}

# 所有手机都是红色的 —— 成立
output1__every_phone_is_red if {
  phones := {item |
    some item in items
    item.type == "phone"
  }
  every item in phones {
    item.color == "red"
  }
}

# 所有红色商品都是手机 —— 不成立（红色 tablet 存在）
output2__every_red_item_is_phone if {
  red_items := {item |
    some item in items
    item.color == "red"
  }
  every item in red_items {
    item.type == "phone"
  }
}

# 所有蓝色商品都是 tablet —— 成立
output3__every_blue_item_is_tablet if {
  blue_items := {item |
    some item in items
    item.color == "blue"
  }
  every item in blue_items {
    item.type == "tablet"
  }
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.every_demo' --format pretty
```

输出与上一步完全一致：
- `output1__every_phone_is_red` 为 `true`
- `output2__every_red_item_is_phone` 不出现
- `output3__every_blue_item_is_tablet` 为 `true`

这种"先筛选、再检查"的思路往往比辅助函数更直观——逻辑更容易读懂。

## 两种方式的对比

| 方式 | 适用场景 | 特点 |
|------|---------|------|
| 辅助函数 | 逻辑或条件复杂、需要多处复用 | 抽象程度高，可复用 |
| some + every | 逻辑简单、一次性使用 | 直观易读，无需额外函数 |

## 综合练习：Kubernetes Pod 安全策略

试着用 `every` 写一个策略：确保 Pod 中的所有容器都不以 root 用户运行，且都设置了内存限制：

```bash
rm -f policy/*.rego
cat > policy/exercise.rego << 'EOF'
package every_demo

import rego.v1

# 所有容器都不能以 root 运行
no_root_containers if {
  every container in input.spec.containers {
    container.securityContext.runAsNonRoot == true
  }
}

# 所有容器都必须设置内存限制
all_have_memory_limit if {
  every container in input.spec.containers {
    container.resources.limits.memory
  }
}

# 两个条件都满足时才允许部署
allow if {
  no_root_containers
  all_have_memory_limit
}

# 生成违规消息
violations contains msg if {
  some container in input.spec.containers
  not container.securityContext.runAsNonRoot
  msg := sprintf("容器 '%v' 未设置 runAsNonRoot", [container.name])
}

violations contains msg if {
  some container in input.spec.containers
  not container.resources.limits.memory
  msg := sprintf("容器 '%v' 未设置内存限制", [container.name])
}
EOF
```

先试一个合规的 Pod：

```bash
cat > input.json << 'EOF'
{
  "spec": {
    "containers": [
      {
        "name": "app",
        "securityContext": { "runAsNonRoot": true },
        "resources": { "limits": { "memory": "128Mi" } }
      },
      {
        "name": "sidecar",
        "securityContext": { "runAsNonRoot": true },
        "resources": { "limits": { "memory": "64Mi" } }
      }
    ]
  }
}
EOF
opa eval -d policy/ -i input.json 'data.every_demo' --format pretty
```

`allow` 为 `true`，`violations` 为空集合。

再试一个不合规的 Pod：

```bash
cat > input.json << 'EOF'
{
  "spec": {
    "containers": [
      {
        "name": "app",
        "securityContext": { "runAsNonRoot": true },
        "resources": { "limits": { "memory": "128Mi" } }
      },
      {
        "name": "debug",
        "securityContext": { "runAsNonRoot": false },
        "resources": { "limits": {} }
      }
    ]
  }
}
EOF
opa eval -d policy/ -i input.json 'data.every_demo' --format pretty
```

`allow` 不出现，`violations` 包含两条违规消息——`debug` 容器既没有设置 `runAsNonRoot`，也没有设置内存限制。

这个练习展示了 `every`（全量检查）和 `some`（逐个收集违规）配合使用的典型模式。
