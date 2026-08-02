import { BrowserRouter, Routes, Route } from 'react-router'
import ReadingSessionPage from './pages/ReadingSessionPage'
import ChildSelectionPage from './pages/ChildSelectionPage'
import ChildHomePage from './pages/ChildHomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { ActiveChildProvider } from './context/ActiveChildProvider'
import { LearningPathProvider } from './context/LearningPathProvider'

function App() {
  return (
    <BrowserRouter>
      <ActiveChildProvider>
        <LearningPathProvider>
          <Routes>
            <Route path="/" element={<ReadingSessionPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/children" element={<ChildSelectionPage />} />
            <Route path="/child-home" element={<ChildHomePage />} />
          </Routes>
        </LearningPathProvider>
      </ActiveChildProvider>
    </BrowserRouter>
  )
}

export default App
