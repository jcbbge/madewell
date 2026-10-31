// Browser-authorized work shares the foreground server's lifetime and the existing queue.
import { Effect, Result } from 'effect'
import type { Prescriptions } from '../../src/cards.ts'
import { nextFor, runQueue } from '../../src/engine.ts'
import { Store } from '../../src/store.ts'
import { serve } from '../../src/ui.ts'

const WAKE = 'demo-foreground-wake'

export const serveForeground = (prescriptions: Prescriptions, host: string, port: number) => Effect.gen(function* () {
	const store = yield* Store
	const roots = new Set(store.list().filter((item) => store.events(item.id).some((event) => event.kind === WAKE)).map((item) => item.id))
	const wake = async (received: Store['Service'], id: number) => {
		// An engine-created prerequisite is driven by its owner; a discovery child remains an explicit task.
		const seen = new Set<number>()
		let root = received.get(id)!
		while (root.parent !== undefined && !seen.has(root.id)) {
			seen.add(root.id)
			const parent = received.get(root.parent)
			if (!parent) break
			root = parent
		}
		received.note(root.id, WAKE, { item: id, authority: 'operator-input', lifetime: 'foreground-server' })
		roots.add(root.id)
	}
	const queue = Effect.gen(function* () {
		let waitingOwner: number | null = null
		for (;;) {
			const outcome = yield* Effect.result(runQueue({ prescriptions }, { watch: true, roots: () => [...roots] }))
			if (Result.isSuccess(outcome)) return outcome.success
			const problem = outcome.failure
			if (problem.code !== 'store_locked') return yield* problem
			const owner = store.runner()
			if (owner?.pid !== waitingOwner) {
				waitingOwner = owner?.pid ?? null
				process.stderr.write(JSON.stringify({ code: problem.code, message: 'Foreground work is saved and waiting for the current runner to release this store.', context: problem.context, selectedRoots: [...roots] }) + '\n')
			}
			yield* Effect.sleep(2000)
		}
	})
	yield* Effect.all([queue, serve(store.path, nextFor, host, port, undefined, wake)], { concurrency: 2 })
}).pipe(Effect.scoped)
