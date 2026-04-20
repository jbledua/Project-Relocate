import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
    return <p>Loading box details...</p>
  }

  if (error) {
    return (
      <section className="panel">
        <p className="error">{error}</p>
        <Link to="/">Back to home</Link>
      </section>
    )
  }

  if (!box) {
    return (
      <section className="panel">
        <p>Box not found.</p>
        <Link to="/">Back to home</Link>
      </section>
    )
  }

  return (
    <section className="panel details-page">
      <Link to="/">← Back to home</Link>
      <h1>{box.box_number}</h1>

      <p>
        <strong>Room:</strong> {box.room || 'N/A'}
      </p>
      <p>
        <strong>Label:</strong> {box.label || 'N/A'}
      </p>
      <p>
        <strong>Notes:</strong> {box.notes || 'No notes'}
      </p>

      {box.photo_url ? (
        <img src={box.photo_url} alt={`${box.box_number} reference`} className="box-photo" />
      ) : (
        <p>No photo uploaded yet.</p>
      )}

      <h2>Contents</h2>
      {items.length === 0 ? (
        <p>No contents listed.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>{item.content}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default BoxDetails
