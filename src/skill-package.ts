import { createHash } from 'node:crypto'
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, readdirSync } from 'node:fs'
import { basename, isAbsolute, relative, resolve, sep } from 'node:path'
import { parseDocument } from 'yaml'
import { MadeWellError, quote } from './errors.ts'

export interface SkillPackage {
	readonly origin: string
	readonly name: string
	/** Omitted for ordinary complete packages; shipped runtime pins exclude evals. */
	readonly scope?: 'runtime'
	readonly frontmatter: Readonly<Record<string, unknown>>
	/** The complete original SKILL.md, including frontmatter and original line endings. */
	readonly instructions: string
	readonly manifest: ReadonlyArray<{ readonly path: string; readonly bytes: number; readonly sha256: string }>
	readonly identity: string
}

type PortableCode = 'portable_invalid' | 'portable_unreadable' | 'portable_stale'
type Entry = SkillPackage['manifest'][number]
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
const identityOf = (origin: string, manifest: ReadonlyArray<Entry>) => hash(JSON.stringify({
	origin, manifest: manifest.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })),
}))

function refuse(code: PortableCode, reason: string, context: Record<string, unknown>): never {
	throw new MadeWellError({
		code, message: reason, context: { ...context, reason },
		next: [{ run: 'mw', why: 'Inspect the read-only command reference; explicitly select the corrected package again rather than reusing a stale identity.' }],
	})
}

function boundary<T>(context: Record<string, unknown>, action: () => T): T {
	try { return action() }
	catch (cause) {
		if (cause instanceof MadeWellError) throw new MadeWellError({
			code: cause.code as PortableCode, message: cause.message,
			context: { ...context, ...cause.context },
			...(cause.cause ? { cause: cause.cause } : {}), next: cause.next,
		})
		const ioCode = typeof cause === 'object' && cause !== null && 'code' in cause ? String(cause.code) : undefined
		return refuse(ioCode === 'ELOOP' || ioCode === 'ENOTDIR' ? 'portable_invalid' : 'portable_unreadable',
			'Could not safely read the explicitly granted local material.', {
				...context, ...(ioCode ? { ioCode } : {}), detail: cause instanceof Error ? cause.message : String(cause),
			})
	}
}

function localPath(path: string, label: string): void {
	if (typeof path !== 'string' || !path || path.includes('\0') || path.includes('\\') || path.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(path)) {
		refuse('portable_invalid', 'Only explicit local filesystem paths are supported.', { path, label })
	}
}

function resourcePath(path: string): void {
	localPath(path, 'package resource')
	if (isAbsolute(path) || path.split('/').some(part => !part || part === '.' || part === '..')) {
		refuse('portable_invalid', 'Package resource paths must be normalized relative paths without traversal.', { path })
	}
}

function absolutePath(path: string, label: string): string {
	localPath(path, label)
	if (!isAbsolute(path) || path.split('/').includes('..') || path.split('/').includes('.')) {
		refuse('portable_invalid', 'The granted path must be absolute and contain no dot segments.', { path, label })
	}
	return resolve(path)
}

function within(root: string, path: string): string {
	const suffix = relative(root, path)
	if (suffix === '..' || suffix.startsWith(`..${sep}`) || isAbsolute(suffix)) {
		refuse('portable_invalid', 'The requested path is outside the explicitly granted root.', { root, path })
	}
	return suffix
}

/* Node has no openat API. Descriptor-relative paths keep every parent pinned while
 * O_NOFOLLOW refuses symlinks, including during replacement races. Fail closed on
 * hosts without this facility rather than falling back to check-then-open paths. */
function childPath(fd: number, child: string): string {
	const base = process.platform === 'linux' ? '/proc/self/fd' : process.platform === 'darwin' ? '/dev/fd' : undefined
	if (!base || !constants.O_NOFOLLOW || !constants.O_DIRECTORY) {
		refuse('portable_unreadable', 'This host does not support descriptor-anchored local package reads.', { platform: process.platform })
	}
	return `${base}/${fd}/${child}`
}

