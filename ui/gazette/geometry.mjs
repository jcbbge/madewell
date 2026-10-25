// Copied from skills/gazette-grammar/mockup/geometry.mjs (the reference painter); ringRadii here fits any number of rings.
// The rings charge, as geometry both painters share. Angles are degrees clockwise from the top.
// The charge leaves a gap at the top, between SPAN[1] and SPAN[0], for each ring's name.
export const VIEW = { w: 600, h: 540, cx: 300, cy: 276 }
export const SPAN = [30, 330]
export const DISC = 78
const OUTER = 234, BAND = 24, GAP = 10

/** Inner and outer radius of each ring, outermost first. Up to four rings keep the mockup's band; more share the room. */
export const ringRadii = (n) => {
	const room = OUTER - DISC - 14
	const pitch = Math.min(BAND + GAP, room / Math.max(n, 1))
	const band = Math.round(pitch * (BAND / (BAND + GAP)) * 10) / 10
	return Array.from({ length: n }, (_, k) => {
		const r1 = OUTER - k * pitch
		return { r0: r1 - band, r1 }
	})
}

/** The angles a step occupies. */
export const stepArc = (i, steps) => {
	const w = (SPAN[1] - SPAN[0]) / steps
	return [SPAN[0] + i * w, SPAN[0] + (i + 1) * w]
}

export const pt = (r, a) => {
	const t = (a * Math.PI) / 180
	return [VIEW.cx + r * Math.sin(t), VIEW.cy - r * Math.cos(t)]
}

/** Polar position of a point, for painters that work cell by cell. */
export const polar = (x, y) => {
	const dx = x - VIEW.cx, dy = VIEW.cy - y
	return { r: Math.hypot(dx, dy), a: ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360 }
}
