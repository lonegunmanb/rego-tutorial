# 第一步：第一条 Rego 规则

进入工作目录：

```bash
cd /root/workspace
```

## 创建策略文件

Rego 代码通常存放在 `policy/` 目录下。让我们创建第一个 Rego 文件：

```bash
cat > policy/play.rego << 'EOF'
package main

import rego.v1

warn contains msg if {
  msg := "allow_review 的值为 true"
  allow_review
}

allow_review := true
EOF
```

来看看这段代码的含义：

- `package main` — 声明这段代码属于 `main` 这个包（conftest 默认检查的命名空间）
- `import rego.v1` — 声明使用 Rego `v1` 语法
- `allow_review := true` — 定义一条规则，`allow_review` 的值为 `true`
- `warn contains msg if` — 这是 conftest 使用的输出机制，当条件成立时输出一条警告信息

> 💡 conftest 只会显示 `deny`（失败）、`warn`（警告）和 `violation`（违规）类型的消息。为了在实验中看到规则的效果，我们暂时用 `warn` 来输出信息。`warn contains msg if` 的详细语法将在后续章节"部分定义"中介绍，这里先照着写就好。

## 用 conftest 查看输出

先创建一个空的 JSON 输入：

```bash
echo '{}' > input.json
```

然后用 `conftest` 运行策略检查：

```bash
conftest test input.json -p policy/
```

你应该能看到一条警告信息，说明 `allow_review` 的值为 `true`——这意味着我们的规则被成功执行了。

## 理解规则的本质

在 Rego 中，所谓**规则就是全局变量**。上面的代码本质上定义了一个全局变量 `allow_review`，它的值是 `true`。OPA/conftest 运行策略后，会把所有规则的值汇总成一个文档，然后检查其中的 `deny`/`warn`/`violation` 规则来决定输出结果。

你可以假想这个文档就是一张许可证，上面告诉外部系统：用户是否有权进行某个操作。