function directoryAt<T>(fd: number, parts: ReadonlyArray<string>, action: (directory: number) => T): T {
	let current = fd
	try {
		for (const part of parts) {
			const next = openSync(childPath(current, part), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW)
			const previous = current
			current = next
			if (previous !== fd) closeSync(previous)
		}
		return action(current)
	} finally { if (current !== fd) closeSync(current) }
}

function withRoot<T>(root: string, action: (directory: number, canonical: string) => T): T {
	const canonical = absolutePath(root, 'root')
	const fd = openSync('/', constants.O_RDONLY | constants.O_DIRECTORY)
	try { return directoryAt(fd, canonical.split('/').filter(Boolean), directory => action(directory, canonical)) }
	finally { closeSync(fd) }
}

function readAt(directory: number, path: string): Buffer {
	resourcePath(path)
	const parts = path.split('/')
	return directoryAt(directory, parts.slice(0, -1), parent => {
		const target = childPath(parent, parts.at(-1)!)
		if (!lstatSync(target).isFile()) refuse('portable_invalid', 'Only regular files may be read; symlinks and special files are refused.', { path })
		// NONBLOCK prevents a substituted FIFO from hanging before the regular-file check.
		const fd = openSync(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
		try {
			const before = fstatSync(fd, { bigint: true })
			if (!before.isFile()) refuse('portable_invalid', 'Only regular files may be read.', { path })
			const bytes = readFileSync(fd)
			const after = fstatSync(fd, { bigint: true })
			if (before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs || BigInt(bytes.length) !== after.size) {
				refuse('portable_stale', 'The file changed while it was being read.', { path })
			}
			return bytes
		} finally { closeSync(fd) }
	})
}

function manifestAt(directory: number, scope?: 'runtime'): { manifest: Entry[]; instructions: Buffer } {
	const manifest: Entry[] = []
	let instructions: Buffer | undefined
	const pending = ['']
	while (pending.length) {
		const prefix = pending.pop()!
		directoryAt(directory, prefix ? prefix.split('/') : [], parent => {
			for (const entry of readdirSync(childPath(parent, '.'), { withFileTypes: true })) {
				if (scope === 'runtime' && !prefix && !['SKILL.md', 'references', 'assets'].includes(entry.name)) continue
				const path = prefix ? `${prefix}/${entry.name}` : entry.name
				resourcePath(path)
				if (entry.isDirectory()) pending.push(path)
				else if (entry.isFile()) {
					const bytes = readAt(directory, path)
					manifest.push({ path, bytes: bytes.length, sha256: hash(bytes) })
					if (path === 'SKILL.md') instructions = bytes
				} else refuse('portable_invalid', 'Packages may contain only directories and regular files, never symlinks or special files.', { path })
			}
		})
	}
	if (!instructions) refuse('portable_invalid', 'The selected skill package has no SKILL.md.', {})
	manifest.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
	return { manifest, instructions }
}

/** Convert parsed YAML to deeply immutable data, without prototypes, cycles or executable tags. */
function immutableYaml(value: unknown, ancestors = new Set<object>()): unknown {
	if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value
	if (typeof value !== 'object' || value === null || ancestors.has(value)) {
		return refuse('portable_invalid', 'Frontmatter must contain finite, acyclic YAML data.', {})
	}
	ancestors.add(value)
	try {
		if (Array.isArray(value)) return Object.freeze(value.map(item => immutableYaml(item, ancestors)))
		if (!(value instanceof Map)) return refuse('portable_invalid', 'Unsupported YAML value in frontmatter.', {})
		const result: Record<string, unknown> = Object.create(null)
		for (const [key, item] of value) {
			if (typeof key !== 'string') refuse('portable_invalid', 'Frontmatter mapping keys must be strings.', {})
			result[key] = immutableYaml(item, ancestors)
		}
		return Object.freeze(result)
	} finally { ancestors.delete(value) }
}

function frontmatterOf(instructions: string, origin: string): Readonly<Record<string, unknown>> {
	const match = /^(?:\uFEFF)?---[ \t]*\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m.exec(instructions)
	if (!match || match.index !== 0) refuse('portable_invalid', 'SKILL.md must begin with YAML frontmatter delimited by --- lines.', { origin })
	const document = parseDocument(match[1]!, { uniqueKeys: true, schema: 'core' })
	if (document.errors.length || document.warnings.length) {
		refuse('portable_invalid', 'SKILL.md frontmatter is not supported, unambiguous standard YAML.', {
			origin, problems: [...document.errors, ...document.warnings].map(problem => problem.message),
		})
	}
	let data: unknown
	try { data = immutableYaml(document.toJS({ mapAsMap: true })) }
	catch (cause) {
		if (cause instanceof MadeWellError) throw cause
		return refuse('portable_invalid', 'SKILL.md frontmatter could not be decoded safely.', { origin, detail: String(cause) })
	}
	if (!data || typeof data !== 'object' || Array.isArray(data)) refuse('portable_invalid', 'Frontmatter must be a mapping.', { origin })
	const fields = data as Readonly<Record<string, unknown>>
	const invalid = (field: string, reason: string): never => refuse('portable_invalid', reason, { origin, field })
	if (typeof fields.name !== 'string' || !/^[\p{Ll}\p{N}]+(?:-[\p{Ll}\p{N}]+)*$/u.test(fields.name) || [...fields.name].length > 64 || fields.name !== basename(origin)) {
		invalid('name', 'Skill name must match its directory and contain 1–64 Unicode code points comprising lowercase letters, numbers, and single internal hyphens.')
	}
	if (typeof fields.description !== 'string' || !fields.description.trim() || [...fields.description].length > 1024) invalid('description', 'Skill description must be a nonempty string of at most 1024 characters.')
	for (const field of ['license', 'compatibility', 'allowed-tools']) {
		if (Object.hasOwn(fields, field) && typeof fields[field] !== 'string') invalid(field, 'Optional standard skill fields must have their standard string shapes.')
	}
	if (typeof fields.compatibility === 'string' && (!fields.compatibility.trim() || [...fields.compatibility].length > 500)) invalid('compatibility', 'Compatibility must contain 1–500 characters when present.')
	if (Object.hasOwn(fields, 'metadata')) {
		const metadata = fields.metadata
		if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || Object.values(metadata).some(value => typeof value !== 'string')) invalid('metadata', 'Skill metadata must map string keys to string values.')
	}
	// All other fields are retained as inert data. Neither these nor allowed-tools
	// grant permissions, execute code, configure servers or activate nested skills.
	return fields
}

