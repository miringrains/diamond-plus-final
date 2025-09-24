"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { cn } from "@/lib/utils"

interface LessonNotesProps {
  lessonId: string
  initialNotes?: string
  className?: string
}

export function LessonNotes({ lessonId, initialNotes = "", className }: LessonNotesProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousNotesRef = useRef(initialNotes)

  // Load notes on mount
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const response = await fetch(`/api/progress/${lessonId}/notes`)
        if (response.ok) {
          const data = await response.json()
          setNotes(data.notes || "")
          previousNotesRef.current = data.notes || ""
        }
      } catch (error) {
        console.error("Failed to load notes:", error)
      }
    }
    loadNotes()
  }, [lessonId])

  // Auto-save function
  const saveNotes = useCallback(async (notesContent: string) => {
    if (notesContent === previousNotesRef.current) return // No changes

    setIsSaving(true)
    try {
      const response = await fetch(`/api/progress/${lessonId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesContent }),
      })
      
      if (response.ok) {
        setLastSaved(new Date())
        previousNotesRef.current = notesContent
      } else {
        throw new Error("Failed to save notes")
      }
    } catch (error) {
      console.error("Failed to save notes:", error)
      toast.error("Failed to save notes")
    } finally {
      setIsSaving(false)
    }
  }, [lessonId])

  // Debounced auto-save
  const handleNotesChange = (value: string) => {
    setNotes(value)
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Set new timeout for auto-save (2 seconds after stopping)
    saveTimeoutRef.current = setTimeout(() => {
      saveNotes(value)
    }, 2000)
  }

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (notes !== previousNotesRef.current) {
        saveNotes(notes)
      }
    }
  }, [notes, saveNotes])

  // Manual save with Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveNotes(notes)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [notes, saveNotes])

  return (
    <div className={cn("h-full flex flex-col", className)}>
      <Textarea
        value={notes}
        onChange={(e) => handleNotesChange(e.target.value)}
        placeholder="Take notes while watching the lesson..."
        className="flex-1 min-h-[200px] resize-none border-0 bg-transparent hover:bg-muted/5 focus:bg-muted/10 focus:outline-none px-1 py-1 rounded"
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-muted-foreground">
          Notes auto-save as you type • Press Ctrl+S to save manually
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isSaving && (
            <span className="flex items-center gap-1">
              <Save className="h-3 w-3 animate-pulse" />
              Saving...
            </span>
          )}
          {!isSaving && lastSaved && (
            <span>Saved</span>
          )}
        </div>
      </div>
    </div>
  )
}



