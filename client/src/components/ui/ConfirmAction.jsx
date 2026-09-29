import { TriangleAlert } from 'lucide-react'
import Button from './Button'
import {
  ConfirmActionWrapper,
  ConfirmActionIcon,
  ConfirmActionMessage,
  ConfirmActionButtons,
} from '../../styles/components/ConfirmActionStyle'

function ConfirmAction({
  message,
  confirmLabel,
  confirmingLabel,
  cancelLabel,
  isConfirming = false,
  onConfirm,
  onCancel,
}) {
  return (
    <ConfirmActionWrapper role="alert">
      <ConfirmActionIcon aria-hidden="true">
        <TriangleAlert size={20} />
      </ConfirmActionIcon>
      <ConfirmActionMessage>{message}</ConfirmActionMessage>
      <ConfirmActionButtons>
        <Button variant="danger" onClick={onConfirm} disabled={isConfirming}>
          {isConfirming ? confirmingLabel : confirmLabel}
        </Button>
        <Button variant="muted" onClick={onCancel} disabled={isConfirming}>
          {cancelLabel}
        </Button>
      </ConfirmActionButtons>
    </ConfirmActionWrapper>
  )
}

export default ConfirmAction
