# 第二步：[] 部分定义 Object 与 v0 语法对比

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
```

## 部分定义 Object

除了集合（Set），部分定义也可以用于对象（Object）。使用 `[key] := value` 语法逐步构建对象：

```bash
cat > policy/partial_obj.rego << 'EOF'
package partial

import rego.v1

# 完整定义
complete_obj := {
  "x-1": "a-phone",
  "x-2": "b-phone",
  "y-1": "a-pad"
}

# 部分定义（逐条添加键值对）
partial_obj["x-1"] := "a-phone"
partial_obj["x-2"] := "b-phone"
partial_obj["y-1"] := "a-pad"
EOF
```

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.partial' --format pretty
```

`complete_obj` 和 `partial_obj` 的内容完全一致。

## v0 语法 `deny[msg]` 的真相

在很多开源项目和早期教程中，你经常会看到这样的写法：

```rego
# ⚠️ 这是 Rego v0 语法，在 v1 中已废弃
deny[msg] {
    resource := input.resources[_]
    resource.type == "aws_s3_bucket"
    not resource.encryption
    msg = sprintf("S3 bucket '%s' must enable encryption", [resource.name])
}
```

初学者很容易把 `deny[msg]` 理解为"一个叫 `deny` 的函数接收参数 `msg`"。但实际上，这是**部分定义集合**在 v0 时代的语法。

让我们用一个可运行的例子来对比 v0 和 v1 语法：

```bash
rm -f policy/*.rego
cat > policy/v0_vs_v1.rego << 'EOF'
package partial

import rego.v1

# v1 语法：使用 contains ... if
v1_set contains "a-phone"
v1_set contains "b-phone"
v1_set contains "a-pad"

# 同样的逻辑，使用 [] 语法也可以（这在 v1 中仍然合法，但仅用于 Object）
# 注意：v0 中 output["value"] 表示集合成员，v1 中则表示对象键值对
EOF
```

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.partial' --format pretty
```

**要点总结**：
- **deny[msg] { ... }** 是 v0 中部分定义集合的语法
- 在 v1 中应写为 **deny contains msg if { ... }**
- **[]** 语法在 v1 中专门用于部分定义**对象**（**obj[key] := value**）
- 编写新策略时，请始终使用 v1 语法
