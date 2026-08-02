import styled from 'styled-components'

export const StyledCard = styled.div`
  width: 100%;
  max-width: 480px;
  background: ${(props) => props.theme.colors.surface};
  color: ${(props) => props.theme.colors.text};
  border-radius: 24px;
  padding: 32px;
  /* Soft, brand-tinted shadow (not plain gray/black) so the card reads as
     floating above the cream background instead of a flat pasted rectangle. */
  box-shadow: 0 16px 40px rgba(81, 53, 201, 0.12), 0 4px 10px rgba(81, 53, 201, 0.08);

  @media (max-width: 480px) {
    padding: 20px;
  }

  @media (max-width: 360px) {
    padding: 16px;
  }
`
