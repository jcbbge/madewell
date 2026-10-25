#!/usr/bin/env node
// Builds dist/gazette.html: the live Gazette page with its painter and blazon writer bundled inside, so an installed
// Made Well serves it with no build step. Run by `npm run bundle` before the CLI is bundled.
import { build } from 'esbuild'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { painter } from './paint.mjs'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const T = JSON.parse(readFileSync(here('../../skills/gazette-grammar/tinctures.json'), 'utf8'))
const P = painter(T)
const { outputFiles } = await build({ entryPoints: [here('page.mjs')], bundle: true, format: 'iife', target: 'es2022', write: false, logLevel: 'warning' })
const script = outputFiles[0].text.replaceAll('</script', '<\\/script')
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Made Well: Delivery</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500;800&family=Alegreya+Sans:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style id="style">${P.style({ ground: 'paper', around: 'slate' })}</style>
</head>
<body>
<main class="sheet" id="sheet"></main>
<p id="status" class="visually-hidden" role="status"></p>
<script>${script}</script>
</body>
</html>
`
mkdirSync(here('../../dist'), { recursive: true })
writeFileSync(here('../../dist/gazette.html'), html)
process.stdout.write(`${here('../../dist/gazette.html')} ${html.length} bytes\n`)
