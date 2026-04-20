import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { supabase } from '../lib/supabaseClient'

function AuthPage() {
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    const normalizedEmail = email.trim()
    if (!normalizedEmail || !password) {
      setError('Email and password are required.')
      return
    }

    setBusy(true)

    try {
      if (mode === 'sign-in') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })

        if (signInError) {
          throw signInError
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        })

        if (signUpError) {
          throw signUpError
        }

        if (!data.session) {
          setInfo('Account created. Check your email to confirm your account, then sign in.')
        } else {
          setInfo('Account created and signed in.')
        }
      }
    } catch (authError) {
      setError(authError.message || 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Project-Relocate
            </Typography>
            <Typography color="text.secondary">Sign in to manage your moving inventory.</Typography>
          </Box>

          <Tabs value={mode} onChange={(_event, nextValue) => setMode(nextValue)}>
            <Tab label="Sign In" value="sign-in" />
            <Tab label="Sign Up" value="sign-up" />
          </Tabs>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={1.5}>
              {error ? <Alert severity="error">{error}</Alert> : null}
              {info ? <Alert severity="info">{info}</Alert> : null}

              <TextField
                type="email"
                label="Email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                fullWidth
              />

              <TextField
                type="password"
                label="Password"
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                fullWidth
              />

              <Button type="submit" variant="contained" disabled={busy}>
                {busy ? 'Please wait...' : mode === 'sign-in' ? 'Sign In' : 'Create Account'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Container>
  )
}

export default AuthPage
