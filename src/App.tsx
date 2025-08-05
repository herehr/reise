import { useState } from 'react'

export default function App() {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [total, setTotal] = useState<number | null>(null)

  const calculate = () => {
    const startTime = new Date(start)
    const endTime = new Date(end)
    const diffMs = endTime.getTime() - startTime.getTime()
    const diffHrs = diffMs / (1000 * 60 * 60)

    const fullDays = Math.floor(diffHrs / 24)
    const remainder = diffHrs % 24

    let partial = 0
    if (remainder >= 12) partial = 30.2
    else if (remainder >= 3) partial = 15.1

    const totalAmount = fullDays * 45.3 + partial
    setTotal(totalAmount)
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Diätenrechner (AT)</h1>
      <label className="block mb-2">Beginn der Reise:</label>
      <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className="p-2 border w-full mb-4" />
      <label className="block mb-2">Ende der Reise:</label>
      <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} className="p-2 border w-full mb-4" />
      <button onClick={calculate} className="bg-blue-600 text-white px-4 py-2 rounded">Berechnen</button>
      {total !== null && (
        <div className="mt-6 text-lg">
          Gesamt-Taggeld: <strong>{total.toFixed(2)} €</strong>
        </div>
      )}
    </div>
  )
}
