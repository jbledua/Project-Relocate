import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import MuiLink from '@mui/material/Link'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function BoxDetails() {
  const { boxId } = useParams()
  const [box, setBox] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true)
      setError('')

      try {
        const { data: boxData, error: boxError } = await supabase
          .from('boxes')
          .select('*')
          .eq('id', boxId)
          .single()

        if (boxError) {
          throw boxError
        }

        const { data: itemData, error: itemError } = await supabase
          .from('box_items')
          .select('*')
          .eq('box_id', boxId)
          .order('content', { ascending: true })

        if (itemError) {
          throw itemError
        }

        setBox(boxData)
        setItems(itemData || [])
      } catch (fetchError) {
        setError(fetchError.message || 'Could not load box details.')
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [boxId])

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={20} />
          <Typography>Loading box details...</Typography>
        </Stack>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Alert severity="error">{error}</Alert>
            <MuiLink component={RouterLink} to="/" underline="hover">
              Back to home
            </MuiLink>
          </Stack>
        </Paper>
      </Container>
    )
  }

  if (!box) {
    return (
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography>Box not found.</Typography>
            <MuiLink component={RouterLink} to="/" underline="hover">
              Back to home
            </MuiLink>
          </Stack>
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <MuiLink component={RouterLink} to="/" underline="hover">
            Back to home
          </MuiLink>

          <Typography variant="h4" component="h1">
            {box.box_number}
          </Typography>

          <Typography>
            <strong>Room:</strong> {box.room || 'N/A'}
          </Typography>
          <Typography>
            <strong>Label:</strong> {box.label || 'N/A'}
          </Typography>
          <Typography>
            <strong>Notes:</strong> {box.notes || 'No notes'}
          </Typography>

          {box.photo_url ? (
            <Box
              component="img"
              src={box.photo_url}
              alt={`${box.box_number} reference`}
              sx={{ width: '100%', maxWidth: 320, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
            />
          ) : (
            <Typography color="text.secondary">No photo uploaded yet.</Typography>
          )}

          <Typography variant="h6" component="h2">
            Contents
          </Typography>

          {items.length === 0 ? (
            <Typography color="text.secondary">No contents listed.</Typography>
          ) : (
            <List dense sx={{ p: 0 }}>
              {items.map((item) => (
                <ListItem key={item.id} sx={{ px: 0 }}>
                  {item.content}
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </Paper>
    </Container>
  )
}

export default BoxDetails
