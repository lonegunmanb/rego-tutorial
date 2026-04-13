# 第一步：第一条 Rego 规则

进入工作目录：

```bash
cd /root/workspace
```

## 创建策略文件

Rego 代码通常存放在 `policy/` 目录下。让我们创建第一个 Rego 文件：

```bash
cat > policy/play.rego << 'EOF'
package play

import rego.v1

allow_review := true
EOF
```

来看看这段代码的含义：

- `package play` — 声明这段代码属于 `play` 这个包（命名空间）
- `import rego.v1` — 声明使用 Rego `v1` 语法
- `allow_review := true` — 定义一条规则，`allow_review` 的值为 `true`

## 用 conftest 查看输出

我们可以用 `conftest` 配合一个空的输入文件来查看策略的输出。先创建一个空的 JSON 输入：

```bash
echo '{}' > input.json
```

然后用 `conftest` 查看文档输出：

```bash
conftest doc --combine policy/
```

你应该能看到输出中包含 `allow_review` 为 `true`。

## 理解规则的本质

在 Rego 中，所谓**规则就是全局变量**。上面的代码本质上定义了一个全局变量 `allow_review`，它的值是 `true`。OPA/conftest 运行策略后，会把所有规则的值汇总成一个 JSON 文档输出。

你可以假想这个文档就是一张许可证，上面告诉外部系统：用户是否有权进行某个操作。
