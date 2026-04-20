import { BrowserRouter, Route, Routes } from 'react-router-dom'
import BoxDetails from './pages/BoxDetails'
import Home from './pages/Home'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/boxes/:boxId" element={<BoxDetails />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
