import { fileURLToPath } from 'node:url'

/** Shipped ordinary skill material; never resolved against a caller's working directory. */
export const brainstormSeedRoot = fileURLToPath(new URL('../brainstorm', import.meta.url))

/** Selection catalog, not a request to load every instruction body. */
export const brainstormMethods: readonly string[] = [
	'brainstorm', 'ambitious-collaboration', 'find-the-unlock', 'right-side-of-the-curve',
	'nonconvergence', 'ablation', 'buoyant', 'challenging-assumptions', 'cognitive-approaches',
	'creative-systems-thinking', 'criticality', 'detecting-blind-spots', 'exploring-possibilities',
	'idea-wizard', 'luck', 'mapping-adjacent-possibilities', 'reframing-problems',
	'synthesizing-insights', 'think-critically', 'thinking-systemically',
]
