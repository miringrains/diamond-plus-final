"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface AudioUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: () => void
  uploadEndpoint?: string
  title?: string
  description?: string
}

export function AudioUploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
  uploadEndpoint = "/api/simple-upload",
  title = "Upload Podcast",
  description = "Add a new podcast episode"
}: AudioUploadDialogProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    audioFile: null as File | null,
    thumbnailFile: null as File | null
  })

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, audioFile: file }))
    }
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, thumbnailFile: file }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.audioFile) {
      toast.error("Please select an audio file")
      return
    }

    setIsUploading(true)

    try {
      // Upload audio file
      const uploadFormData = new FormData()
      uploadFormData.append("file", formData.audioFile)
      uploadFormData.append("title", formData.title)
      uploadFormData.append("description", formData.description || "")
      uploadFormData.append("contentType", "podcast")
      
      const uploadResponse = await fetch(uploadEndpoint, {
        method: "POST",
        body: uploadFormData
      })

      if (!uploadResponse.ok) {
        throw new Error("Upload failed")
      }

      const uploadData = await uploadResponse.json()

      if (uploadData.success) {
        toast.success("Podcast uploaded successfully")
        
        onUploadComplete()
        onOpenChange(false)
      } else {
        throw new Error(uploadData.error || "Upload failed")
      }
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        audioFile: null,
        thumbnailFile: null
      })
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to upload podcast")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="audio">Audio File (MP3)</Label>
            <Input
              id="audio"
              type="file"
              accept="audio/mp3,audio/mpeg"
              onChange={handleAudioChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="thumbnail">Thumbnail Image (optional)</Label>
            <Input
              id="thumbnail"
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
