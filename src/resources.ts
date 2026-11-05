// Admission follows current host capacity, never a count of workers.
import { readFileSync, statfsSync } from 'node:fs'
import { availableParallelism, freemem, loadavg, totalmem } from 'node:os'

export interface ResourceAdmission {
	readonly allowed: boolean
	readonly reason?: 'memory' | 'cpu' | 'disk' | 'unavailable'
	readonly availableMemoryBytes?: number
	readonly requiredMemoryBytes?: number
	readonly availableDiskBytes?: number
	readonly cpuPressure?: number
	readonly loadPerCpu?: number
}

/** Keep host headroom; sample again before every new item, including after a wait. */
export function resourceAdmission(directory: string): ResourceAdmission {
	if (process.env.MW_WORKER === '1') return { allowed: true }
	try {
		let memory = freemem()
		try {
			const available = readFileSync('/proc/meminfo', 'utf8').match(/^MemAvailable:\s+(\d+)/m)
			if (available) memory = Number(available[1]) * 1024
		} catch { /* Non-Linux hosts use the OS free-memory reading. */ }
		// A parent cgroup can run out before the host does.
		try {
			const limit = Number(readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim())
			const used = Number(readFileSync('/sys/fs/cgroup/memory.current', 'utf8').trim())
			if (Number.isFinite(limit) && Number.isFinite(used)) memory = Math.min(memory, Math.max(0, limit - used))
		} catch { /* A host without this cgroup still has the OS measurement. */ }
		const disk = statfsSync(directory)
		const availableDiskBytes = disk.bavail * disk.bsize
		let cpuPressure: number | undefined
		try {
			const pressure = readFileSync('/proc/pressure/cpu', 'utf8').match(/^some avg10=([\d.]+)/m)
			if (pressure) cpuPressure = Number(pressure[1])
		} catch { /* Hosts without PSI use load relative to available CPUs. */ }
		const loadPerCpu = loadavg()[0] / availableParallelism()
		const requiredMemoryBytes = Math.max(totalmem() * 0.1, 512 * 1024 ** 2)
		const observed = { availableMemoryBytes: memory, requiredMemoryBytes, availableDiskBytes, cpuPressure, loadPerCpu }
		if (memory < requiredMemoryBytes) return { allowed: false, reason: 'memory', ...observed }
		if (availableDiskBytes < 20 * 1024 ** 3) return { allowed: false, reason: 'disk', ...observed }
		if (cpuPressure !== undefined ? cpuPressure >= 50 : loadPerCpu >= 1) return { allowed: false, reason: 'cpu', ...observed }
		return { allowed: true, ...observed }
	} catch { return { allowed: false, reason: 'unavailable' } }
}
