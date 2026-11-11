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
      'font-size': [{ text: ['caps', 'meta', 'body', 'sentence', 'page-title', 'score', 'heading', 'title', 'display', 'hero'] }],
      shadow: [{ shadow: ['card', 'pop'] }],
      rounded: [{ rounded: ['card', 'control', 'sm'] }],
      tracking: [{ tracking: ['label'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
