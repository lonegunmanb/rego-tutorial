# 第四步：复杂表达式与数组限制

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
```

## 部分定义中的复杂表达式

部分定义中使用的值可以是任意 Rego 表达式——函数调用结果、内嵌对象、其他规则的值等：

```bash
cat > policy/complex.rego << 'EOF'
package partial

import rego.v1

base_set := {"a-phone", "b-phone"}
catalog := {"x-1": "a-phone", "x-2": "b-phone"}

# 集合成员可以是复杂表达式
complex_set contains abs(-100 * 2 + 3)             # 函数调用结果：197
complex_set contains {"key": 100}                    # 内嵌对象
complex_set contains base_set                        # 其他规则的值
complex_set contains [base_set, catalog]             # 数组（包含其他规则的值）

# 对象的键和值也可以是复杂表达式
complex_obj[abs(-100 * 2 + 3)] := base_set
complex_obj[[base_set, catalog]] := {"key": 100}
EOF
```

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.partial' --format pretty
```

观察输出——集合和对象中可以包含各种类型的嵌套结构。

## 不支持部分定义数组

Rego **不支持**通过部分定义来定义数组。尝试一下：

```bash
rm -f policy/*.rego
cat > policy/array_fail.rego << 'EOF'
package partial

import rego.v1

# ❌ 尝试部分定义数组——这会报错
my_array contains "hello"
my_array contains "world"
EOF
```

等等，上面的代码实际上会创建一个**集合**（Set），而不是数组（Array）。`contains` 语法只能用于集合。

如果你需要构建数组，请使用 Array 生成表达式：

```bash
rm -f policy/*.rego
cat > policy/use_comprehension.rego << 'EOF'
package partial

import rego.v1

items := ["a-phone", "b-phone", "a-pad"]

# ✅ 使用 Array 生成表达式构建数组
phone_array := [item | some item in items; endswith(item, "-phone")]
EOF
```

```bash
echo '{}' > input.json
opa eval -d policy/ -i input.json 'data.partial' --format pretty
```

## 部分定义 vs 生成表达式

到这里，你可能会问：批量部分定义和生成表达式看起来很像，什么时候用哪个？

| 特性 | 部分定义 | 生成表达式 |
|------|---------|-----------|
| 多条规则贡献同一集合 | ✅ 每条规则独立贡献 | ❌ 只能在一条表达式中 |
| 支持的类型 | Set、Object | Set、Array、Object |
| 条件不满足时 | 空集合/空对象（非 undefined） | 空集合/空数组/空对象（非 undefined） |
| 典型场景 | conftest deny 规则、多条件汇聚 | 数据变换、筛选 |

简单来说：当你需要**多条独立的规则**向同一个集合汇聚结果时，用部分定义；当你只需要在**一条规则内**从已有集合中筛选或变换时，用生成表达式。
