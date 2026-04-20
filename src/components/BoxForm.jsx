import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const initialForm = {
  boxNumber: '',
  room: '',
  label: '',
  notes: '',
  contentsText: '',
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

      setFormData(initialForm)
      onCreated()
    } catch (submitError) {
      setError(submitError.message || 'Could not create box.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="panel">
      <h2>Add box</h2>
      <form onSubmit={handleSubmit} className="box-form">
        <div className="input-group">
          <label htmlFor="box-number">Box number</label>
          <input
            id="box-number"
            value={formData.boxNumber}
            onChange={handleChange('boxNumber')}
            placeholder="BX-001"
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="room">Room</label>
          <input
            id="room"
            value={formData.room}
            onChange={handleChange('room')}
            placeholder="Main bedroom"
          />
        </div>

        <div className="input-group">
          <label htmlFor="label">Label</label>
          <input
            id="label"
            value={formData.label}
            onChange={handleChange('label')}
            placeholder="Winter clothing"
          />
        </div>

        <div className="input-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={handleChange('notes')}
            rows={3}
            placeholder="Any handling notes"
          />
        </div>

        <div className="input-group">
          <label htmlFor="contents">Contents (comma separated)</label>
          <input
            id="contents"
            value={formData.contentsText}
            onChange={handleChange('contentsText')}
            placeholder="jacket, gloves, shoes"
          />
        </div>

        {error ? <p className="error">{error}</p> : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save box'}
        </button>
      </form>
    </section>
  )
}

export default BoxForm
