import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { TEXT } from '../constants/text'
import { register, AuthServiceError } from '../services/authService'
import { registerSchema, firstIssueMessage } from '../schemas/authSchemas'
import PageShell from '../components/ui/PageShell'
import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'
import FeedbackMessage from '../components/ui/FeedbackMessage'
import { AuthCard, AuthHeading, AuthForm, AuthFooter } from '../styles/AuthPageStyle'

function errorMessageForStatus(status) {
  if (status === 400) {
    return TEXT.register.invalidInputError
  }

  if (status === 409) {
    return TEXT.register.emailTakenError
  }

  return TEXT.register.genericError
}

function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    const parsedForm = registerSchema.safeParse({ email, password })

    if (!parsedForm.success) {
      setError(firstIssueMessage(parsedForm, TEXT.register.invalidInputError))
      return
    }

    setIsSubmitting(true)

    register(parsedForm.data)
      .then(() => {
        // Registration doesn't set the auth cookie (only /login does) —
        // a fresh account still has to log in as a separate step.
        navigate('/login')
      })
      .catch((caughtError) => {
        const status = caughtError instanceof AuthServiceError ? caughtError.status : undefined

        setError(errorMessageForStatus(status))
        setIsSubmitting(false)
      })
  }

  return (
    <PageShell>
      <AuthCard>
        <AuthHeading>{TEXT.register.heading}</AuthHeading>
        <AuthForm onSubmit={handleSubmit} noValidate>
          <TextField
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={TEXT.register.emailPlaceholder}
            ariaLabel={TEXT.register.emailAriaLabel}
            disabled={isSubmitting}
          />
          <TextField
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={TEXT.register.passwordPlaceholder}
            ariaLabel={TEXT.register.passwordAriaLabel}
            disabled={isSubmitting}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? TEXT.register.submittingLabel : TEXT.register.submitButtonLabel}
          </Button>
        </AuthForm>
        {error && <FeedbackMessage tone="error">{error}</FeedbackMessage>}
        <AuthFooter>
          <Link to="/login">{TEXT.register.loginLinkLabel}</Link>
        </AuthFooter>
      </AuthCard>
    </PageShell>
  )
}

export default RegisterPage
