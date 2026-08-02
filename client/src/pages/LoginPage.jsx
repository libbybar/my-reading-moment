import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { TEXT } from '../constants/text'
import { login } from '../services/authService'
import { loginSchema, firstIssueMessage } from '../schemas/authSchemas'
import PageShell from '../components/ui/PageShell'
import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'
import FeedbackMessage from '../components/ui/FeedbackMessage'
import { AuthCard, AuthHeading, AuthForm, AuthFooter } from '../styles/AuthPageStyle'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    const parsedForm = loginSchema.safeParse({ email, password })

    if (!parsedForm.success) {
      setError(firstIssueMessage(parsedForm, TEXT.login.error))
      return
    }

    setIsSubmitting(true)

    login(parsedForm.data)
      .then(() => {
        navigate('/children')
      })
      .catch(() => {
        setError(TEXT.login.error)
        setIsSubmitting(false)
      })
  }

  return (
    <PageShell>
      <AuthCard>
        <AuthHeading>{TEXT.login.heading}</AuthHeading>
        <AuthForm onSubmit={handleSubmit} noValidate>
          <TextField
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={TEXT.login.emailPlaceholder}
            ariaLabel={TEXT.login.emailAriaLabel}
            disabled={isSubmitting}
          />
          <TextField
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={TEXT.login.passwordPlaceholder}
            ariaLabel={TEXT.login.passwordAriaLabel}
            disabled={isSubmitting}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? TEXT.login.submittingLabel : TEXT.login.submitButtonLabel}
          </Button>
        </AuthForm>
        {error && <FeedbackMessage tone="error">{error}</FeedbackMessage>}
        <AuthFooter>
          <Link to="/register">{TEXT.login.registerLinkLabel}</Link>
        </AuthFooter>
      </AuthCard>
    </PageShell>
  )
}

export default LoginPage
