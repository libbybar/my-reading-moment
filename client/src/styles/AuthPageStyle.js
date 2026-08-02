import styled from 'styled-components'
import Card from '../components/ui/Card'

// Login and Register are near-identical single-form pages, so they share one
// style file instead of duplicating the same styled-components twice.

// Widens on larger screens only — the base Card's 480px cap stays the
// default (and untouched) for every other page, including the learning-path
// screen, which is sized specifically around it.
export const AuthCard = styled(Card)`
  @media (min-width: 768px) {
    max-width: 560px;
    padding: 48px;
  }
`

export const AuthHeading = styled.h1`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.primaryDark};
  font-size: 26px;
  font-weight: normal;
  margin: 0 0 24px;
  text-align: center;

  @media (min-width: 768px) {
    font-size: 30px;
  }
`

// Same stretch pattern as ReadingSessionPageStyle.js's AnswerPanel — flex
// column + align-items: stretch is enough to make TextField/Button fill the
// card's width, no width: 100% needed on the components themselves.
export const AuthForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
`

export const AuthFooter = styled.p`
  margin: 20px 0 0;
  text-align: center;
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.textMuted};
  font-size: 14px;

  a {
    color: ${(props) => props.theme.colors.primary};
    font-weight: 600;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
`
