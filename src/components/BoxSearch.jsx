function BoxSearch({ value, onChange }) {
  return (
    <div className="input-group">
      <label htmlFor="box-search">Search by box number</label>
      <input
        id="box-search"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Example: BX-001"
      />
    </div>
  )
}

export default BoxSearch
