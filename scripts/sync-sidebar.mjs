#!/usr/bin/env node

/**
 * 自动扫描 docs/ 下的 Markdown 文件，根据 frontmatter 生成侧边栏配置并同步到 config.mjs。
 *
 * Markdown frontmatter 约定：
 *   ---
 *   order: 1            # 侧边栏排序（必填，越小越靠前）
 *   title: 课程介绍      # 侧边栏显示文本（可选，缺省取第一个 # 标题）
 *   sidebar: false       # 设为 false 可从侧边栏隐藏（可选）
 *   group: 分组名         # 可选，相同 group 的章节归入同一侧边栏子分组
 *   group_order: 10      # 可选，分组在侧边栏中的排序
 *   ---
 *
 * 用法：node scripts/sync-sidebar.mjs
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const docsDir = join(__dirname, '..', 'docs')
const configPath = join(docsDir, '.vitepress', 'config.mjs')

// --- Parse frontmatter ---
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const fm = {}
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let val = line.slice(idx + 1).trim()
    // strip quotes
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1)
    }
    if (val === 'true') val = true
    else if (val === 'false') val = false
    else if (/^\d+$/.test(val)) val = Number(val)
    fm[key] = val
  }
  return fm
}

// --- Extract first H1 heading ---
function extractTitle(content) {
  // skip frontmatter
  const body = content.replace(/^---[\s\S]*?---/, '')
  const match = body.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

// --- Scan docs ---
const files = readdirSync(docsDir).filter(f => f.endsWith('.md') && f !== 'index.md')

const items = []
for (const file of files) {
  const content = readFileSync(join(docsDir, file), 'utf-8')
  const fm = parseFrontmatter(content)

  // Skip files explicitly hidden from sidebar
  if (fm.sidebar === false) continue

  const slug = basename(file, '.md')
  const title = fm.title || extractTitle(content) || slug
  const order = typeof fm.order === 'number' ? fm.order : 999
  const group = typeof fm.group === 'string' ? fm.group : null
  const group_order = typeof fm.group_order === 'number' ? fm.group_order : null

  items.push({ text: title, link: `/${slug}`, order, group, group_order })
}

items.sort((a, b) => a.order - b.order)

// --- Build group map and merged entries list ---
// Items with the same `group` value are nested under a sidebar sub-group.
// The group's position is determined by `group_order` (or the first item's order).
const groupMap = new Map()
for (const item of items) {
  if (item.group) {
    if (!groupMap.has(item.group)) {
      groupMap.set(item.group, {
        text: item.group,
        isGroup: true,
        order: item.group_order ?? item.order,
        items: [],
      })
    }
    groupMap.get(item.group).items.push({ text: item.text, link: item.link })
  }
}

const seenGroups = new Set()
const allEntries = []
for (const item of items) {
  if (item.group) {
    if (!seenGroups.has(item.group)) {
      seenGroups.add(item.group)
      allEntries.push(groupMap.get(item.group))
    }
  } else {
    allEntries.push(item)
  }
}
allEntries.sort((a, b) => a.order - b.order)

// --- Generate sidebar block ---
const toSidebarItem = (entry, indent = '          ') => {
  if (entry.isGroup) {
    const subLines = entry.items
      .map(sub => `${indent}    { text: '${sub.text}', link: '${sub.link}' }`)
      .join(',\n')
    return (
      `${indent}{\n` +
      `${indent}  text: '${entry.text}',\n` +
      `${indent}  collapsed: false,\n` +
      `${indent}  items: [\n` +
      `${subLines}\n` +
      `${indent}  ]\n` +
      `${indent}}`
    )
  }
  return `${indent}{ text: '${entry.text}', link: '${entry.link}' }`
}

const sidebarItems = allEntries.map(e => toSidebarItem(e))
const sidebarBlock = `    // @auto-sidebar-start
    sidebar: [
      {
        text: '教程章节',
        items: [
${sidebarItems.join(',\n')}
        ],
      },
    ],
    // @auto-sidebar-end`

// --- Patch config.mjs ---
const configContent = readFileSync(configPath, 'utf-8')

const markerRegex = / {4}\/\/ @auto-sidebar-start[\s\S]*?\/\/ @auto-sidebar-end/
if (!markerRegex.test(configContent)) {
  console.error('❌ 无法在 config.mjs 中找到 // @auto-sidebar-start ... // @auto-sidebar-end 标记')
  process.exit(1)
}

const newConfig = configContent.replace(markerRegex, sidebarBlock)

if (newConfig === configContent) {
  console.log('✅ 侧边栏已是最新，无需更新')
} else {
  writeFileSync(configPath, newConfig, 'utf-8')
  const total = items.length
  const groupCount = groupMap.size
  console.log(`✅ 已同步 ${total} 个章节（${groupCount} 个分组）到侧边栏：`)
  allEntries.forEach((entry, i) => {
    if (entry.isGroup) {
      console.log(`   ${i + 1}. [${entry.text}]`)
      entry.items.forEach(sub => console.log(`        ↳ ${sub.text} → ${sub.link}`))
    } else {
      console.log(`   ${i + 1}. ${entry.text} → ${entry.link}`)
    }
  })
}
