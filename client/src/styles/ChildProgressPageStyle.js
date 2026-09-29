import styled from 'styled-components'
import Card from '../components/ui/Card'

export const ProgressCard = styled(Card)`
  @media (min-width: 768px) {
    max-width: 640px;
    padding: 48px;
  }
`

export const ProgressHeading = styled.h1`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.primaryDark};
  font-size: 26px;
  font-weight: normal;
  margin: 0 0 20px;
`

export const StatsRow = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`

export const StatCard = styled.div`
  background: ${(props) => props.theme.colors.secondaryLight};
  border-radius: 16px;
  padding: 16px 20px;
  flex: 1;
  min-width: 140px;
`

export const StatLabel = styled.p`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.textMuted};
  font-size: 13px;
  margin: 0 0 4px;
`

export const StatValue = styled.p`
  font-family: ${(props) => props.theme.fonts.main};
  color: ${(props) => props.theme.colors.primaryDark};
  font-size: 24px;
  font-weight: 600;
  margin: 0;
`
