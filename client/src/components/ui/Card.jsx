import { StyledCard } from '../../styles/components/CardStyle'

function Card({ children, className }) {
  return <StyledCard className={className}>{children}</StyledCard>
}

export default Card
