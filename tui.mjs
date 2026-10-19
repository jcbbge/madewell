// A small terminal drawing kit for the board: styled text, rounded panels, rows of panels, chips and pills.
// Colors are the 256-color palette, which tmux passes through on any terminal setting. With color off every
// helper returns plain text of the same width, so layout never depends on color.

const PALETTE = { ink: 255, muted: 246, faint: 240, line: 238, accent: 111, accentSoft: 17, ok: 78, okSoft: 22,
  warn: 214, warnSoft: 58, bad: 203, badSoft: 52, op: 141, opSoft: 54, chip: 236 };
const ANSI = /\x1b\[[0-9;]*m/g;

export const visible = text => text.replace(ANSI, '').length;

// Exactly n visible columns: cut with an ellipsis, or padded with spaces.
export function fit(text, n) {
  const len = visible(text);
  if (len <= n) return text + ' '.repeat(n - len);
  if (n <= 0) return '';
  let out = '', count = 0;
  for (let i = 0; i < text.length && count < n - 1;) {
    if (text[i] === '\x1b') { const m = /^\x1b\[[0-9;]*m/.exec(text.slice(i)); out += m[0]; i += m[0].length; continue; }
    out += text[i++]; count++;
  }
  return `${out}${out.includes('\x1b[') ? '\x1b[0m' : ''}…`;
}

export function wrapText(text, width) {
  const out = []; let line = '';
  for (let word of String(text ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)) {
    while (word.length > width) { if (line) { out.push(line); line = ''; } out.push(word.slice(0, width)); word = word.slice(width); }
    if (line && line.length + 1 + word.length > width) { out.push(line); line = word; } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out;
}

export function theme(color) {
  const sgr = codes => text => color && text !== '' ? `\x1b[${codes}m${text}\x1b[0m` : String(text);
  const fg = (name, bold = false) => sgr(`${bold ? '1;' : ''}38;5;${PALETTE[name]}`);
  const on = (back, front, bold = true) => sgr(`${bold ? '1;' : ''}48;5;${PALETTE[back]};38;5;${PALETTE[front]}`);
  const t = { color };
  for (const name of Object.keys(PALETTE)) { t[name] = fg(name); t[`${name}Bold`] = fg(name, true); }
  t.bold = sgr('1');
  // A pill: a short state word on a soft background, as the run view's state tags.
  t.pill = (kind, text) => ({
    todo: on('chip', 'muted'), task: on('accentSoft', 'accent'), done: on('okSoft', 'ok'), dropped: on('badSoft', 'bad'),
    you: on('opSoft', 'op'), agent: on('accentSoft', 'accent'), record: on('chip', 'muted'), fail: on('badSoft', 'bad'), warn: on('warnSoft', 'warn'),
  }[kind] ?? on('chip', 'muted'))(` ${text} `);
  t.key = text => on('chip', 'ink')(` ${text} `);
  t.band = (back, front) => on(back, front, false);
  return t;
}

// A rounded panel of exactly `width` columns; the body is padded to `height` lines when given.
export function panel(t, title, body, width, { height, tone = 'line', titleTone = 'mutedBold' } = {}) {
  const inner = width - 4, lines = [...body];
  if (height) while (lines.length < height) lines.push('');
  const label = title ? ` ${title.length > width - 6 ? `${title.slice(0, Math.max(1, width - 7))}…` : title} ` : '';
  const top = t[tone]('╭─') + t[titleTone](label) + t[tone]('─'.repeat(Math.max(0, width - 3 - visible(label))) + '╮');
  return [top, ...lines.map(l => t[tone]('│ ') + fit(l, inner) + t[tone](' │')), t[tone]('╰' + '─'.repeat(width - 2) + '╯')];
}

// Panels side by side, each given its share of the width, all as tall as the tallest.
export function row(t, specs, width, { gap = 1, maxBody = Infinity } = {}) {
  const total = specs.reduce((n, s) => n + (s.weight ?? 1), 0), room = width - gap * (specs.length - 1);
  let used = 0;
  const widths = specs.map((s, i) => i === specs.length - 1 ? room - used : (used += Math.floor(room * (s.weight ?? 1) / total), Math.floor(room * (s.weight ?? 1) / total)));
  const bodies = specs.map((s, i) => s.body(widths[i] - 4).slice(0, maxBody));
  const height = Math.max(...bodies.map(b => b.length));
  const panels = specs.map((s, i) => panel(t, s.title, bodies[i], widths[i], { height, tone: s.tone, titleTone: s.titleTone }));
  return panels[0].map((_, r) => panels.map(p => p[r]).join(' '.repeat(gap)));
}

// Blocks of lines side by side without borders (columns inside a panel).
export function columns(blocks, widths, gap = 2) {
  const height = Math.max(...blocks.map(b => b.length));
  return Array.from({ length: height }, (_, r) => blocks.map((b, i) => fit(b[r] ?? '', widths[i])).join(' '.repeat(gap)).replace(/ +$/, ''));
}
