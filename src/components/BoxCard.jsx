import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'

function BoxCard({ box, onClick, to }) {
  const actionProps = onClick
    ? { component: 'button', onClick, type: 'button' }
    : { component: RouterLink, to: to || `/boxes/${box.id}` }
  const itemCount = box.itemCount || 0
  const hasNotes = Boolean((box.notes || '').trim())
  const tags = Array.isArray(box.tags) ? box.tags : []
  const visibleTags = tags.slice(0, 3)
  const hiddenTagCount = Math.max(tags.length - visibleTags.length, 0)

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea {...actionProps} sx={{ height: '100%' }}>
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="h6" component="h3" gutterBottom>
            <strong>{box.box_number}</strong> {box.room || 'N/A'}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {itemCount > 0 ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'}` : 'No content'}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            title={hasNotes ? box.notes : ''}
            sx={{ minHeight: 20 }}
          >
            {hasNotes ? `${box.notes}` : ''}
          </Typography>

          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            sx={{ mt: 1, minHeight: 24, alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}
          >
            {visibleTags.map((tag) => (
              <Chip key={`${box.id}-${tag}`} label={tag} size="small" />
            ))}
            {hiddenTagCount > 0 ? <Chip label={`+${hiddenTagCount}`} size="small" /> : null}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export default BoxCard
