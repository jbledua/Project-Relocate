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

  return (
    <Card variant="outlined">
      <CardActionArea {...actionProps}>
        <CardContent>
          <Typography variant="h6" component="h3" gutterBottom>
            {box.box_number}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Room:</strong> {box.room || 'N/A'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Label:</strong> {box.label || 'N/A'}
          </Typography>

          {box.tags && box.tags.length > 0 ? (
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              {box.tags.map((tag) => (
                <Chip key={`${box.id}-${tag}`} label={tag} size="small" />
              ))}
            </Stack>
          ) : null}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export default BoxCard
