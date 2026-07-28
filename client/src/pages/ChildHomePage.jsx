import { Navigate } from 'react-router'
import { useActiveChild } from '../context/useActiveChild'
import { TEXT } from '../constants/text'
import PageShell from '../components/ui/PageShell'
import Card from '../components/ui/Card'
import { ChildHomeMessage } from '../styles/ChildHomePageStyle'

function ChildHomePage() {
  const { activeChildId } = useActiveChild()

  if (!activeChildId) {
    return <Navigate to="/children" replace />
  }

  return (
    <PageShell>
      <Card>
        <ChildHomeMessage>{TEXT.childHome.placeholderMessage}</ChildHomeMessage>
      </Card>
    </PageShell>
  )
}

export default ChildHomePage
