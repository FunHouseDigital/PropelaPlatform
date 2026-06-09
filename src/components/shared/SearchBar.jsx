import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

export default function SearchBar({ value = '', onChange, placeholder = 'Search nurses...' }) {
  const [localValue, setLocalValue] = useState(value)
  const debounceRef = useRef(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (e) => {
    const val = e.target.value
    setLocalValue(val)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange(val)
    }, 300)
  }

  const handleClear = () => {
    setLocalValue('')
    onChange('')
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey" />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-8 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-grey hover:text-dark"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
