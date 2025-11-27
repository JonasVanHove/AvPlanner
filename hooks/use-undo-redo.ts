"use client"

import { useState, useCallback, useRef } from 'react'

interface Change<T> {
  previousState: T | null
  currentState: T
  timestamp: number
}

interface UndoRedoState<T> {
  past: Change<T>[]
  future: Change<T>[]
}

export function useUndoRedo<T>(maxHistory: number = 50) {
  const stateRef = useRef<UndoRedoState<T>>({
    past: [],
    future: []
  })
  const [, forceUpdate] = useState({})
  
  const pendingChange = useRef<Change<T> | null>(null)
  const batchTimeout = useRef<NodeJS.Timeout | null>(null)

  const updateState = useCallback((newState: UndoRedoState<T>) => {
    stateRef.current = newState
    forceUpdate({})
  }, [])

  // Record a single change
  const recordChange = useCallback((previousState: T | null, currentState: T) => {
    const change: Change<T> = {
      previousState,
      currentState,
      timestamp: Date.now()
    }
    
    // Clear existing timeout
    if (batchTimeout.current) {
      clearTimeout(batchTimeout.current)
    }
    
    pendingChange.current = change
    
    // Commit after short delay to allow batching
    batchTimeout.current = setTimeout(() => {
      if (pendingChange.current) {
        const prev = stateRef.current
        updateState({
          past: [...prev.past.slice(-maxHistory + 1), pendingChange.current!],
          future: [] // Clear redo stack on new action
        })
        pendingChange.current = null
      }
    }, 100)
  }, [maxHistory, updateState])

  // Record multiple changes at once (for bulk updates)
  const recordChanges = useCallback((changes: Array<{ previousState: T | null, currentState: T }>) => {
    const timestampedChanges: Change<T>[] = changes.map(c => ({
      ...c,
      timestamp: Date.now()
    }))
    
    const prev = stateRef.current
    updateState({
      past: [...prev.past.slice(-maxHistory + changes.length), ...timestampedChanges],
      future: []
    })
  }, [maxHistory, updateState])

  // Undo last action - returns the change to undo
  const undo = useCallback((): Change<T> | null => {
    const prev = stateRef.current
    if (prev.past.length === 0) return null
    
    const newPast = [...prev.past]
    const lastChange = newPast.pop()!
    
    updateState({
      past: newPast,
      future: [lastChange, ...prev.future]
    })
    
    return lastChange
  }, [updateState])

  // Redo last undone action - returns the change to redo
  const redo = useCallback((): Change<T> | null => {
    const prev = stateRef.current
    if (prev.future.length === 0) return null
    
    const newFuture = [...prev.future]
    const nextChange = newFuture.shift()!
    
    updateState({
      past: [...prev.past, nextChange],
      future: newFuture
    })
    
    return nextChange
  }, [updateState])

  // Clear history
  const clear = useCallback(() => {
    updateState({ past: [], future: [] })
    pendingChange.current = null
    if (batchTimeout.current) {
      clearTimeout(batchTimeout.current)
    }
  }, [updateState])

  return {
    canUndo: stateRef.current.past.length > 0,
    canRedo: stateRef.current.future.length > 0,
    undo,
    redo,
    recordChange,
    recordChanges,
    clear,
    historyLength: stateRef.current.past.length,
    futureLength: stateRef.current.future.length
  }
}
