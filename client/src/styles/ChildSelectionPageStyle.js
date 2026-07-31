import styled from 'styled-components'

export const ChildSelectionHeading = styled.h1`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.primaryDark};
  font-size: 24px;
  margin: 0 0 16px;

  @media (max-width: 480px) {
    font-size: 22px;
  }
`

export const ProfileGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
`

// Avatar + its edit button, stacked with real spacing instead of a bare div
// (which had no gap at all — the edit button used to sit right under the name).
export const ProfileCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`

export const ProfileForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
`

export const FormActions = styled.div`
  display: flex;
  gap: 12px;
`
