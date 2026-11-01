// Shared deterministic preparation for scripted workers and trusted CLI command fixtures.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export interface PreparationPacket {
	item: { objective: string; source: string }
	organs?: { rules: { id: string; kind: string; text: string }[]; nextJobs: string[] }
}

export function preparedOutput(packet: PreparationPacket, job: string, output: Record<string, unknown>, files: string[] = []): Record<string, unknown> {
	// Legacy packets remain explicit: only newly pinned work supplies this contract.
	if (!packet.organs) return output
	return { ...output, organPreparation: {
		ground: { intent: packet.item.objective, sources: [
			{ ref: 'source', finding: `The fixture received this raw request: ${packet.item.source}` },
			...files.map(path => ({ ref: `file:${path}`, finding: `The fixture inspected ${path}: ${readFileSync(path, 'utf8')}` })),
		] },
		rumen: packet.organs.rules.map(rule => ({ rule: rule.id, disposition: 'addressed', evidence: rule.kind === 'fence'
			? 'Carry this fence to engine-owned verification; the fixture does not claim a gate pass.'
			: `Carry the supplied rule through this phase: ${rule.text}` })),
		next: packet.organs.nextJobs.map(consumer => ({ job: consumer, brief: `${job} prepared ${consumer} to use its recorded result for ${packet.item.objective}.`, requires: [`output:${job}`] })),
	} }
}

// Trusted function commands receive the same packet on stdin, without a worker-result wrapper.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const packet = JSON.parse(readFileSync(0, 'utf8')) as PreparationPacket
	process.stdout.write(JSON.stringify(preparedOutput(packet, process.argv[2]!, JSON.parse(process.argv[3]!))))
}
