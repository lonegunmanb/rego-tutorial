# 第四步：反转含迭代规则的陷阱

## 准备工作

```bash
cd /root/workspace
rm -f policy/*.rego
echo '{}' > input.json
```

## "不包含"和"包含不是"的区别

这是初学者最容易犯的逻辑错误之一。先来看正向规则——"数组包含 a"：

```bash
cat > policy/has_a.rego << 'EOF'
package pitfalls

import rego.v1

array1 := ["a", "b"]

# 正向规则：数组包含 "a"
has_a if {
  some item in array1
  item == "a"
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

**has_a** 为 **true**。

## 错误的反转方式

现在我们尝试写反向规则——"数组不包含 a"：

```bash
rm -f policy/*.rego
cat > policy/wrong_negate.rego << 'EOF'
package pitfalls

import rego.v1

array1 := ["a", "b"]

# 错误！这不是"不包含 a"，而是"包含至少一个不是 a 的元素"
does_not_have_a__wrong1 if {
  some item in array1
  item != "a"
}

# 同样错误
does_not_have_a__wrong2 if {
  some i
  array1[i] != "a"
}
EOF
```

```bash
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

两条规则都是 **true**！因为数组里有 **"b"**，**"b" != "a"** 成立。但 **["a", "b"]** 明明包含 **"a"**，"不包含 a"应该是 **false** 才对。

## 用不同数组验证真值表

```bash
rm -f policy/*.rego
cat > policy/truth_table.rego << 'EOF'
package pitfalls

import rego.v1

# 正向规则
has_a if {
  some item in input.arr
  item == "a"
}

# 错误的反向规则
has_non_a if {
  some item in input.arr
  item != "a"
}

# 正确的反向规则（方式一）
not_has_a if {
  not has_a
}

# 正确的反向规则（方式二）
not_has_a_v2 if {
  every item in input.arr {
    item != "a"
  }
}
EOF
```

用 **["a"]** 测试：

```bash
echo '{"arr": ["a"]}' > input.json
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

- **has_a**: **true** ✅
- **has_non_a**: 不出现（只有 **"a"**，没有非 **a** 元素）
- **not_has_a**: 不出现 ✅
- **not_has_a_v2**: 不出现 ✅

用 **["b"]** 测试：

```bash
echo '{"arr": ["b"]}' > input.json
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

- **has_a**: 不出现
- **has_non_a**: **true**
- **not_has_a**: **true** ✅
- **not_has_a_v2**: **true** ✅

用 **["a", "b"]** 测试——关键场景：

```bash
echo '{"arr": ["a", "b"]}' > input.json
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

- **has_a**: **true** ✅
- **has_non_a**: **true**（**这是错误的"不包含 a"实现**）
- **not_has_a**: 不出现 ✅
- **not_has_a_v2**: 不出现 ✅

用空数组 **[]** 测试：

```bash
echo '{"arr": []}' > input.json
opa eval -d policy/ -i input.json 'data.pitfalls' --format pretty
```

- **has_a**: 不出现
- **has_non_a**: 不出现
- **not_has_a**: **true** ✅
- **not_has_a_v2**: **true** ✅（**every** 对空集合返回 **true**）

## 总结真值表

| 规则 | 含义 | **["a"]** | **["b"]** | **["a","b"]** | **[]** |
|------|------|---------|---------|-------------|------|
| **has_a** | 包含 a | ✅ | ❌ | ✅ | ❌ |
| **has_non_a**（错误） | 包含非 a | ❌ | ✅ | ✅ | ❌ |
| **not_has_a** | 不包含 a | ❌ | ✅ | ❌ | ✅ |
| **not_has_a_v2** | 不包含 a | ❌ | ✅ | ❌ | ✅ |

**核心要点**：
- **some item in arr; item != "a"** → "存在一个不是 a 的" ≠ "不包含 a"
- 正确的"不包含 a"要用 **not has_a** 或 **every item { item != "a" }**
- 这是声明式语言中最常见的逻辑陷阱，务必在编写策略时特别留意

```bash
echo '{}' > input.json
```
