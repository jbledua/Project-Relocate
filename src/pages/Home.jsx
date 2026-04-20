import { useCallback, useEffect, useState } from 'react'
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

        setBoxes(data || [])
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
        setBoxes(boxResults.filter((box) => contentIds.has(box.id)))
      } else {
        setBoxes(boxResults || contentResults || [])
      }
    } catch (fetchError) {
      setError(fetchError.message || 'Could not load boxes.')
      setBoxes([])
    } finally {
      setLoading(false)
    }
  }, [boxSearch, contentSearch])

  useEffect(() => {
    fetchBoxes()
  }, [fetchBoxes])

  return (
    <main className="app-layout">
      <header>
        <h1>Project-Relocate</h1>
        <p>Track boxes, contents, and notes while moving.</p>
      </header>

      <BoxForm onCreated={fetchBoxes} />

      <section className="panel">
        <h2>Search boxes</h2>
        <div className="search-grid">
          <BoxSearch value={boxSearch} onChange={setBoxSearch} />
          <ContentSearch value={contentSearch} onChange={setContentSearch} />
        </div>
      </section>

      <section className="panel">
        <h2>Results</h2>
        {loading ? <p>Loading boxes...</p> : null}
        {error ? <p className="error">{error}</p> : null}

        {!loading && !error && boxes.length === 0 ? <p>No boxes found.</p> : null}

        {!loading && !error && boxes.length > 0 ? (
          <div className="box-grid">
            {boxes.map((box) => (
              <BoxCard key={box.id} box={box} />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default Home
