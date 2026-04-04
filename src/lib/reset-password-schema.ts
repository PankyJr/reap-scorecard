import { z } from 'zod'
import { validatePasswordForReset } from '@/lib/password-policy'

export const resetPasswordFormSchema = z
  .object({
    password: z.string(),
    confirm_password: z.string().min(1, 'Confirm your password.'),
  })
  .superRefine((data, ctx) => {
    const v = validatePasswordForReset(data.password)
    if (!v.ok) {
      ctx.addIssue({ code: 'custom', message: v.message, path: ['password'] })
      return
    }
    if (data.password !== data.confirm_password) {
      ctx.addIssue({
        code: 'custom',
        message: 'Passwords do not match.',
        path: ['confirm_password'],
      })
    }
  })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>
