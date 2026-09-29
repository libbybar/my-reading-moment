import styled from 'styled-components'

export const StyledAvatarButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 104px;
  border: none;
  background: none;
  padding: 0;
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.text};
  cursor: pointer;
  transition: transform 0.15s ease;

  &:hover {
    transform: scale(1.06) translateY(-2px);
  }

  &:active {
    transform: scale(1.02) translateY(1px);
  }

  @media (max-width: 480px) {
    width: 88px;
  }
`

export const AvatarCircle = styled.div`
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: ${(props) => props.theme.colors.primaryLight};
  color: ${(props) => props.theme.colors.primaryDark};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.12);

  svg,
  img {
    width: 66px;
    height: 66px;
    object-fit: contain;
  }

  @media (max-width: 480px) {
    width: 76px;
    height: 76px;

    svg,
    img {
      width: 56px;
      height: 56px;
    }
  }
`

export const AvatarDisplayWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 104px;
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.text};

  @media (max-width: 480px) {
    width: 88px;
  }
`

export const AvatarLabel = styled.span`
  font-family: ${(props) => props.theme.fonts.main};
  font-size: 14px;
  text-align: center;
  overflow-wrap: break-word;
  max-width: 100%;
`
