// The executor and read surfaces share structural permission over saved function work.
import { laneOf } from './lane.ts'
import type { Item, Store } from './store.ts'

export function functionProgress(item: Item, store: Pick<Store['Service'], 'get'>) {
	const flow = item.flow ?? { loop: 'delivery' as const, accepted: [] }
	const steps = laneOf(item.pack)[flow.loop]
	const step = steps[flow.accepted.length]
	const job = step?.job ?? null
	const contract = step?.args?.contract && typeof step.args.contract === 'object' ? step.args.contract as Record<string, unknown> : {}
	const label = typeof contract.label === 'string' ? contract.label : step ? `${step.job}()` : 'Finish the saved flow'
	const required = step ? [typeof contract.purpose === 'string' ? contract.purpose : step.duty || 'Return an output that satisfies this function’s saved contract.', ...(step.check ? ['The configured acceptance check must pass before this output is accepted.'] : [])]
		: ['Every configured function must have its accepted output saved.']
	const result = (allowed: boolean, kind: string, reason: string, problem: string | null = null) => ({
		gate: 'saved-function-contract' as const, allowed, kind, job, label, reason, required, problem,
	})
	const invalid = flow.accepted.findIndex((accepted, index) => accepted !== steps[index]?.job || typeof item.outputs[accepted] !== 'string' || !item.outputs[accepted]!.trim())
	if (invalid >= 0) return result(false, 'repair', `Saved acceptance at position ${invalid + 1} does not match the configured function and its output.`, `Invalid accepted function prefix at position ${invalid + 1}.`)
	if (item.status === 'candidate') return result(false, 'select', 'This proposed task must be selected before delivery can start.')
	if (item.status === 'held') return result(false, 'resume', item.hold?.message ?? 'Resolve the recorded block before retrying this work.')
	if (item.status === 'paused') return result(false, 'resume', item.hold?.message ?? 'Continue this saved checkpoint before work can resume.')
	if (['completed', 'shipped', 'discovered', 'dropped'].includes(item.status)) return result(false, 'done', item.status === 'dropped' ? 'This work was stopped.' : 'This configured flow has ended. Its result evidence remains separately inspectable.')
	const pending = (item.after ?? []).filter((id) => !['completed', 'shipped'].includes(store.get(id)?.status ?? ''))
	if (pending.length) return result(false, 'wait', `Waiting for prerequisite work: ${pending.map((id) => `#${id}`).join(', ')}.`)
	return result(true, step ? 'run' : 'finish', item.rejected ? `Correct this function’s refused return: ${item.rejected}` : step ? 'Earlier configured functions have their outputs saved; this function can proceed.' : 'All configured outputs are saved; the flow can be finalized.')
}
