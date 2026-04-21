import { useCallback, useEffect, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Fab from '@mui/material/Fab'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import InputAdornment from '@mui/material/InputAdornment'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useNavigate } from 'react-router-dom'
import BoxCard from '../components/BoxCard'
import BoxForm from '../components/BoxForm'
import BoxDetails from './BoxDetails'
import { supabase } from '../lib/supabaseClient'

function Home({ user, onSignOut }) {
  const isDesktop = useMediaQuery('(min-width:900px)')
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterInsert, setFilterInsert] = useState('')
  const [boxes, setBoxes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedBoxId, setSelectedBoxId] = useState('')
  const [editPayload, setEditPayload] = useState(null)
  const [authError, setAuthError] = useState('')
  const [accountMenuAnchor, setAccountMenuAnchor] = useState(null)

  const accountDisplayName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Unknown account'
  const accountInitial = String(accountDisplayName).trim().charAt(0).toUpperCase() || 'A'

  const handleSignOutClick = async () => {
    setAuthError('')

    if (!onSignOut) {
      return
    }

    try {
      await onSignOut()
    } catch (signOutError) {
      setAuthError(signOutError.message || 'Could not sign out.')
    }
  }

  const handleOpenAccountMenu = (event) => {
    setAccountMenuAnchor(event.currentTarget)
  }

  const handleCloseAccountMenu = () => {
    setAccountMenuAnchor(null)
  }

  const handleSignOutFromMenu = async () => {
    handleCloseAccountMenu()
    await handleSignOutClick()
  }

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

  const handleOpenDetails = (boxId) => {
    if (isDesktop) {
      setSelectedBoxId(boxId)
      return
    }

    navigate(`/boxes/${boxId}`)
  }

  const handleCloseDetails = () => {
    setSelectedBoxId('')
  }

  const handleOpenEdit = (payload) => {
    setEditPayload(payload)
    setSelectedBoxId('')
  }

  const handleCloseEdit = () => {
    setEditPayload(null)
  }

  const handleBoxCreated = async () => {
    await fetchBoxes()
    handleCloseForm()
  }

  const handleBoxUpdated = async () => {
    await fetchBoxes()
    handleCloseEdit()
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setFilterInsert('')
  }

  const applyFilterPrefix = (prefix) => {
    const trimmed = searchTerm.trim()

    if (!trimmed) {
      setSearchTerm(`${prefix}:`)
      return
    }

    if (trimmed.endsWith(':')) {
      setSearchTerm(`${trimmed} `)
      return
    }

    setSearchTerm(`${trimmed} ${prefix}:`)
  }

  const parseSearchQuery = (rawSearch) => {
    const normalized = rawSearch.trim()

    if (!normalized) {
      return { filters: [], freeText: '' }
    }

    const prefixMap = {
      box: 'box_number',
      box_number: 'box_number',
      room: 'room',
      label: 'label',
      content: 'content',
      tag: 'tag',
    }

    const tokenRegex = /\b(box|box_number|room|label|content|tag)\s*:\s*("[^"]+"|\S+)/gi
    const filters = []
    const tokenMatches = [...normalized.matchAll(tokenRegex)]

    tokenMatches.forEach((match) => {
      const rawKey = (match[1] || '').toLowerCase()
      const mappedType = prefixMap[rawKey]
      const rawValue = (match[2] || '').trim()
      const unquotedValue = rawValue.replace(/^"|"$/g, '').trim()

      if (!mappedType || !unquotedValue) {
        return
      }

      filters.push({ type: mappedType, term: unquotedValue })
    })

    const freeText = normalized.replace(tokenRegex, '').replace(/\s+/g, ' ').trim()

    return { filters, freeText }
  }

  const queryBoxIdsByFilter = async (type, term) => {
    if (type === 'content') {
      const { data, error: itemError } = await supabase
        .from('box_items')
        .select('box_id')
        .ilike('content', `%${term}%`)

      if (itemError) {
        throw itemError
      }

      return [...new Set((data || []).map((row) => row.box_id))]
    }

    if (type === 'tag') {
      const { data, error: tagError } = await supabase
        .from('box_tags')
        .select('box_id')
        .ilike('tag', `%${term}%`)

      if (tagError) {
        throw tagError
      }

      return [...new Set((data || []).map((row) => row.box_id))]
    }

    const { data, error: boxError } = await supabase
      .from('boxes')
      .select('id')
      .ilike(type, `%${term}%`)

    if (boxError) {
      throw boxError
    }

    return [...new Set((data || []).map((row) => row.id))]
  }

  const queryBoxIdsByFreeText = async (term) => {
    const combinedById = new Set()

    const { data: boxNumberMatches, error: boxNumberError } = await supabase
      .from('boxes')
      .select('id')
      .ilike('box_number', `%${term}%`)

    if (boxNumberError) {
      throw boxNumberError
    }

    const { data: roomMatches, error: roomError } = await supabase
      .from('boxes')
      .select('id')
      .ilike('room', `%${term}%`)

    if (roomError) {
      throw roomError
    }

    const { data: labelMatches, error: labelError } = await supabase
      .from('boxes')
      .select('id')
      .ilike('label', `%${term}%`)

    if (labelError) {
      throw labelError
    }

    ;[...(boxNumberMatches || []), ...(roomMatches || []), ...(labelMatches || [])].forEach((row) => {
      combinedById.add(row.id)
    })

    const { data: matchedItems, error: itemError } = await supabase
      .from('box_items')
      .select('box_id')
      .ilike('content', `%${term}%`)

    if (itemError) {
      throw itemError
    }

    const { data: matchedTags, error: tagError } = await supabase
      .from('box_tags')
      .select('box_id')
      .ilike('tag', `%${term}%`)

    if (tagError) {
      throw tagError
    }

    ;[...(matchedItems || []), ...(matchedTags || [])].forEach((row) => {
      combinedById.add(row.box_id)
    })

    return [...combinedById]
  }

  const fetchBoxes = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const { filters, freeText } = parseSearchQuery(searchTerm)
      const hasQuery = filters.length > 0 || Boolean(freeText)

      if (!hasQuery) {
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

      let candidateIds = null

      for (const filter of filters) {
        const filterIds = await queryBoxIdsByFilter(filter.type, filter.term)
        const nextSet = new Set(filterIds)

        if (candidateIds === null) {
          candidateIds = nextSet
        } else {
          candidateIds = new Set([...candidateIds].filter((id) => nextSet.has(id)))
        }

        if (candidateIds.size === 0) {
          setBoxes([])
          return
        }
      }

      if (freeText) {
        const freeTextIds = await queryBoxIdsByFreeText(freeText)
        const freeTextSet = new Set(freeTextIds)

        if (candidateIds === null) {
          candidateIds = freeTextSet
        } else {
          candidateIds = new Set([...candidateIds].filter((id) => freeTextSet.has(id)))
        }
      }

      const finalIds = [...(candidateIds || [])]
      if (finalIds.length === 0) {
        setBoxes([])
        return
      }

      const { data: matchedBoxes, error: matchedBoxError } = await supabase
        .from('boxes')
        .select('*')
        .in('id', finalIds)
        .order('box_number', { ascending: true })

      if (matchedBoxError) {
        throw matchedBoxError
      }

      const boxesWithTags = await attachTagsToBoxes(matchedBoxes || [])
      setBoxes(boxesWithTags)
    } catch (fetchError) {
      setError(fetchError.message || 'Could not load boxes.')
      setBoxes([])
    } finally {
      setLoading(false)
    }
  }, [attachTagsToBoxes, searchTerm])

  useEffect(() => {
    fetchBoxes()
  }, [fetchBoxes])

  return (
    <>
      <AppBar position="sticky" color="primary" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ minHeight: { xs: 64, sm: 72 } }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h1" sx={{ lineHeight: 1.2 }}>
              Relocate
            </Typography>
          </Box>

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
            <MenuItem onClick={handleSignOutFromMenu}>Sign out</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack spacing={2}>
        {authError ? <Alert severity="error">{authError}</Alert> : null}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Search boxes
          </Typography>
          <Grid container spacing={1.5}>

            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                id="search-term"
                label="Search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by room, tag, or content"
                fullWidth
                size="small"
                slotProps={{
                  input: {
                    endAdornment: searchTerm ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          aria-label="Clear all filters"
                          onClick={clearAllFilters}
                          edge="end"
                        >
                          x
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  },
                }}
              />
            </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="add-filter-label">Filters</InputLabel>
                <Select
                  labelId="add-filter-label"
                  id="add-filter"
                  value={filterInsert}
                  label="Filters"
                  onChange={(event) => {
                    const selected = event.target.value
                    if (selected) {
                      applyFilterPrefix(selected)
                    }
                    setFilterInsert('')
                  }}
                >
                  <MenuItem value="box">Box number</MenuItem>
                  <MenuItem value="room">Room</MenuItem>
                  <MenuItem value="label">Label</MenuItem>
                  <MenuItem value="content">Content</MenuItem>
                  <MenuItem value="tag">Tag</MenuItem>
                </Select>
              </FormControl>
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
                  <BoxCard box={box} onClick={() => handleOpenDetails(box.id)} />
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
          <AddIcon />
        </Fab>

        <Dialog open={isFormOpen} onClose={handleCloseForm} fullWidth maxWidth="sm">
          <DialogTitle>Add a box</DialogTitle>
          <DialogContent>
            <BoxForm onCreated={handleBoxCreated} />
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(selectedBoxId)}
          onClose={handleCloseDetails}
          fullWidth
          maxWidth="sm"
          scroll="paper"
        >
          <DialogContent>
            {selectedBoxId ? (
              <BoxDetails
                boxId={selectedBoxId}
                onClose={handleCloseDetails}
                onEdit={handleOpenEdit}
                hideBackLink
              />
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(editPayload)} onClose={handleCloseEdit} fullWidth maxWidth="sm" scroll="paper">
          <DialogTitle>Edit box</DialogTitle>
          <DialogContent>
            {editPayload ? (
              <BoxForm
                mode="edit"
                boxId={editPayload.box.id}
                initialValues={{
                  boxNumber: editPayload.box.box_number,
                  room: editPayload.box.room || '',
                  notes: editPayload.box.notes || '',
                  photo_url: editPayload.box.photo_url || '',
                  contents: (editPayload.items || []).map((item) => item.content),
                  tags: editPayload.tags || [],
                }}
                onSaved={handleBoxUpdated}
                onCancel={handleCloseEdit}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </Stack>
      </Container>
    </>
  )
}

export default Home
