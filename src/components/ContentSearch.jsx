import TextField from '@mui/material/TextField'

function ContentSearch({ value, onChange }) {
  return (
    <TextField
      id="content-search"
      label="Search by content item"
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Example: winter jackets"
      fullWidth
      size="small"
    />
  )
}

export default ContentSearch
