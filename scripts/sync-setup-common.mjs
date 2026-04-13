#!/usr/bin/env node

/**
 * Copies scripts/setup-common.sh into every
 * rego-tutorial scenario's assets/ directory.
 *
 * This ensures each scenario has an identical copy of the shared setup functions.
 * The source of truth is scripts/setup-common.sh — never edit the copies in assets/.
 *
 * Usage: node scripts/sync-setup-common.mjs
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '..')
const srcFile = join(root, 'scripts', 'setup-common.sh')
const killercodaDir = join(root, 'rego-tutorial')

const source = readFileSync(srcFile, 'utf-8')

const scenarios = readdirSync(killercodaDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)

let updated = 0
for (const scenario of scenarios) {
  const assetsDir = join(killercodaDir, scenario, 'assets')
  if (!existsSync(assetsDir)) {
    mkdirSync(assetsDir, { recursive: true })
  }
  const dest = join(assetsDir, 'setup-common.sh')
  const existing = existsSync(dest) ? readFileSync(dest, 'utf-8') : null
  if (existing !== source) {
    writeFileSync(dest, source)
    console.log(`  ✔ ${scenario}/assets/setup-common.sh`)
    updated++
  }
}

if (updated === 0) {
  console.log('  ✔ All setup-common.sh copies are up to date.')
} else {
  console.log(`  → Updated ${updated} scenario(s).`)
}
