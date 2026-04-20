import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Fab from '@mui/material/Fab'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import BoxCard from '../components/BoxCard'
import BoxForm from '../components/BoxForm'
import BoxSearch from '../components/BoxSearch'
import ContentSearch from '../components/ContentSearch'
import { supabase } from '../lib/supabaseClient'

function Home() {
  const [boxSearch, setBoxSearch] = useState('')
  const [contentSearch, setContentSearch] = useState('')
  const [boxes, setBoxes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)

  const attachTagsToBoxes = useCallback(async (boxList) => {
    if (!boxList || boxList.length === 0) {
      return []
    }

    const boxIds = boxList.map((box) => box.id)
    const { data: tagRows, error: tagError } = await supabase
      .from('box_tags')
      .select('box_id, tag')
      .in('box_id', boxIds)

    if (tagError) {
      throw tagError
    }

    const tagsByBoxId = (tagRows || []).reduce((acc, row) => {
      if (!acc[row.box_id]) {
        acc[row.box_id] = []
      }
      acc[row.box_id].push(row.tag)
      return acc
    }, {})

    return boxList.map((box) => ({
      ...box,
      tags: tagsByBoxId[box.id] || [],
    }))
  }, [])

  const handleOpenForm = () => {
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
  }

  const handleBoxCreated = async () => {
    await fetchBoxes()
    handleCloseForm()
  }

  const fetchBoxes = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const boxTerm = boxSearch.trim()
      const contentTerm = contentSearch.trim()

      if (!boxTerm && !contentTerm) {
        const { data, error: listError } = await supabase
          .from('boxes')
          .select('*')
          .order('box_number', { ascending: true })

        if (listError) {
          throw listError
        }

        const boxesWithTags = await attachTagsToBoxes(data || [])
        setBoxes(boxesWithTags)
        return
      }

      let boxResults = null
      if (boxTerm) {
        const { data, error: boxError } = await supabase
          .from('boxes')
          .select('*')
          .ilike('box_number', `%${boxTerm}%`)
          .order('box_number', { ascending: true })

        if (boxError) {
          throw boxError
        }

        boxResults = data || []
      }

      let contentResults = null
      if (contentTerm) {
        const { data: matchedItems, error: itemError } = await supabase
          .from('box_items')
          .select('box_id')
          .ilike('content', `%${contentTerm}%`)

        if (itemError) {
          throw itemError
        }

        const uniqueBoxIds = [...new Set((matchedItems || []).map((item) => item.box_id))]

        if (uniqueBoxIds.length === 0) {
          contentResults = []
        } else {
          const { data: matchedBoxes, error: matchedBoxError } = await supabase
            .from('boxes')
            .select('*')
            .in('id', uniqueBoxIds)
            .order('box_number', { ascending: true })

          if (matchedBoxError) {
            throw matchedBoxError
          }

          contentResults = matchedBoxes || []
        }
      }

      if (boxResults && contentResults) {
        const contentIds = new Set(contentResults.map((box) => box.id))
        const combinedResults = boxResults.filter((box) => contentIds.has(box.id))
        const boxesWithTags = await attachTagsToBoxes(combinedResults)
        setBoxes(boxesWithTags)
      } else {
        const finalResults = boxResults || contentResults || []
        const boxesWithTags = await attachTagsToBoxes(finalResults)
        setBoxes(boxesWithTags)
      }
    } catch (fetchError) {
      setError(fetchError.message || 'Could not load boxes.')
      setBoxes([])
    } finally {
      setLoading(false)
    }
  }, [attachTagsToBoxes, boxSearch, contentSearch])

  useEffect(() => {
    fetchBoxes()
  }, [fetchBoxes])

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Project-Relocate
          </Typography>
          <Typography color="text.secondary">
            Track boxes, contents, and notes while moving.
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Search boxes
          </Typography>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <BoxSearch value={boxSearch} onChange={setBoxSearch} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <ContentSearch value={contentSearch} onChange={setContentSearch} />
            </Grid>
          </Grid>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Results
          </Typography>

          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={20} />
              <Typography>Loading boxes...</Typography>
            </Stack>
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}

          {!loading && !error && boxes.length === 0 ? (
            <Typography color="text.secondary">No boxes found.</Typography>
          ) : null}

          {!loading && !error && boxes.length > 0 ? (
            <Grid container spacing={1.5}>
              {boxes.map((box) => (
                <Grid key={box.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <BoxCard box={box} />
                </Grid>
              ))}
            </Grid>
          ) : null}
        </Paper>

        <Fab
          color="primary"
          aria-label="add box"
          onClick={handleOpenForm}
          sx={{ position: 'fixed', right: 24, bottom: 24 }}
        >
          +
        </Fab>

        <Dialog open={isFormOpen} onClose={handleCloseForm} fullWidth maxWidth="sm">
          <DialogTitle>Add a box</DialogTitle>
          <DialogContent>
            <BoxForm onCreated={handleBoxCreated} />
          </DialogContent>
        </Dialog>
      </Stack>
    </Container>
  )
}

export default Home
