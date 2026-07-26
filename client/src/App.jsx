import { BrowserRouter, Routes, Route } from 'react-router'
import ReadingSessionPage from './pages/ReadingSessionPage'
import ChildSelectionPage from './pages/ChildSelectionPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ReadingSessionPage />} />
        <Route path="/children" element={<ChildSelectionPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
