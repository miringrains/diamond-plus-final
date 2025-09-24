"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

const contentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["workshop", "podcast", "module", "coaching"]),
  category: z.string().optional(),
  is_published: z.boolean(),
})

type ContentFormData = z.infer<typeof contentSchema>

export default function NewContentPage() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  const form = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "module",
      category: "",
      is_published: false,
    },
  })

  async function onSubmit(data: ContentFormData) {
    setIsCreating(true)
    
    try {
      // Determine category based on type if not provided
      const category = data.category || (data.type === 'podcast' ? 'podcasts' : 
                                        data.type === 'module' ? 'modules' : 
                                        data.type === 'workshop' ? 'workshops' : 
                                        data.type)

      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          category,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create content")
      }

      const content = await response.json()
      
      toast.success("Content created successfully")
      router.push(`/admin/content/${content.id}`)
    } catch (error) {
      console.error("Error creating content:", error)
      toast.error("Failed to create content")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/content">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Content</h1>
          <p className="text-muted-foreground">
            Add new content to Diamond Plus portal
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter content title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter content description"
                    className="min-h-[100px]"
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  A brief description of what this content covers
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select content type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="module">Module (Welcome Course)</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="podcast">Podcast</SelectItem>
                    <SelectItem value="coaching">Coaching</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose the type of content you're creating
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., workshops, podcasts, modules" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Leave empty to use default category based on type
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_published"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Publish immediately
                  </FormLabel>
                  <FormDescription>
                    Make this content visible in the Diamond Plus portal
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex gap-4">
            <Button 
              type="submit" 
              disabled={isCreating}
              className="flex-1"
            >
              {isCreating ? "Creating..." : "Create Content"}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => router.push("/admin/content")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
// Force dynamic rendering
export const dynamic = 'force-dynamic'
