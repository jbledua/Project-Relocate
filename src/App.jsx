import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import BoxDetails from './pages/BoxDetails'
import Home from './pages/Home'
import { supabase } from './lib/supabaseClient'
import './App.css'

function ProtectedRoute({ session }) {
  if (!session) {
    return <Navigate to="/auth" replace />
  }

  return <Outlet />
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadInitialSession = async () => {
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      setSession(existingSession)
      setLoading(false)
    }

    loadInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', p: 2 }}>
        <Box>
          <CircularProgress size={24} sx={{ mb: 1.5 }} />
          <Typography>Checking authentication...</Typography>
        </Box>
      </Box>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={session ? <Navigate to="/" replace /> : <AuthPage />} />

        <Route element={<ProtectedRoute session={session} />}>
          <Route path="/" element={<Home user={session?.user} onSignOut={handleSignOut} />} />
          <Route path="/boxes/:boxId" element={<BoxDetails />} />
        </Route>

        <Route path="*" element={<Navigate to={session ? '/' : '/auth'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
