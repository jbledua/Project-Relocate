import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import MuiLink from '@mui/material/Link'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function BoxDetails({ boxId: boxIdProp, onClose, onEdit, hideBackLink = false }) {
  const params = useParams()
  const boxId = boxIdProp || params.boxId
  const [box, setBox] = useState(null)
  const [items, setItems] = useState([])
  const [tags, setTags] = useState([])
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

        const { data: tagData, error: tagError } = await supabase
          .from('box_tags')
          .select('tag')
          .eq('box_id', boxId)
          .order('tag', { ascending: true })

        if (tagError) {
          throw tagError
        }

        setBox(boxData)
        setItems(itemData || [])
        setTags((tagData || []).map((tagRow) => tagRow.tag))
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
      <Container maxWidth="sm" sx={{ py: 3, minWidth: hideBackLink ? 0 : undefined }}>
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
            {hideBackLink ? null : (
              <MuiLink component={RouterLink} to="/" underline="hover">
                Back to home
              </MuiLink>
            )}
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
            {hideBackLink ? null : (
              <MuiLink component={RouterLink} to="/" underline="hover">
                Back to home
              </MuiLink>
            )}
          </Stack>
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
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

          {tags.length > 0 ? (
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              {tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" />
              ))}
            </Stack>
          ) : null}

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

          <Divider />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="outlined" disabled={!onEdit} onClick={() => onEdit?.({ box, items, tags })}>
              Edit
            </Button>

            {onClose ? (
              <Button variant="contained" onClick={onClose}>
                Close
              </Button>
            ) : hideBackLink ? null : (
              <Button component={RouterLink} to="/" variant="contained">
                Back to home
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Container>
  )
}

export default BoxDetails
