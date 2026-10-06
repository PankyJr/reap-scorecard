/**
 * Checks on rendered markup for two axe rules, for page tests:
 * - scrollable-region-focusable: a wrapper that scrolls sideways must be
 *   reachable by keyboard and named;
 * - color-contrast: text colours with an opacity modifier (text-ok/70) fall
 *   below 4.5:1, so text uses the full token.
 */

/** Opening tags of elements whose class list includes overflow-x-auto. */
export function sidewaysScrollers(html: string): string[] {
  return (html.match(/<[a-z]+\b[^>]*class="[^"]*\boverflow-x-auto\b[^"]*"[^>]*>/g) ?? []).map((tag) => tag)
}

/** The scrollers missing tabindex="0", role="region" or an aria-label. */
export function unreachableScrollers(html: string): string[] {
  return sidewaysScrollers(html).filter(
    (tag) => !/\btabindex="0"/.test(tag) || !/\brole="region"/.test(tag) || !/\baria-label="[^"]+"/.test(tag),
  )
}

/** Text colour classes with an opacity modifier, e.g. text-ok/70 (hover: and disabled: states excluded). */
export function fadedTextClasses(html: string): string[] {
  const found = new Set<string>()
  for (const [, classes] of html.matchAll(/class="([^"]*)"/g)) {
    for (const cls of classes.split(/\s+/)) {
      if (/^text-[a-z-]+\/\d+$/.test(cls)) found.add(cls)
    }
  }
  return [...found]
}
