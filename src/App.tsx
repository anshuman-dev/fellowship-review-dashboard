import { useState, useEffect } from 'react'
import { loadApplicants, updateApplicant } from './storage'
import type { Applicant } from './types'
import Dashboard from './components/Dashboard'
import ReviewPage from './components/ReviewPage'

export default function App() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => { setApplicants(loadApplicants()) }, [])

  function refresh() { setApplicants(loadApplicants()) }

  function patch(id: string, data: Partial<Applicant>) {
    const next = updateApplicant(id, data)
    setApplicants(next)
  }

  const current = selected ? applicants.find(a => a.id === selected) : null

  if (current) {
    return (
      <ReviewPage
        applicant={current}
        onBack={() => { setSelected(null); refresh() }}
        onUpdate={(data) => patch(current.id, data)}
      />
    )
  }

  return (
    <Dashboard
      applicants={applicants}
      onSelect={setSelected}
    />
  )
}
