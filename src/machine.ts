// Host observations, never work progress. The engine saves these on its existing trace;
// watch can also sample the viewing host without writing to the delivery store.
import { cpus, freemem, hostname, loadavg, totalmem, uptime } from 'node:os'

export const machineSampler = () => {
	let previous: { idle: number; total: number } | undefined
	return () => {
		try {
			const processors = cpus()
			const current = processors.reduce((sum, cpu) => ({ idle: sum.idle + cpu.times.idle, total: sum.total + Object.values(cpu.times).reduce((a, b) => a + b, 0) }), { idle: 0, total: 0 })
			const elapsed = previous ? current.total - previous.total : 0
			const cpuPercent = previous && elapsed > 0 ? Math.max(0, Math.min(100, 100 * (1 - (current.idle - previous.idle) / elapsed))) : null
			previous = current
			return { host: hostname(), cores: processors.length, cpu: processors[0]?.model ?? 'unknown', cpuPercent, load: loadavg(), memoryTotal: totalmem(), memoryFree: freemem(), uptimeSeconds: uptime(), observerRss: process.memoryUsage().rss }
		} catch { return null }
	}
}
export type Machine = ReturnType<ReturnType<typeof machineSampler>>
