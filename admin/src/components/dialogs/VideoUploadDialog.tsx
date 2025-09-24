import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

interface VideoUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: () => void
  uploadEndpoint?: string
  title?: string
  description?: string
  additionalFields?: string[]
  contentType: string
}

export function VideoUploadDialog({ 
  open, 
  onOpenChange, 
  onUploadComplete,
  uploadEndpoint = "/api/simple-upload",
  title = "Upload Video",
  description = "Add a new video",
  additionalFields = [],
  contentType
}: VideoUploadDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    videoFile: null as File | null,
    order: "0",
  })
  const [isUploading, setIsUploading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, videoFile: file }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.videoFile) {
      toast.error("Please select a video file")
      return
    }

    setIsUploading(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append("file", formData.videoFile)
      uploadFormData.append("title", formData.title)
      uploadFormData.append("description", formData.description || "")
      uploadFormData.append("contentType", contentType)
      
      if (additionalFields.includes("order")) {
        uploadFormData.append("order", formData.order)
      }
      
      const uploadResponse = await fetch(uploadEndpoint, {
        method: "POST",
        body: uploadFormData
      })

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        throw new Error(error.error || "Upload failed")
      }

      const data = await uploadResponse.json()
      
      if (data.success) {
        toast.success("Video uploaded successfully")
        onUploadComplete()
        onOpenChange(false)
        
        // Reset form
        setFormData({
          title: "",
          description: "",
          videoFile: null,
          order: "0",
        })
      } else {
        throw new Error(data.error || "Upload failed")
      }
      
    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error(error.message || "Failed to upload video")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Video Title"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Brief description of the video"
            />
          </div>
          {additionalFields.includes("order") && (
            <div className="grid gap-2">
              <Label htmlFor="order">Order (for sorting)</Label>
              <Input
                id="order"
                name="order"
                type="number"
                value={formData.order}
                onChange={handleInputChange}
                placeholder="0"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="videoFile">Video File</Label>
            <Input
              id="videoFile"
              name="videoFile"
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              required
            />
          </div>
          <Button type="submit" disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Video
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}