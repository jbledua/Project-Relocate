import { useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const BACKUP_VERSION = 1

const getBackupFilename = () => {
  const timestamp = new Date().toISOString().replace(/[.:]/g, '-').replace('T', '_').slice(0, 19)
  return `relocate-backup-${timestamp}.json`
}

const downloadJsonFile = (filename, payload) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const normalizeBackupRows = (rows, fieldList) => {
  if (!Array.isArray(rows)) {
    return []
  }

  return rows.map((row) => {
    const normalized = {}

    fieldList.forEach((field) => {
      normalized[field] = row?.[field] ?? null
    })

    return normalized
  })
}

function SettingsPage() {
  const [busyAction, setBusyAction] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isBusy = useMemo(() => Boolean(busyAction), [busyAction])

  const readBackupFile = async (file) => {
    const fileText = await file.text()
    let parsed

    try {
      parsed = JSON.parse(fileText)
    } catch {
      throw new Error('Backup file is not valid JSON.')
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Backup file is not valid.')
    }

    if (!parsed.data || typeof parsed.data !== 'object') {
      throw new Error('Backup file is missing data payload.')
    }

    return parsed
  }

  const assignCurrentUserToUnownedBoxes = async () => {
    setBusyAction('assign-owner')
    setError('')
    setSuccess('')

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      const userId = userData?.user?.id
      if (!userId) {
        throw new Error('No signed-in user was found.')
      }

      const { data: updatedBoxes, error: updateError } = await supabase
        .from('boxes')
        .update({ owner_id: userId })
        .is('owner_id', null)
        .select('id')

      if (updateError) {
        throw updateError
      }

      setSuccess(`Assigned owner to ${(updatedBoxes || []).length} unowned box${(updatedBoxes || []).length === 1 ? '' : 'es'}.`)
    } catch (ownerError) {
      setError(ownerError.message || 'Could not assign owners to boxes.')
    } finally {
      setBusyAction('')
    }
  }

  const createBackup = async () => {
    setBusyAction('create')
    setError('')
    setSuccess('')

    try {
      const { data: boxes, error: boxError } = await supabase
        .from('boxes')
        .select('id, box_number, room, label, notes, photo_url, owner_id, created_at')
        .order('box_number', { ascending: true })

      if (boxError) {
        throw boxError
      }

      const { data: boxItems, error: itemError } = await supabase
        .from('box_items')
        .select('id, box_id, content, created_at')
        .order('created_at', { ascending: true })

      if (itemError) {
        throw itemError
      }

      const { data: boxTags, error: tagError } = await supabase
        .from('box_tags')
        .select('id, box_id, tag, created_at')
        .order('created_at', { ascending: true })

      if (tagError) {
        throw tagError
      }

      const payload = {
        app: 'Project-Relocate',
        backupVersion: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
          boxes: boxes || [],
          box_items: boxItems || [],
          box_tags: boxTags || [],
        },
      }

      downloadJsonFile(getBackupFilename(), payload)
      setSuccess('Backup downloaded to your device.')
    } catch (backupError) {
      setError(backupError.message || 'Could not create backup.')
    } finally {
      setBusyAction('')
    }
  }

  const restoreBackup = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const confirmed = window.confirm(
      'Restore backup and replace all current boxes, items, and tags? This cannot be undone.',
    )

    if (!confirmed) {
      return
    }

    setBusyAction('restore')
    setError('')
    setSuccess('')

    try {
      const parsedBackup = await readBackupFile(file)

      const normalizedBoxes = normalizeBackupRows(parsedBackup.data.boxes, [
        'id',
        'box_number',
        'room',
        'label',
        'notes',
        'photo_url',
        'owner_id',
        'created_at',
      ]).filter((row) => row.id && row.box_number)

      const boxIds = new Set(normalizedBoxes.map((row) => row.id))

      const normalizedItems = normalizeBackupRows(parsedBackup.data.box_items, [
        'id',
        'box_id',
        'content',
        'created_at',
      ]).filter((row) => row.id && row.box_id && row.content && boxIds.has(row.box_id))

      const normalizedTagsRaw = normalizeBackupRows(parsedBackup.data.box_tags, [
        'id',
        'box_id',
        'tag',
        'created_at',
      ]).filter((row) => row.id && row.box_id && row.tag && boxIds.has(row.box_id))

      const tagDedupKey = new Set()
      const normalizedTags = normalizedTagsRaw.filter((row) => {
        const key = `${row.box_id}__${String(row.tag).toLowerCase()}`
        if (tagDedupKey.has(key)) {
          return false
        }
        tagDedupKey.add(key)
        return true
      })

      const { data: existingBoxes, error: existingBoxesError } = await supabase
        .from('boxes')
        .select('id')

      if (existingBoxesError) {
        throw existingBoxesError
      }

      const existingIds = (existingBoxes || []).map((row) => row.id)

      if (existingIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('boxes')
          .delete()
          .in('id', existingIds)

        if (deleteError) {
          throw deleteError
        }
      }

      if (normalizedBoxes.length > 0) {
        const { error: insertBoxesError } = await supabase
          .from('boxes')
          .insert(normalizedBoxes)

        if (insertBoxesError) {
          throw insertBoxesError
        }
      }

      if (normalizedItems.length > 0) {
        const { error: insertItemsError } = await supabase
          .from('box_items')
          .insert(normalizedItems)

        if (insertItemsError) {
          throw insertItemsError
        }
      }

      if (normalizedTags.length > 0) {
        const { error: insertTagsError } = await supabase
          .from('box_tags')
          .insert(normalizedTags)

        if (insertTagsError) {
          throw insertTagsError
        }
      }

      setSuccess('Backup restored successfully. Return to home to see refreshed data.')
    } catch (restoreError) {
      setError(restoreError.message || 'Could not restore backup.')
    } finally {
      setBusyAction('')
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.25}>
            <Typography variant="h5" component="h1">
              Settings
            </Typography>
            <Typography color="text.secondary">
              Create a local backup file or restore your boxes from a previous backup.
            </Typography>
          </Stack>
        </Paper>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="h6" component="h2">
                Data backup
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Backup includes boxes, box items, and tags. Uploaded photos are not copied into the backup file.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="contained"
                onClick={createBackup}
                disabled={isBusy}
                startIcon={busyAction === 'create' ? <CircularProgress color="inherit" size={16} /> : null}
              >
                Create backup file
              </Button>

              <Button
                component="label"
                variant="outlined"
                disabled={isBusy}
                startIcon={busyAction === 'restore' ? <CircularProgress color="inherit" size={16} /> : null}
              >
                Restore from file
                <input
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={restoreBackup}
                />
              </Button>
            </Stack>

            <Button
              variant="text"
              onClick={assignCurrentUserToUnownedBoxes}
              disabled={isBusy}
              sx={{ alignSelf: 'flex-start' }}
            >
              Assign me to unowned boxes
            </Button>

            <Typography variant="caption" color="text.secondary">
              Restoring a backup replaces all current boxes, items, and tags. The owner assignment action only fills in missing owners.
            </Typography>
          </Stack>
        </Paper>

        <Box>
          <Button component={RouterLink} to="/" variant="text">
            Back to home
          </Button>
        </Box>
      </Stack>
    </Container>
  )
}

export default SettingsPage
