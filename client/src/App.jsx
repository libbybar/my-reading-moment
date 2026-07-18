import { BrowserRouter, Routes, Route } from 'react-router'
import ReadingSessionPage from './pages/ReadingSessionPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ReadingSessionPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
