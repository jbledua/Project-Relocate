import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { supabase } from '../lib/supabaseClient'

const initialForm = {
  boxNumber: '',
  room: '',
  label: '',
  notes: '',
  contentsText: '',
  tagsText: '',
}

function BoxForm({ onCreated }) {
  const [formData, setFormData] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!formData.boxNumber.trim()) {
      setError('Box number is required.')
      return
    }

    setIsSubmitting(true)

    try {
      const { data: newBox, error: boxError } = await supabase
        .from('boxes')
        .insert({
          box_number: formData.boxNumber.trim(),
          room: formData.room.trim() || null,
          label: formData.label.trim() || null,
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

      const tags = [...new Set(
        formData.tagsText
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      )]

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

        <TextField
          id="room"
          label="Room"
          value={formData.room}
          onChange={handleChange('room')}
          placeholder="Main bedroom"
          fullWidth
          size="small"
        />

        <TextField
          id="label"
          label="Label"
          value={formData.label}
          onChange={handleChange('label')}
          placeholder="Winter clothing"
          fullWidth
          size="small"
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

        <TextField
          id="tags"
          label="Tags (comma separated)"
          value={formData.tagsText}
          onChange={handleChange('tagsText')}
          placeholder="fragile, heavy, do not stack"
          helperText="Examples: fragile, heavy, do not stack"
          fullWidth
          size="small"
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
