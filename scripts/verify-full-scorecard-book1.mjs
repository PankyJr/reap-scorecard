#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const result = spawnSync(
  path.join(root, 'node_modules/.bin/tsx'),
  [path.join(root, 'scripts/verify-full-scorecard-book1.ts')],
  { stdio: 'inherit', cwd: root },
)
process.exit(result.status ?? 1)
