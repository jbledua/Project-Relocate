import { useCallback, useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import LoopIcon from '@mui/icons-material/Loop'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const generateJoinCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function GroupsPage({ session, activeGroupId, activeGroup, onSelectGroup }) {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [groupDetails, setGroupDetails] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createFormData, setCreateFormData] = useState({ name: '' })
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [joinDialogOpen, setJoinDialogOpen] = useState(false)
  const [joinFormData, setJoinFormData] = useState({ code: '' })
  const [joinSubmitting, setJoinSubmitting] = useState(false)

  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [selectedGroupOpen, setSelectedGroupOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState('')
  const [groupEditName, setGroupEditName] = useState('')
  const [groupEditSaving, setGroupEditSaving] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState('')

  const fetchGroups = useCallback(async () => {
    if (!session?.id) return

    setLoading(true)
    setError('')

    try {
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', session.id)

      if (memberError) {
        throw memberError
      }

      const groupIds = (memberData || []).map((row) => row.group_id)

      if (groupIds.length === 0) {
        setGroups([])
        setGroupDetails({})
        return
      }

      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('name', { ascending: true })

      if (groupsError) {
        throw groupsError
      }

      setGroups(groupsData || [])
    } catch (fetchError) {
      setError(fetchError.message || 'Could not load groups.')
    } finally {
      setLoading(false)
    }
  }, [session?.id])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const ownedGroups = useMemo(() => groups.filter((group) => group.owner_id === session?.id), [groups, session?.id])
  const joinedGroups = useMemo(() => groups.filter((group) => group.owner_id !== session?.id), [groups, session?.id])
  const currentGroup = activeGroup || groups.find((group) => group.id === activeGroupId) || null

  const handleOpenGroup = (group) => {
    if (!group) {
      return
    }

    onSelectGroup?.(group)
    navigate('/')
  }

  const fetchGroupDetails = useCallback(async (groupId) => {
    if (!groupId) return

    let members = []
    let boxes = []

    const { data: membersWithEmail, error: membersWithEmailError } = await supabase
      .from('group_members')
      .select('id, user_id, email, role, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })

    if (!membersWithEmailError) {
      members = membersWithEmail || []
    } else if (membersWithEmailError.code === '42703') {
      // Backward-compatible fallback when the email column migration has not been applied yet.
      const { data: membersLegacy, error: membersLegacyError } = await supabase
        .from('group_members')
        .select('id, user_id, role, created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })

      if (membersLegacyError) {
        console.warn('Could not fetch members:', membersLegacyError.message)
      } else {
        members = (membersLegacy || []).map((member) => ({ ...member, email: null }))
      }
    } else {
      console.warn('Could not fetch members:', membersWithEmailError.message)
    }

    const memberUserIds = [...new Set(members.map((member) => member.user_id).filter(Boolean))]
    const profileMap = {}

    if (memberUserIds.length > 0) {
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url')
        .in('id', memberUserIds)

      if (profileError) {
        console.warn('Could not fetch member profiles:', profileError.message)
      } else {
        ;(profileRows || []).forEach((profile) => {
          profileMap[profile.id] = profile
        })
      }
    }

    members = members.map((member) => {
      const profile = profileMap[member.user_id]
      return {
        ...member,
        email: member.email || profile?.email || null,
        display_name: profile?.display_name || null,
        avatar_url: profile?.avatar_url || null,
      }
    })

    const { data: groupBoxes, error: boxesError } = await supabase
      .from('boxes')
      .select('id, box_number, room')
      .eq('group_id', groupId)
      .order('box_number', { ascending: true })

    if (boxesError) {
      console.warn('Could not fetch boxes:', boxesError.message)
    } else {
      boxes = groupBoxes || []
    }

    setGroupDetails((prev) => ({
      ...prev,
      [groupId]: {
        members,
        boxes,
      },
    }))
  }, [])

  const handleCreateOpen = () => {
    setCreateFormData({ name: '' })
    setCreateDialogOpen(true)
  }

  const handleCreateClose = () => {
    setCreateDialogOpen(false)
  }

  const handleCreateSubmit = async () => {
    const trimmedName = createFormData.name.trim()

    if (!trimmedName) {
      setError('Group name is required.')
      return
    }

    setCreateSubmitting(true)
    setError('')

    try {
      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: trimmedName,
          owner_id: session.id,
          join_code: generateJoinCode(),
        })
        .select()
        .single()

      if (groupError) {
        throw groupError
      }

      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: newGroup.id,
          user_id: session.id,
          email: session.email || null,
          role: 'owner',
        })

      if (memberError) {
        throw memberError
      }

      setSuccess(`Group "${trimmedName}" created successfully.`)
      setCreateDialogOpen(false)
      onSelectGroup?.(newGroup)
      navigate('/')
      await fetchGroups()
    } catch (submitError) {
      setError(submitError.message || 'Could not create group.')
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleJoinOpen = () => {
    setJoinFormData({ code: '' })
    setJoinDialogOpen(true)
  }

  const handleJoinClose = () => {
    setJoinDialogOpen(false)
  }

  const handleJoinSubmit = async () => {
    const trimmedCode = joinFormData.code.trim().toUpperCase()

    if (!trimmedCode) {
      setError('Join code is required.')
      return
    }

    setJoinSubmitting(true)
    setError('')

    try {
      const { data: targetGroup, error: groupError } = await supabase
        .from('groups')
        .select('id')
        .eq('join_code', trimmedCode)
        .single()

      if (groupError) {
        throw new Error('Join code not found.')
      }

      if (!targetGroup) {
        throw new Error('Join code not found.')
      }

      const { data: existingMember, error: existingError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', targetGroup.id)
        .eq('user_id', session.id)
        .maybeSingle()

      if (existingError) {
        throw existingError
      }

      if (existingMember) {
        throw new Error('You are already a member of this group.')
      }

      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: targetGroup.id,
          user_id: session.id,
          email: session.email || null,
          role: 'member',
        })

      if (memberError) {
        throw memberError
      }

      setSuccess('Successfully joined group.')
      setJoinDialogOpen(false)
      onSelectGroup?.(targetGroup)
      navigate('/')
      await fetchGroups()
    } catch (submitError) {
      setError(submitError.message || 'Could not join group.')
    } finally {
      setJoinSubmitting(false)
    }
  }

  const handleOpenGroupDetails = (groupId) => {
    setSelectedGroupId(groupId)
    fetchGroupDetails(groupId)
    setSelectedGroupOpen(true)
  }

  const handleCloseGroupDetails = () => {
    setSelectedGroupOpen(false)
    setSelectedGroupId(null)
  }

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(''), 2000)
  }

  const handleSaveGroupDetails = async () => {
    if (!selectedGroupData || !isSelectedGroupOwner) {
      return
    }

    const trimmedName = groupEditName.trim()
    if (!trimmedName) {
      setError('Group name is required.')
      return
    }

    setGroupEditSaving(true)
    setError('')
    setSuccess('')

    try {
      const { data: updatedGroup, error: updateError } = await supabase
        .from('groups')
        .update({ name: trimmedName })
        .eq('id', selectedGroupData.id)
        .select('id, name, owner_id, join_code, created_at')
        .single()

      if (updateError) {
        throw updateError
      }

      setGroups((prevGroups) => prevGroups.map((group) => (group.id === updatedGroup.id ? updatedGroup : group)))
      onSelectGroup?.(updatedGroup)
      setSuccess('Group updated successfully.')
    } catch (updateError) {
      setError(updateError.message || 'Could not update group.')
    } finally {
      setGroupEditSaving(false)
    }
  }

  const handleRotateJoinCode = async () => {
    if (!selectedGroupData || !isSelectedGroupOwner) {
      return
    }

    let nextJoinCode = generateJoinCode()
    while (nextJoinCode === selectedGroupData.join_code) {
      nextJoinCode = generateJoinCode()
    }

    setError('')
    setSuccess('')

    try {
      const { data: updatedGroup, error: updateError } = await supabase
        .from('groups')
        .update({ join_code: nextJoinCode })
        .eq('id', selectedGroupData.id)
        .select('id, name, owner_id, join_code, created_at')
        .single()

      if (updateError) {
        throw updateError
      }

      setGroups((prevGroups) => prevGroups.map((group) => (group.id === updatedGroup.id ? updatedGroup : group)))
      onSelectGroup?.(updatedGroup)
      setCopiedCode('')
      setSuccess('Join code rotated successfully.')
    } catch (rotateError) {
      setError(rotateError.message || 'Could not rotate join code.')
    }
  }

  const handleRemoveMember = async (member) => {
    if (!selectedGroupData || !isSelectedGroupOwner || !member || member.user_id === session?.id) {
      return
    }

    const confirmed = window.confirm(
      `Remove ${member.display_name || member.email || 'this member'} from this group?`,
    )

    if (!confirmed) {
      return
    }

    setRemovingMemberId(member.id)
    setError('')
    setSuccess('')

    try {
      const { error: deleteError } = await supabase
        .from('group_members')
        .delete()
        .eq('id', member.id)

      if (deleteError) {
        throw deleteError
      }

      setGroupDetails((prevDetails) => {
        const nextGroupDetails = prevDetails[selectedGroupData.id]
        if (!nextGroupDetails) {
          return prevDetails
        }

        return {
          ...prevDetails,
          [selectedGroupData.id]: {
            ...nextGroupDetails,
            members: nextGroupDetails.members.filter((groupMember) => groupMember.id !== member.id),
          },
        }
      })
      setSuccess('Member removed from group.')

      const shouldRotateJoinCode = window.confirm(
        'Member removed. Rotate the join code now so they cannot rejoin with the same code?',
      )

      if (shouldRotateJoinCode) {
        await handleRotateJoinCode()
      }
    } catch (deleteError) {
      setError(deleteError.message || 'Could not remove member.')
    } finally {
      setRemovingMemberId('')
    }
  }

  const selectedGroupData = selectedGroupId ? groups.find((g) => g.id === selectedGroupId) : null
  const selectedGroupDetails = selectedGroupId ? groupDetails[selectedGroupId] : null
  const isSelectedGroupOwner = selectedGroupData?.owner_id === session?.id

  useEffect(() => {
    if (!selectedGroupOpen || !selectedGroupData) {
      setGroupEditName('')
      return
    }

    setGroupEditName(selectedGroupData.name || '')
  }, [selectedGroupOpen, selectedGroupData?.id, selectedGroupData?.name])

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <CircularProgress size={20} />
          <Typography>Loading groups...</Typography>
        </Stack>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.25}>
            <Typography variant="h5" component="h1">
              Choose a group
            </Typography>
            <Typography color="text.secondary">
              Create a group, join one with a code, or open an existing group you already belong to.
            </Typography>
            {currentGroup ? (
              <Typography variant="body2" color="text.secondary">
                Current group: <strong>{currentGroup.name}</strong>
              </Typography>
            ) : null}
          </Stack>
        </Paper>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button variant="contained" onClick={handleCreateOpen}>
            Create new group
          </Button>
          <Button variant="outlined" onClick={handleJoinOpen}>
            Join with code
          </Button>
          {currentGroup ? (
            <Button component={RouterLink} to="/" variant="text">
              Go to Home
            </Button>
          ) : null}
        </Stack>

        {groups.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              You are not a member of any groups yet. Create one or join with a code.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={3}>
            {ownedGroups.length > 0 ? (
              <Box>
                <Typography variant="subtitle1" component="h2" sx={{ mb: 1 }}>
                  Groups you own
                </Typography>
                <Grid container spacing={2}>
                  {ownedGroups.map((group) => (
                    <Grid item xs={12} sm={6} key={group.id}>
                      <Card variant="outlined" sx={{ borderColor: activeGroupId === group.id ? 'primary.main' : undefined }}>
                        <CardHeader
                          title={group.name}
                          subheader={activeGroupId === group.id ? 'Current group' : 'Owned by you'}
                        />
                        <CardContent>
                          <Typography color="text.secondary" variant="body2">
                            Join code: <strong>{group.join_code}</strong>
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <Button size="small" onClick={() => handleOpenGroupDetails(group.id)}>
                            Details
                          </Button>
                          <Button
                            size="small"
                            variant={activeGroupId === group.id ? 'contained' : 'outlined'}
                            onClick={() => handleOpenGroup(group)}
                          >
                            {activeGroupId === group.id ? 'Current' : 'Open'}
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ) : null}

            {joinedGroups.length > 0 ? (
              <Box>
                <Typography variant="subtitle1" component="h2" sx={{ mb: 1 }}>
                  Groups you joined
                </Typography>
                <Grid container spacing={2}>
                  {joinedGroups.map((group) => (
                    <Grid item xs={12} sm={6} key={group.id}>
                      <Card variant="outlined" sx={{ borderColor: activeGroupId === group.id ? 'primary.main' : undefined }}>
                        <CardHeader
                          title={group.name}
                          subheader={activeGroupId === group.id ? 'Current group' : 'Joined group'}
                        />
                        <CardContent>
                          <Typography color="text.secondary" variant="body2">
                            Join code: <strong>{group.join_code}</strong>
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <Button size="small" onClick={() => handleOpenGroupDetails(group.id)}>
                            Details
                          </Button>
                          <Button
                            size="small"
                            variant={activeGroupId === group.id ? 'contained' : 'outlined'}
                            onClick={() => handleOpenGroup(group)}
                          >
                            {activeGroupId === group.id ? 'Current' : 'Open'}
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ) : null}
          </Stack>
        )}

        {/* Create Group Dialog */}
        <Dialog open={createDialogOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
          <DialogTitle>Create new group</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              id="group-name"
              label="Group name"
              value={createFormData.name}
              onChange={(e) => setCreateFormData({ name: e.target.value })}
              placeholder="e.g., Apartment Move"
              fullWidth
              size="small"
              autoFocus
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCreateClose}>Cancel</Button>
            <Button
              onClick={handleCreateSubmit}
              variant="contained"
              disabled={createSubmitting}
              startIcon={createSubmitting ? <CircularProgress size={16} /> : null}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Join Group Dialog */}
        <Dialog open={joinDialogOpen} onClose={handleJoinClose} maxWidth="sm" fullWidth>
          <DialogTitle>Join group with code</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              id="join-code"
              label="Join code"
              value={joinFormData.code}
              onChange={(e) => setJoinFormData({ code: e.target.value.toUpperCase() })}
              placeholder="e.g., ABC12345"
              fullWidth
              size="small"
              autoFocus
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleJoinClose}>Cancel</Button>
            <Button
              onClick={handleJoinSubmit}
              variant="contained"
              disabled={joinSubmitting}
              startIcon={joinSubmitting ? <CircularProgress size={16} /> : null}
            >
              Join
            </Button>
          </DialogActions>
        </Dialog>

        {/* Group Details Dialog */}
        <Dialog open={selectedGroupOpen} onClose={handleCloseGroupDetails} maxWidth="sm" fullWidth>
          <DialogTitle>{selectedGroupData?.name}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2}>
              {isSelectedGroupOwner ? (
                <Box>
                  <Typography variant="subtitle2">Edit group</Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <TextField
                      label="Group name"
                      value={groupEditName}
                      onChange={(event) => setGroupEditName(event.target.value)}
                      fullWidth
                      size="small"
                    />
                    <Button
                      variant="contained"
                      onClick={handleSaveGroupDetails}
                      disabled={groupEditSaving}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      {groupEditSaving ? 'Saving...' : 'Save group changes'}
                    </Button>
                  </Stack>
                </Box>
              ) : null}

              {isSelectedGroupOwner ? <Divider /> : null}

              {/* Join Code */}
              <Box>
                <Typography variant="subtitle2">Join Code</Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <TextField
                    value={selectedGroupData?.join_code || ''}
                    fullWidth
                    size="small"
                    readOnly
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleCopyCode(selectedGroupData?.join_code || '')}
                    title="Copy code"
                  >
                    {copiedCode === selectedGroupData?.join_code ? '✓' : <ContentCopyIcon fontSize="small" />}
                  </IconButton>
                  {isSelectedGroupOwner ? (
                    <Tooltip title="Generate a new join code for this group">
                      <IconButton size="small" onClick={handleRotateJoinCode} aria-label="Generate new join code">
                        <LoopIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Stack>
              </Box>

              <Divider />

              {/* Members */}
              <Box>
                <Typography variant="subtitle2">Members ({selectedGroupDetails?.members?.length || 0})</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {(selectedGroupDetails?.members || []).map((member) => (
                    <Stack key={member.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Avatar src={member.avatar_url || undefined} sx={{ width: 28, height: 28 }}>
                        {String(member.display_name || member.email || 'U').trim().charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">
                          {member.role === 'owner' ? '👑' : ''}{' '}
                          {member.display_name
                            || member.email
                            || (member.user_id === session?.id ? session?.email : null)
                            || `User ${member.user_id.slice(0, 8)}`}
                          {member.display_name && (member.email || (member.user_id === session?.id ? session?.email : null))
                            ? ` (${member.email || session?.email})`
                            : ''}
                          {member.role !== 'member' && ` (${member.role})`}
                        </Typography>
                      </Box>
                      {isSelectedGroupOwner && member.role !== 'owner' && member.user_id !== session?.id ? (
                        <Tooltip title="Remove member">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveMember(member)}
                            disabled={removingMemberId === member.id}
                            aria-label="Remove member"
                          >
                            {removingMemberId === member.id ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                                <DeleteIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </Stack>
                  ))}
                </Stack>
              </Box>

              {selectedGroupDetails?.boxes && selectedGroupDetails.boxes.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2">
                      Boxes ({selectedGroupDetails.boxes.length})
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {selectedGroupDetails.boxes.map((box) => (
                        <Typography key={box.id} variant="body2">
                          {box.box_number} - {box.room}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            {isSelectedGroupOwner && (
              <Button color="error" onClick={handleCloseGroupDetails}>
                {/* Delete group button can be added here */}
              </Button>
            )}
            <Button onClick={handleCloseGroupDetails}>Close</Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Container>
  )
}

export default GroupsPage
