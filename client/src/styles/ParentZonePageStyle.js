import styled from 'styled-components'

export const GateQuestion = styled.p`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.text};
  font-size: 18px;
  text-align: center;
  margin: 0;
`

export const ProfileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
`

export const ProfileRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: ${(props) => props.theme.colors.surfaceSoft};
  border-radius: 14px;
  padding: 10px 12px;
`

export const ProfileRowIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

export const ProfileRowAvatar = styled.div`
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${(props) => props.theme.colors.primaryLight};
  color: ${(props) => props.theme.colors.primaryDark};
  display: flex;
  align-items: center;
  justify-content: center;

  svg,
  img {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }
`

export const ProfileRowActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`

export const ProfileName = styled.span`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.text};
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const ProfileForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  width: 100%;
`

export const FormActions = styled.div`
  display: flex;
  gap: 12px;
`

// flex: 1 (not width: 100%) so it lines up exactly with ProfileList's rows
// above it, instead of floating at its own natural size.
export const AddChildButtonWrapper = styled.div`
  display: flex;

  button {
    flex: 1;
  }
`

// align-items: center (not the flex-column default of stretch) — without
// this, Back/Logout silently stretch to the card's full width and end up
// looking like the most important thing on the screen.
export const FooterActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
`
