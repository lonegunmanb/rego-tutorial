# 第二步：判定属性是否存在

## 用 not 判定路径不存在

假如我们想编写一条规则，在输入数据不包含某个属性时报错。最直觉的写法是：

```bash
cat > policy/check_name.rego << 'EOF'
package main

import rego.v1

deny contains "缺少 name 属性" if {
  not input.name
}
EOF
```

用一个没有 `name` 的输入测试：

```bash
cat > input.json << 'EOF'
{
  "role": "customer"
}
EOF
conftest test input.json -p policy/
```

`input.name` 是无效路径引用（等同于 `false`），`not false` 为 `true`，规则成立。看起来没问题对吧？

## 隐藏的陷阱

但是如果 `name` 存在且值恰好是 `false` 呢？

```bash
cat > input.json << 'EOF'
{
  "name": false,
  "role": "customer"
}
EOF
conftest test input.json -p policy/
```

`input.name` 的值是 `false`，`not false` 还是 `true`——规则成立了！但 `name` 明明存在啊，我们的策略出了问题：无法区分"不存在"和"值为 false"。

## 更稳妥的写法：not x == x

解决方案是使用 `not input.name == input.name` 这个略显怪异的技巧：

```bash
cat > policy/check_name.rego << 'EOF'
package main

import rego.v1

deny contains "缺少 name 属性" if {
  not input.name == input.name
}
EOF
```

先测试 `name` 不存在的情况：

```bash
cat > input.json << 'EOF'
{
  "role": "customer"
}
EOF
conftest test input.json -p policy/
```

规则成立，正确报告缺少 `name`。

再测试 `name` 存在但为 `false` 的情况：

```bash
cat > input.json << 'EOF'
{
  "name": false,
  "role": "customer"
}
EOF
conftest test input.json -p policy/
```

这次检测通过了！因为 `false == false` 的结果是 `true`，`not true` 为 `false`，规则不成立。

原理总结：
- `name` **不存在** → `input.name` 是无效路径引用 → `input.name == input.name` 未定义 → `not` 反转为 `true` → 规则成立 ✅
- `name` **存在**（无论值是什么，包括 `false`） → 自己等于自己一定为 `true` → `not true` 为 `false` → 规则不成立 ✅
