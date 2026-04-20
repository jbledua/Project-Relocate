import TextField from '@mui/material/TextField'

function BoxSearch({ value, onChange }) {
  return (
    <TextField
      id="box-search"
      label="Search by box number"
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Example: BX-001"
      fullWidth
      size="small"
    />
  )
}

export default BoxSearch
