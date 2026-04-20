import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { supabase } from '../lib/supabaseClient'

const defaultTagOptions = ['fragile', 'heavy', 'do not stack']

const normalizeTagList = (tagList) => [...new Set(
  (tagList || [])
    .map((tag) => String(tag).trim().toLowerCase())
    .filter(Boolean),
)]

const initialForm = {
  boxNumber: '',
  room: '',
  notes: '',
  contentsText: '',
  tags: [],
}

function BoxForm({ onCreated }) {
  const [formData, setFormData] = useState(initialForm)
  const [roomOptions, setRoomOptions] = useState([])
  const [tagOptions, setTagOptions] = useState(defaultTagOptions)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    const fetchRoomOptions = async () => {
      const { data, error: roomError } = await supabase
        .from('boxes')
        .select('room')
        .not('room', 'is', null)

      if (roomError) {
        console.warn('Could not load room suggestions.', roomError.message)
        return
      }

      const uniqueRooms = [...new Set(
        (data || [])
          .map((row) => (row.room || '').trim())
          .filter(Boolean),
      )].sort((a, b) => a.localeCompare(b))

      if (isActive) {
        setRoomOptions(uniqueRooms)
      }
    }

    const fetchTagOptions = async () => {
      const { data, error: tagError } = await supabase
        .from('box_tags')
        .select('tag')
        .not('tag', 'is', null)

      if (tagError) {
        console.warn('Could not load tag suggestions.', tagError.message)
        return
      }

      const existingTags = normalizeTagList((data || []).map((row) => row.tag))
      const mergedTags = normalizeTagList([...defaultTagOptions, ...existingTags])

      if (isActive) {
        setTagOptions(mergedTags)
      }
    }

    fetchRoomOptions()
    fetchTagOptions()

    return () => {
      isActive = false
    }
  }, [])

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const normalizedBoxNumber = formData.boxNumber.trim()
    const normalizedRoom = formData.room.trim()

    if (!normalizedBoxNumber) {
      setError('Box number is required.')
      return
    }

    if (!normalizedRoom) {
      setError('Room is required.')
      return
    }

    setIsSubmitting(true)

    try {
      const derivedLabel = `${normalizedBoxNumber}-${normalizedRoom}`

      const { data: newBox, error: boxError } = await supabase
        .from('boxes')
        .insert({
          box_number: normalizedBoxNumber,
          room: normalizedRoom || null,
          label: derivedLabel,
          notes: formData.notes.trim() || null,
        })
        .select()
        .single()

      if (boxError) {
        throw boxError
      }

      const items = formData.contentsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

      if (items.length > 0) {
        const itemRows = items.map((content) => ({
          box_id: newBox.id,
          content,
        }))

        const { error: itemError } = await supabase.from('box_items').insert(itemRows)

        if (itemError) {
          throw itemError
        }
      }

      const tags = normalizeTagList(formData.tags)

      if (tags.length > 0) {
        const tagRows = tags.map((tag) => ({
          box_id: newBox.id,
          tag,
        }))

        const { error: tagError } = await supabase.from('box_tags').insert(tagRows)

        if (tagError) {
          throw tagError
        }
      }

      if (normalizedRoom) {
        setRoomOptions((prev) => {
          if (prev.includes(normalizedRoom)) {
            return prev
          }
          return [...prev, normalizedRoom].sort((a, b) => a.localeCompare(b))
        })
      }

      if (tags.length > 0) {
        setTagOptions((prev) => normalizeTagList([...defaultTagOptions, ...prev, ...tags]))
      }

      setFormData(initialForm)
      onCreated()
    } catch (submitError) {
      setError(submitError.message || 'Could not create box.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
        Add box
      </Typography>

      <Stack component="form" onSubmit={handleSubmit} spacing={1.5}>
        <TextField
          id="box-number"
          label="Box number"
          value={formData.boxNumber}
          onChange={handleChange('boxNumber')}
          placeholder="BX-001"
          required
          fullWidth
          size="small"
        />

        <Autocomplete
          freeSolo
          options={roomOptions}
          value={formData.room}
          onChange={(_, newValue) => {
            setFormData((prev) => ({ ...prev, room: newValue || '' }))
          }}
          onInputChange={(_, newInputValue, reason) => {
            if (reason === 'reset') {
              return
            }
            setFormData((prev) => ({ ...prev, room: newInputValue }))
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              id="room"
              label="Room"
              placeholder="Main bedroom"
              helperText="Type a new room or pick an existing one"
              fullWidth
              required
              size="small"
            />
          )}
        />

       

        <TextField
            id="contents"
            label="Contents (comma separated)"
            value={formData.contentsText}
            onChange={handleChange('contentsText')}
            rows={4}
            placeholder="jacket, gloves, shoes"
            fullWidth
            multiline
            size="small"
        />

        <Autocomplete
          multiple
          freeSolo
          options={tagOptions}
          value={formData.tags}
          onChange={(_, newValue) => {
            setFormData((prev) => ({ ...prev, tags: normalizeTagList(newValue) }))
          }}
          filterSelectedOptions
          renderInput={(params) => (
            <TextField
              {...params}
              id="tags"
              label="Tags"
              placeholder="Add a tag"
              helperText="Suggested: fragile, heavy, do not stack"
              fullWidth
              size="small"
            />
          )}
        />
        <TextField
            id="notes"
            label="Notes"
            value={formData.notes}
            onChange={handleChange('notes')}
            rows={2}
            placeholder="Any handling notes"
            fullWidth
            multiline
            size="small"
        />
        {error ? <Alert severity="error">{error}</Alert> : null}

        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save box'}
        </Button>
      </Stack>
    </Paper>
  )
}

export default BoxForm
