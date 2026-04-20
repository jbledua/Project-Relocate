function ContentSearch({ value, onChange }) {
  return (
    <div className="input-group">
      <label htmlFor="content-search">Search by content item</label>
      <input
        id="content-search"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Example: winter jackets"
      />
    </div>
  )
}

export default ContentSearch
