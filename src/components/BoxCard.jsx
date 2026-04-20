import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'

function BoxCard({ box }) {
  return (
    <Card variant="outlined">
      <CardActionArea component={RouterLink} to={`/boxes/${box.id}`}>
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
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export default BoxCard
