// Opt-in contract check. It checks references, not the quality of the interpretation.
import { auditJumpDiscovery } from '../../src/jump-pack-audit.ts'

let raw = ''
for await (const chunk of process.stdin) raw += chunk
try {
	const { input, output } = JSON.parse(raw)
	const audit = auditJumpDiscovery(input.received.declare, output)
	console.log(JSON.stringify(audit))
	if (!audit.passed) {
		console.error(audit.issues.join('\n'))
		process.exitCode = 1
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error))
	process.exitCode = 1
}
