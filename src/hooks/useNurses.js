import { useState, useCallback, useMemo } from 'react'
import { getNurses, setNurses, getNurseById as storeGetNurseById, updateNurse as storeUpdateNurse } from '../data/store.js'
import { calculateReadinessStatus, getFlagCount } from '../utils/calculations.js'

export function useNurses(filters = {}, sortBy = 'name', groupBy = null) {
  const [nurses, setNursesState] = useState(() => getNurses())
  const [loading] = useState(false)

  const refreshNurses = useCallback(() => {
    setNursesState(getNurses())
  }, [])

  const updateNurse = useCallback((id, changes) => {
    const updated = storeUpdateNurse(id, changes)
    if (updated) {
      setNursesState(getNurses())
    }
    return updated
  }, [])

  const addNurse = useCallback((data) => {
    const current = getNurses()
    const newNurse = { ...data, id: `nurse-${Date.now()}` }
    current.push(newNurse)
    setNurses(current)
    setNursesState(current)
    return newNurse
  }, [])

  const getNurseByIdFn = useCallback((id) => {
    return storeGetNurseById(id)
  }, [])

  const filteredNurses = useMemo(() => {
    let result = [...nurses]

    // Search filter
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase()
      result = result.filter(n =>
        (n.fullName && n.fullName.toLowerCase().includes(q)) ||
        (n.email && n.email.toLowerCase().includes(q)) ||
        (n.sancNumber && n.sancNumber.toLowerCase().includes(q)) ||
        (n.preferredName && n.preferredName.toLowerCase().includes(q))
      )
    }

    // Cohort filter
    if (filters.cohort) {
      result = result.filter(n => n.cohortAssigned === filters.cohort)
    }

    // Pipeline stage filter
    if (filters.stage && filters.stage.length > 0) {
      result = result.filter(n => filters.stage.includes(n.pipelineStage))
    }

    // Specialty filter
    if (filters.specialty && filters.specialty.length > 0) {
      result = result.filter(n => filters.specialty.includes(n.primaryClinicalSpecialty))
    }

    // Readiness status filter
    if (filters.readinessStatus) {
      result = result.filter(n => n.readinessStatus === filters.readinessStatus)
    }

    // Next action filter
    if (filters.nextAction) {
      result = result.filter(n => n.nextAction === filters.nextAction)
    }

    // Flag present filter
    if (filters.flagPresent === 'yes') {
      result = result.filter(n => getFlagCount(n.notes) > 0)
    } else if (filters.flagPresent === 'no') {
      result = result.filter(n => getFlagCount(n.notes) === 0)
    }

    // EF SET Level filter
    if (filters.efSetLevel) {
      result = result.filter(n => n.efSetLevel === filters.efSetLevel)
    }

    // OET Status filter
    if (filters.oetStatus) {
      result = result.filter(n => n.oetStatus === filters.oetStatus)
    }

    // Province filter
    if (filters.province) {
      result = result.filter(n => n.province === filters.province)
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.fullName || '').localeCompare(b.fullName || '')
        case 'cvScore':
          return (b.cvScore || 0) - (a.cvScore || 0)
        case 'yearsExperience': {
          const getYears = (exp) => {
            if (!exp) return 0
            if (exp.includes('5+')) return 6
            if (exp.includes('3-5')) return 4
            if (exp.includes('1-2')) return 1.5
            return 0.5
          }
          return getYears(b.yearsOfClinicalExperience) - getYears(a.yearsOfClinicalExperience)
        }
        case 'lastContacted':
          return new Date(b.lastContacted || 0) - new Date(a.lastContacted || 0)
        case 'submittedAt':
          return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)
        default:
          return 0
      }
    })

    return result
  }, [nurses, filters, sortBy])

  const groupedNurses = useMemo(() => {
    if (!groupBy) return null

    const groups = {}
    filteredNurses.forEach(nurse => {
      let key
      switch (groupBy) {
        case 'specialty':
          key = nurse.primaryClinicalSpecialty || 'Unspecified'
          break
        case 'stage':
          key = nurse.pipelineStage || 'Unknown'
          break
        case 'cohort':
          key = nurse.cohortAssigned || 'Unassigned'
          break
        case 'readinessStatus':
          key = nurse.readinessStatus || calculateReadinessStatus(nurse.pipelineStage)
          break
        default:
          key = 'All'
      }
      if (!groups[key]) groups[key] = []
      groups[key].push(nurse)
    })

    return groups
  }, [filteredNurses, groupBy])

  return {
    nurses: filteredNurses,
    allNurses: nurses,
    groupedNurses,
    loading,
    updateNurse,
    addNurse,
    getNurseById: getNurseByIdFn,
    refreshNurses,
  }
}
