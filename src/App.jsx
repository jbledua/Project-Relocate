import { useEffect, useState } from 'react'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import { BrowserRouter, Link as RouterLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import BoxEditPage from './pages/BoxEditPage'
import BoxDetails from './pages/BoxDetails'
import Home from './pages/Home'
import SettingsPage from './pages/SettingsPage'
import GroupsPage from './pages/GroupsPage'
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
  const [accountMenuAnchor, setAccountMenuAnchor] = useState(null)
  const [authError, setAuthError] = useState('')
  const [activeGroupId, setActiveGroupId] = useState('')
  const [activeGroup, setActiveGroup] = useState(null)

  const getActiveGroupStorageKey = (userId) => `relocate-active-group:${userId}`

  const clearActiveGroupSelection = (userId = session?.user?.id) => {
    if (userId) {
      window.localStorage.removeItem(getActiveGroupStorageKey(userId))
    }

    setActiveGroupId('')
    setActiveGroup(null)
  }

  const handleSelectGroup = (groupOrId) => {
    const nextGroupId = typeof groupOrId === 'string' ? groupOrId : groupOrId?.id || ''

    if (!nextGroupId) {
      clearActiveGroupSelection()
      return
    }

    setActiveGroupId(nextGroupId)
    setActiveGroup(typeof groupOrId === 'object' ? groupOrId : null)

    if (session?.user?.id) {
      window.localStorage.setItem(getActiveGroupStorageKey(session.user.id), nextGroupId)
    }
  }

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

  useEffect(() => {
    if (!session?.user?.id) {
      setActiveGroupId('')
      setActiveGroup(null)
      return
    }

    const storedGroupId = window.localStorage.getItem(getActiveGroupStorageKey(session.user.id)) || ''
    setActiveGroupId(storedGroupId)
  }, [session?.user?.id])

  useEffect(() => {
    let isActive = true

    const loadActiveGroup = async () => {
      if (!session?.user?.id || !activeGroupId) {
        if (isActive) {
          setActiveGroup(null)
        }
        return
      }

      const { data: membership, error: membershipError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', activeGroupId)
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (membershipError || !membership) {
        clearActiveGroupSelection(session.user.id)
        return
      }

      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id, name, owner_id, join_code, created_at')
        .eq('id', activeGroupId)
        .maybeSingle()

      if (!isActive) {
        return
      }

      if (groupError || !group) {
        clearActiveGroupSelection(session.user.id)
        return
      }

      setActiveGroup(group)
    }

    loadActiveGroup()

    return () => {
      isActive = false
    }
  }, [activeGroupId, session?.user?.id])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }

  const handleOpenAccountMenu = (event) => {
    setAccountMenuAnchor(event.currentTarget)
  }

  const handleCloseAccountMenu = () => {
    setAccountMenuAnchor(null)
  }

  const handleSignOutClick = async () => {
    setAuthError('')
    handleCloseAccountMenu()

    try {
      clearActiveGroupSelection(session?.user?.id)
      await handleSignOut()
    } catch (signOutError) {
      setAuthError(signOutError.message || 'Could not sign out.')
    }
  }

  const accountDisplayName =
    session?.user?.user_metadata?.full_name
    || session?.user?.user_metadata?.name
    || session?.user?.email
    || 'Unknown account'
  const accountInitial = String(accountDisplayName).trim().charAt(0).toUpperCase() || 'A'

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
      <AppBar position="sticky" color="primary" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ minHeight: { xs: 64, sm: 72 } }}>
          <Box sx={{ flexGrow: 1 }}>
            <Box
              component={RouterLink}
              to="/"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: 'inherit', textDecoration: 'none' }}
            >
              <LocalShippingIcon fontSize="medium" sx={{ transform: 'scaleX(-1)' }} />
              <Typography variant="h6" component="span" sx={{ lineHeight: 1.2 }}>
                Relocate
              </Typography>
            </Box>
          </Box>

          {session ? (
            <>
              <IconButton
                aria-label="Account menu"
                aria-controls={accountMenuAnchor ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={accountMenuAnchor ? 'true' : undefined}
                onClick={handleOpenAccountMenu}
                size="small"
              >
                <Avatar sx={{ width: 36, height: 36 }}>{accountInitial}</Avatar>
              </IconButton>

              <Menu
                id="account-menu"
                anchorEl={accountMenuAnchor}
                open={Boolean(accountMenuAnchor)}
                onClose={handleCloseAccountMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem disabled sx={{ opacity: 1 }}>
                  <Stack spacing={0.25}>
                    <Typography variant="caption" color="text.secondary">
                      Signed in as
                    </Typography>
                    <Typography variant="body2">{accountDisplayName}</Typography>
                  </Stack>
                </MenuItem>
                <MenuItem component={RouterLink} to="/groups" onClick={handleCloseAccountMenu}>
                  Groups
                </MenuItem>
                <MenuItem component={RouterLink} to="/settings" onClick={handleCloseAccountMenu}>
                  Settings
                </MenuItem>
                <MenuItem onClick={handleSignOutClick}>Sign out</MenuItem>
              </Menu>
            </>
          ) : (
            <Button component={RouterLink} to="/auth" color="inherit" variant="text">
              Sign in
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {authError ? (
        <Box sx={{ px: 2, pt: 2 }}>
          <Alert severity="error">{authError}</Alert>
        </Box>
      ) : null}

      <Routes>
        <Route path="/auth" element={session ? <Navigate to="/groups" replace /> : <AuthPage />} />

        <Route element={<ProtectedRoute session={session} />}>
          <Route
            path="/"
            element={activeGroupId ? <Home activeGroupId={activeGroupId} activeGroup={activeGroup} /> : <Navigate to="/groups" replace />}
          />
          <Route path="/boxes/:boxId" element={<BoxDetails />} />
          <Route path="/boxes/:boxId/edit" element={<BoxEditPage />} />
          <Route
            path="/groups"
            element={
              <GroupsPage
                session={session?.user}
                activeGroupId={activeGroupId}
                activeGroup={activeGroup}
                onSelectGroup={handleSelectGroup}
              />
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to={session ? '/groups' : '/auth'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