/** Validate an explicit directory grant even when no optional configuration exists. */
export function validateGrantedRoot(root: string): string {
	return boundary({ root }, () => withRoot(root, (_directory, canonical) => canonical))
}

/** Capture an explicitly selected ordinary local skill. No parent discovery or execution. */
export function loadSkillPackage(root: string, directory: string, scope?: 'runtime'): SkillPackage {
	return boundary({ root, directory }, () => withRoot(root, (granted, canonicalRoot) => {
		localPath(directory, 'skill directory')
		const origin = isAbsolute(directory) ? absolutePath(directory, 'skill directory') : resolve(canonicalRoot, directory)
		const suffix = within(canonicalRoot, origin)
		return directoryAt(granted, suffix ? suffix.split(sep) : [], packageDirectory => {
			const captured = manifestAt(packageDirectory, scope)
			if (identityOf(origin, manifestAt(packageDirectory, scope).manifest) !== identityOf(origin, captured.manifest)) {
				refuse('portable_stale', 'The skill package changed while its selection was being captured.', { origin })
			}
			let instructions: string
			try { instructions = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(captured.instructions) }
			catch { return refuse('portable_invalid', 'SKILL.md must be valid UTF-8.', { origin }) }
			const frontmatter = frontmatterOf(instructions, origin)
			const manifest = Object.freeze(captured.manifest.map(entry => Object.freeze(entry)))
			return Object.freeze({ origin, name: frontmatter.name as string, ...(scope ? { scope } : {}), frontmatter, instructions, manifest, identity: identityOf(origin, manifest) })
		})
	}))
}

