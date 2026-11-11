/**
 * reap/no-raw-colours — design tokens only (docs/design-rules.md).
 *
 * Fails on, in any string or template literal:
 *   - a raw colour value:        '#063b3f', 'rgb(…)', 'rgba(…)', 'hsl(…)', 'oklch(…)'
 *   - a Tailwind arbitrary colour: 'bg-[#063b3f]', 'text-[rgb(0_0_0)]'
 *   - a Tailwind palette class:    'bg-slate-100', 'text-white', 'border-black/10'
 *
 * Use the token names from src/app/tokens.css instead (bg-surface, text-ink,
 * text-label, bg-success-soft, bg-el-own, …). Files that predate the rule are
 * listed in eslint-rules/legacy-colour-files.mjs; that list may only shrink.
 */
const RAW_VALUE = /^\s*(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgba?|hsla?|oklch|oklab|lab|lch)\(.*\))\s*$/i
const ARBITRARY = /\b[a-z-]+-\[(?:#[0-9a-f]{3,8}|(?:rgba?|hsla?|oklch)\()/i
const PALETTE =
  /(?:^|[\s:"'`!])(?:bg|text|border(?:-[trblxy])?|ring|ring-offset|from|to|via|fill|stroke|divide|outline|shadow|placeholder|accent|decoration|caret)-(?:(?:slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|neutral)-\d{2,3}|white|black)(?:\/\d{1,3})?(?=$|[\s"'`])/

function check(context, node, text) {
  if (!text) return
  let message = null
  if (RAW_VALUE.test(text)) message = `Raw colour "${text.trim()}". Use a token from src/app/tokens.css.`
  else if (ARBITRARY.test(text)) message = 'Tailwind arbitrary colour. Use a token class (bg-surface, text-ink, …).'
  else {
    const m = text.match(PALETTE)
    if (m) message = `Tailwind palette class "${m[0].trim()}". Use a token class (bg-surface, text-ink, text-label, bg-success-soft, …).`
  }
  if (message) context.report({ node, message })
}

export default {
  rules: {
    'no-raw-colours': {
      meta: { type: 'problem', docs: { description: 'Design tokens only: no raw colours or Tailwind palette classes' }, schema: [] },
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === 'string') check(context, node, node.value)
          },
          TemplateElement(node) {
            check(context, node, node.value.cooked ?? node.value.raw)
          },
          JSXText() {},
        }
      },
    },
  },
}
