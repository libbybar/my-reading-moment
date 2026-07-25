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
