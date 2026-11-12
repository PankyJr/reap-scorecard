import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Join class names and let the later one win on a clash ("px-4" then "px-6").
 * tailwind-merge has to be told our own type sizes, or it would read
 * "text-title" as a colour and drop it next to "text-ink".
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['title', 'page-title', 'section', 'body', 'meta', 'caps', 'metric', 'score', 'heading', 'sentence', 'display', 'hero'] }],
      shadow: [{ shadow: ['card', 'pill', 'pop', 'btn-primary', 'btn-primary-pressed', 'btn-secondary', 'btn-secondary-pressed'] }],
      rounded: [{ rounded: ['card', 'control', 'sm'] }],
      tracking: [{ tracking: ['label'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