/** Read an explicitly granted absolute configuration file without following symlinks. */
export function readGrantedFile(root: string, path: string): Buffer {
	return boundary({ root, path }, () => withRoot(root, (directory, canonicalRoot) => {
		const absolute = absolutePath(path, 'granted file')
		const suffix = within(canonicalRoot, absolute)
		if (!suffix) refuse('portable_invalid', 'A granted file must not be the root directory itself.', { root, path })
		return readAt(directory, suffix.split(sep).join('/'))
	}))
}

/** Read only a manifested resource; any package content drift requires explicit reselection. */
export function readSkillFile(root: string, snapshot: SkillPackage, path: string): Buffer {
	return boundary({ root, path }, () => {
		resourcePath(path)
		if (!snapshot || !Array.isArray(snapshot.manifest) || typeof snapshot.origin !== 'string') refuse('portable_invalid', 'A complete skill snapshot is required.', { path })
		let previous = ''
		for (const entry of snapshot.manifest) {
			if (!entry || typeof entry.path !== 'string') refuse('portable_invalid', 'The snapshot manifest is malformed.', { path })
			resourcePath(entry.path)
			if (entry.path <= previous || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) refuse('portable_invalid', 'The snapshot manifest is malformed or not strictly sorted.', { path, entry })
			previous = entry.path
		}
		const selected = snapshot.manifest.find(entry => entry.path === path)
		const skill = snapshot.manifest.find(entry => entry.path === 'SKILL.md')
		if (!selected || !skill || identityOf(snapshot.origin, snapshot.manifest) !== snapshot.identity || typeof snapshot.instructions !== 'string' || hash(Buffer.from(snapshot.instructions)) !== skill.sha256) {
			refuse('portable_invalid', 'The resource is not authorized by an intact skill snapshot.', { origin: snapshot.origin, path, identity: snapshot.identity })
		}
		// Validate the grant outside the stale-content boundary: changing the caller's
		// root cannot turn an out-of-scope request into a supposedly stale package.
		within(absolutePath(root, 'root'), absolutePath(snapshot.origin, 'snapshot origin'))
		try {
			return withRoot(root, (granted, canonicalRoot) => {
				const suffix = within(canonicalRoot, snapshot.origin)
				return directoryAt(granted, suffix ? suffix.split(sep) : [], packageDirectory => {
					const current = manifestAt(packageDirectory, snapshot.scope)
					if (identityOf(snapshot.origin, current.manifest) !== snapshot.identity) refuse('portable_stale', 'Package content no longer matches the retained selection.', { origin: snapshot.origin, path, identity: snapshot.identity })
					const bytes = readAt(packageDirectory, path)
					if (bytes.length !== selected.bytes || hash(bytes) !== selected.sha256) refuse('portable_stale', 'The selected resource changed while reading.', { origin: snapshot.origin, path })
					return bytes
				})
			})
		} catch (cause) {
			throw new MadeWellError({
				code: 'portable_stale', message: 'The retained package can no longer be read with its selected content identity.',
				context: { root, origin: snapshot.origin, path, identity: snapshot.identity, reason: cause instanceof Error ? cause.message : String(cause) },
				next: [{ run: 'mw', why: `Inspect the read-only command reference and explicitly reselect ${quote(snapshot.origin)} only after reviewing its changes.` }],
			})
		}
	})
}
