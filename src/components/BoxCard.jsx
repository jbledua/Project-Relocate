import { Link } from 'react-router-dom'

function BoxCard({ box }) {
  return (
    <Link to={`/boxes/${box.id}`} className="box-card">
      <h3>{box.box_number}</h3>
      <p>
        <strong>Room:</strong> {box.room || 'N/A'}
      </p>
      <p>
        <strong>Label:</strong> {box.label || 'N/A'}
      </p>
    </Link>
  )
}

export default BoxCard
