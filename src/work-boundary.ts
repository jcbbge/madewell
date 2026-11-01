// Shared invalidation boundaries for accepted work and its organ receipts.
import { laneOf, stepOf, type Pack } from './lane.ts'
import type { Event } from './store.ts'
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
export const invalidatedAt = (events: readonly Event[], job: string): number => Math.max(0, ...events.filter(e => {
	if (e.kind === 'cartridges-applied') {
		const before = e.data.from as Pack | undefined, after = e.data.to as Pack | undefined
		return !!before && !!after && !equal(stepOf(laneOf(before), job), stepOf(laneOf(after), job))
	}
	if (job === 'verify') return ['main-moved', 'replan', 'rebased', 'ruling'].includes(e.kind)
	if (['plan', 'implement', 'test-plan'].includes(job) && ['replan', 'rebased'].includes(e.kind)) return true
	return e.kind === 'ruling' && (e.data.cause === 'implementation' && ['plan', 'implement', 'test-plan'].includes(job) || e.data.cause === 'test' && job === 'test-plan')
}).map(e => e.seq))
