import styled from 'styled-components'

export const StyledAvatarButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 92px;
  border: none;
  background: none;
  padding: 0;
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.text};
  cursor: pointer;

  @media (max-width: 480px) {
    width: 80px;
  }
`

export const AvatarCircle = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: ${(props) => props.theme.colors.primaryLight};
  color: ${(props) => props.theme.colors.primaryDark};
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 32px;
    height: 32px;
  }

  @media (max-width: 480px) {
    width: 64px;
    height: 64px;
  }
`

export const AvatarLabel = styled.span`
  font-family: ${(props) => props.theme.fonts.main};
  font-size: 14px;
  text-align: center;
  overflow-wrap: break-word;
  max-width: 100%;
`
