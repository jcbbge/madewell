// Independent probes execute the maker's actual source in disposable scratch, not a checker-built server.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createInterface } from 'node:readline'
const { result } = JSON.parse(readFileSync(0, 'utf8'))
if (process.argv[2] === 'text') {
 assert.equal(result.value, 'hello')
 process.stdout.write(JSON.stringify({ evidence: 'Compared the produced text with the independent condition: hello.' }))
} else {
 assert.equal(typeof result.source, 'string')
 const dir = mkdtempSync(join(process.cwd(), 'candidate-')), path = join(dir, 'server.mjs')
 writeFileSync(path, result.source)
 const child = spawn(process.execPath, [path], { stdio: ['ignore', 'pipe', 'pipe'] })
 const exited = once(child, 'exit'), lines = createInterface({ input: child.stdout })
 let decisions = ''
 child.stderr.on('data', chunk => { decisions += String(chunk) })
 try {
  const ready = await Promise.race([once(lines, 'line').then(([line]) => JSON.parse(line)), exited.then(() => { throw new Error(`Candidate exited before readiness: ${decisions}`) })])
  const observed: number[] = []
  for (const authorization of ['', 'Bearer fabricated', 'Bearer expired', 'Bearer disposable-fixture']) {
   const response = await fetch(ready.url, { headers: authorization ? { authorization } : {}, signal: AbortSignal.timeout(5_000) })
   observed.push(response.status)
   if (response.status === 200) assert.deepEqual(await response.json(), { value: 'hello' })
  }
  const evidence = `Actual maker-produced /read statuses (absent, fabricated, expired, accepted credential): ${observed.join(',')}; decision log: ${decisions.trim().replaceAll('\n', ',')}.`
  process.stdout.write(JSON.stringify({ evidence }))
  if (JSON.stringify(observed) !== JSON.stringify([401, 401, 401, 200])) process.exitCode = 1
 } finally {
  lines.close(); child.kill('SIGTERM'); await exited
  rmSync(dir, { recursive: true, force: true })
 }
}
