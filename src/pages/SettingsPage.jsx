import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
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
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileUserId, setProfileUserId] = useState('')
  const [profileForm, setProfileForm] = useState({
    email: '',
    displayName: '',
    avatarUrl: '',
  })

  const isBusy = useMemo(() => Boolean(busyAction), [busyAction])

  useEffect(() => {
    let isActive = true

    const loadProfile = async () => {
      setProfileLoading(true)

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) {
        if (isActive) {
          setError(userError.message || 'Could not load profile.')
          setProfileLoading(false)
        }
        return
      }

      const user = userData?.user
      if (!user) {
        if (isActive) {
          setProfileLoading(false)
        }
        return
      }

      setProfileUserId(user.id)

      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        if (isActive) {
          setError(profileError.message || 'Could not load profile.')
          setProfileLoading(false)
        }
        return
      }

      const nextProfile = {
        email: profileRow?.email || user.email || '',
        displayName: profileRow?.display_name || '',
        avatarUrl: profileRow?.avatar_url || '',
      }

      if (!profileRow) {
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email || null,
          display_name: null,
          avatar_url: null,
        })

        if (insertError && insertError.code !== '23505') {
          if (isActive) {
            setError(insertError.message || 'Could not initialize profile.')
          }
        }
      }

      if (isActive) {
        setProfileForm(nextProfile)
        setProfileLoading(false)
      }
    }

    loadProfile()

    return () => {
      isActive = false
    }
  }, [])

  const handleProfileFieldChange = (field) => (event) => {
    setProfileForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleProfileSave = async () => {
    if (!profileUserId) {
      setError('Could not determine current profile user.')
      return
    }

    setBusyAction('profile-save')
    setError('')
    setSuccess('')

    try {
      const { error: saveError } = await supabase
        .from('profiles')
        .upsert({
          id: profileUserId,
          email: profileForm.email.trim() || null,
          display_name: profileForm.displayName.trim() || null,
          avatar_url: profileForm.avatarUrl.trim() || null,
        })

      if (saveError) {
        throw saveError
      }

      setSuccess('Profile updated.')
    } catch (profileError) {
      setError(profileError.message || 'Could not save profile.')
    } finally {
      setBusyAction('')
    }
  }

  const handleProfilePhotoSelected = async (event) => {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''

    if (!selectedFile) {
      return
    }

    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file for profile picture.')
      return
    }

    if (!profileUserId) {
      setError('Could not determine current profile user.')
      return
    }

    setBusyAction('profile-photo')
    setError('')
    setSuccess('')

    try {
      const originalExtension = (selectedFile.name.split('.').pop() || 'jpg').toLowerCase()
      const fileExtension = originalExtension.replace(/[^a-z0-9]/g, '') || 'jpg'
      const filePath = `${profileUserId}/${Date.now()}.${fileExtension}`

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, selectedFile, { upsert: true })

      if (uploadError) {
        throw new Error(`Profile photo upload failed: ${uploadError.message}`)
      }

      const { data: publicData } = supabase.storage.from('profile-photos').getPublicUrl(filePath)
      setProfileForm((prev) => ({ ...prev, avatarUrl: publicData.publicUrl }))
      setSuccess('Profile photo uploaded. Save profile to apply.')
    } catch (photoError) {
      setError(photoError.message || 'Could not upload profile photo.')
    } finally {
      setBusyAction('')
    }
  }

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
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      const userId = userData?.user?.id
      if (!userId) {
        throw new Error('No signed-in user was found.')
      }

      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, name, owner_id, join_code, created_at')
        .eq('owner_id', userId)
        .order('created_at', { ascending: true })

      if (groupsError) {
        throw groupsError
      }

      const ownedGroupIds = (groupsData || []).map((row) => row.id)

      const { data: boxes, error: boxError } = ownedGroupIds.length > 0
        ? await supabase
          .from('boxes')
          .select('id, box_number, room, label, notes, photo_url, owner_id, group_id, created_at')
          .in('group_id', ownedGroupIds)
          .order('box_number', { ascending: true })
        : { data: [], error: null }

      if (boxError) {
        throw boxError
      }

      const boxIds = (boxes || []).map((row) => row.id)

      const { data: boxItems, error: itemError } = boxIds.length > 0
        ? await supabase
          .from('box_items')
          .select('id, box_id, content, created_at')
          .in('box_id', boxIds)
          .order('created_at', { ascending: true })
        : { data: [], error: null }

      if (itemError) {
        throw itemError
      }

      const { data: boxTags, error: tagError } = boxIds.length > 0
        ? await supabase
          .from('box_tags')
          .select('id, box_id, tag, created_at')
          .in('box_id', boxIds)
          .order('created_at', { ascending: true })
        : { data: [], error: null }

      if (tagError) {
        throw tagError
      }

      const { data: groupMembers, error: membersError } = ownedGroupIds.length > 0
        ? await supabase
          .from('group_members')
          .select('id, group_id, user_id, email, role, invited_by, created_at')
          .in('group_id', ownedGroupIds)
          .order('created_at', { ascending: true })
        : { data: [], error: null }

      if (membersError) {
        throw membersError
      }

      const memberUserIds = [...new Set((groupMembers || []).map((row) => row.user_id).filter(Boolean))]

      const { data: profilesData, error: profilesError } = memberUserIds.length > 0
        ? await supabase
          .from('profiles')
          .select('id, email, display_name, avatar_url, created_at, updated_at')
          .in('id', memberUserIds)
        : { data: [], error: null }

      if (profilesError) {
        throw profilesError
      }

      const payload = {
        app: 'Project-Relocate',
        backupVersion: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
          boxes: boxes || [],
          box_items: boxItems || [],
          box_tags: boxTags || [],
          groups: groupsData || [],
          group_members: groupMembers || [],
          profiles: profilesData || [],
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
      'Restore backup and replace all current boxes, groups, memberships, items, and tags? This cannot be undone.',
    )

    if (!confirmed) {
      return
    }

    setBusyAction('restore')
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

      const parsedBackup = await readBackupFile(file)

      const normalizedGroups = normalizeBackupRows(parsedBackup.data.groups, [
        'id',
        'name',
        'owner_id',
        'join_code',
        'created_at',
      ]).filter((row) => row.id && row.name && row.owner_id === userId)

      const groupIds = new Set(normalizedGroups.map((row) => row.id))

      const normalizedBoxes = normalizeBackupRows(parsedBackup.data.boxes, [
        'id',
        'box_number',
        'room',
        'label',
        'notes',
        'photo_url',
        'owner_id',
        'group_id',
        'created_at',
      ]).filter((row) => row.id && row.box_number && row.group_id && groupIds.has(row.group_id))

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

      const { data: existingOwnedGroups, error: existingOwnedGroupsError } = await supabase
        .from('groups')
        .select('id')
        .eq('owner_id', userId)

      if (existingOwnedGroupsError) {
        throw existingOwnedGroupsError
      }

      const existingOwnedGroupIds = (existingOwnedGroups || []).map((row) => row.id)

      const { data: existingBoxes, error: existingBoxesError } = existingOwnedGroupIds.length > 0
        ? await supabase
          .from('boxes')
          .select('id')
          .in('group_id', existingOwnedGroupIds)
        : { data: [], error: null }

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

      if (existingOwnedGroupIds.length > 0) {
        const { error: deleteGroupsError } = await supabase
          .from('groups')
          .delete()
          .in('id', existingOwnedGroupIds)

        if (deleteGroupsError) {
          throw deleteGroupsError
        }
      }

      const normalizedProfiles = normalizeBackupRows(parsedBackup.data.profiles, [
        'id',
        'email',
        'display_name',
        'avatar_url',
        'created_at',
        'updated_at',
      ]).filter((row) => row.id)

      if (normalizedGroups.length > 0) {
        const { error: insertGroupsError } = await supabase
          .from('groups')
          .insert(normalizedGroups)

        if (insertGroupsError) {
          throw insertGroupsError
        }
      }

      const normalizedGroupMembers = normalizeBackupRows(parsedBackup.data.group_members, [
        'id',
        'group_id',
        'user_id',
        'email',
        'role',
        'invited_by',
        'created_at',
      ]).filter((row) => row.id && row.group_id && row.user_id && groupIds.has(row.group_id))

      if (normalizedGroupMembers.length > 0) {
        const { error: insertMembersError } = await supabase
          .from('group_members')
          .insert(normalizedGroupMembers)

        if (insertMembersError) {
          throw insertMembersError
        }
      }

      if (normalizedProfiles.length > 0) {
        const { error: upsertProfilesError } = await supabase
          .from('profiles')
          .upsert(normalizedProfiles)

        if (upsertProfilesError) {
          throw upsertProfilesError
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

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="h6" component="h2">
                Profile
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Update your display name and profile picture used in group member lists.
              </Typography>
            </Box>

            {profileLoading ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <CircularProgress size={16} />
                <Typography variant="body2">Loading profile...</Typography>
              </Stack>
            ) : (
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Avatar src={profileForm.avatarUrl || undefined} sx={{ width: 56, height: 56 }}>
                    {String(profileForm.displayName || profileForm.email || 'U').trim().charAt(0).toUpperCase()}
                  </Avatar>
                  <Button
                    component="label"
                    variant="outlined"
                    disabled={isBusy}
                    startIcon={busyAction === 'profile-photo' ? <CircularProgress color="inherit" size={16} /> : null}
                  >
                    Upload photo
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleProfilePhotoSelected}
                    />
                  </Button>
                </Stack>

                <TextField
                  label="Email"
                  value={profileForm.email}
                  onChange={handleProfileFieldChange('email')}
                  size="small"
                  fullWidth
                  disabled
                />

                <TextField
                  label="Display name"
                  value={profileForm.displayName}
                  onChange={handleProfileFieldChange('displayName')}
                  placeholder="How your name appears to others"
                  size="small"
                  fullWidth
                />

                <TextField
                  label="Profile photo URL"
                  value={profileForm.avatarUrl}
                  onChange={handleProfileFieldChange('avatarUrl')}
                  placeholder="https://..."
                  size="small"
                  fullWidth
                />

                <Button
                  variant="contained"
                  onClick={handleProfileSave}
                  disabled={isBusy}
                  sx={{ alignSelf: 'flex-start' }}
                  startIcon={busyAction === 'profile-save' ? <CircularProgress color="inherit" size={16} /> : null}
                >
                  Save profile
                </Button>
              </Stack>
            )}
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
                Backup and restore are limited to groups you own and their related members, boxes, items, and tags. Uploaded photos are not copied into the backup file.
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
              Restoring a backup replaces only your owned groups and their related boxes, items, and tags. The owner assignment action only fills in missing owners.
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
