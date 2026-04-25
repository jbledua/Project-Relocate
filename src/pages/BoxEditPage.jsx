import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import BoxForm from '../components/BoxForm'
import { supabase } from '../lib/supabaseClient'

function BoxEditPage() {
  const navigate = useNavigate()
  const params = useParams()
  const boxId = params.boxId
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

  const handleSaved = () => {
    navigate(`/boxes/${boxId}`)
  }

  const handleDeleted = () => {
    navigate('/')
  }

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={20} />
          <Typography>Loading edit form...</Typography>
        </Stack>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Stack spacing={2}>
          <Alert severity="error">{error}</Alert>
          <Button component={RouterLink} to={`/boxes/${boxId}`} variant="outlined" sx={{ alignSelf: 'flex-start' }}>
            Back to details
          </Button>
        </Stack>
      </Container>
    )
  }

  if (!box) {
    return (
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Stack spacing={2}>
          <Typography>Box not found.</Typography>
          <Button component={RouterLink} to="/" variant="outlined" sx={{ alignSelf: 'flex-start' }}>
            Back to home
          </Button>
        </Stack>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Stack spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1">
          Edit box
        </Typography>
        <Typography color="text.secondary">
          Update the box details, contents, tags, or photo.
        </Typography>
      </Stack>

      <BoxForm
        mode="edit"
        boxId={box.id}
        initialValues={{
          boxNumber: box.box_number,
          room: box.room || '',
          notes: box.notes || '',
          photo_url: box.photo_url || '',
          owner_id: box.owner_id || '',
          group_id: box.group_id || '',
          contents: items.map((item) => item.content),
          tags,
        }}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        onCancel={() => navigate(`/boxes/${boxId}`)}
      />
    </Container>
  )
}

export default BoxEditPage
