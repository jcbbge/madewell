// Local release only: the product has no remote or production connection.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const expected = process.env.MW_COMMIT
const current = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
if (!expected || current !== expected) throw new Error('The sandbox release must match the exact accepted commit.')
const releases = join(dirname(process.cwd()), 'releases')
mkdirSync(releases, { recursive: true })
const target = mkdtempSync(join(releases, `${current.slice(0, 12)}-`))
const archive = execFileSync('git', ['archive', current])
execFileSync('tar', ['-x', '-C', target], { input: archive })
// Check the actual exported release, rather than simply recording that a copy was requested.
const released = execFileSync(process.execPath, ['--input-type=module', '-e', "const m=await import('./src/example.ts');if(m.identity(7)!==7)process.exit(1)"], { cwd: target, encoding: 'utf8' })
writeFileSync(join(target, 'release.json'), JSON.stringify({ commit: current, localOnly: true, checked: 'released identity module executes', output: released }, null, 2))
process.stdout.write(JSON.stringify({ release: target, commit: current, localOnly: true, smoke: 'passed' }))
