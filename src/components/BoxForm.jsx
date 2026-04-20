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

const buildFormData = (initialValues) => {
  if (!initialValues) {
    return initialForm
  }

  const normalizedContents = Array.isArray(initialValues.contents)
    ? initialValues.contents.join(', ')
    : initialValues.contentsText || ''

  return {
    boxNumber: initialValues.boxNumber || initialValues.box_number || '',
    room: initialValues.room || '',
    notes: initialValues.notes || '',
    contentsText: normalizedContents,
    tags: normalizeTagList(initialValues.tags || []),
  }
}

function BoxForm({ onCreated, onSaved, onCancel, mode = 'create', boxId, initialValues }) {
  const [formData, setFormData] = useState(initialForm)
  const [roomOptions, setRoomOptions] = useState([])
  const [tagOptions, setTagOptions] = useState(defaultTagOptions)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (mode === 'edit') {
      setFormData(buildFormData(initialValues))
    }
  }, [initialValues, mode])

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

      let savedBox = null

      if (mode === 'edit' && boxId) {
        const { data: updatedBox, error: boxError } = await supabase
          .from('boxes')
          .update({
            box_number: normalizedBoxNumber,
            room: normalizedRoom,
            label: derivedLabel,
            notes: formData.notes.trim() || null,
          })
          .eq('id', boxId)
          .select()
          .maybeSingle()

        if (boxError) {
          throw boxError
        }

        if (!updatedBox) {
          throw new Error('Could not update box. Check RLS update/delete policies in supabase/setup.sql.')
        }

        savedBox = updatedBox

        const { error: deleteItemsError } = await supabase.from('box_items').delete().eq('box_id', boxId)
        if (deleteItemsError) {
          throw deleteItemsError
        }

        const { error: deleteTagsError } = await supabase.from('box_tags').delete().eq('box_id', boxId)
        if (deleteTagsError) {
          throw deleteTagsError
        }
      } else {
        const { data: newBox, error: boxError } = await supabase
          .from('boxes')
          .insert({
            box_number: normalizedBoxNumber,
            room: normalizedRoom,
            label: derivedLabel,
            notes: formData.notes.trim() || null,
          })
          .select()
          .single()

        if (boxError) {
          throw boxError
        }

        savedBox = newBox
      }

      const targetBoxId = savedBox.id

      const items = formData.contentsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

      if (items.length > 0) {
        const itemRows = items.map((content) => ({
          box_id: targetBoxId,
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
          box_id: targetBoxId,
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

      if (mode !== 'edit') {
        setFormData(initialForm)
      }

      if (onSaved) {
        onSaved(savedBox)
      } else if (onCreated) {
        onCreated(savedBox)
      }
    } catch (submitError) {
      setError(submitError.message || 'Could not save box.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
        {mode === 'edit' ? 'Edit box' : 'Add box'}
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

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {onCancel ? (
            <Button type="button" variant="outlined" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          ) : null}

          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Save box'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}

export default BoxForm
