import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn's class combiner: clsx for conditionals, twMerge so later
 *  utilities beat earlier ones of the same property. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
