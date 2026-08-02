import { z } from 'zod'
import { TEXT } from '../constants/text'

const registerSchema = z.object({
  email: z.string().trim().email(TEXT.register.invalidInputError),
  password: z.string().min(8, TEXT.register.invalidInputError),
})

const loginSchema = z.object({
  email: z.string().trim().email(TEXT.login.error),
  password: z.string().min(1, TEXT.login.error),
})

function firstIssueMessage(parsedForm, fallbackMessage) {
  return parsedForm.error?.issues[0]?.message || fallbackMessage
}

export { registerSchema, loginSchema, firstIssueMessage }
