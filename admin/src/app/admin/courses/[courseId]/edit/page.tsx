"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"

const courseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  slug: z.string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  published: z.boolean(),
  thumbnail: z.string().url().optional().or(z.literal("")),
})

type CourseFormData = z.infer<typeof courseSchema>

interface EditCoursePageProps {
  params: Promise<{ courseId: string }>
}

export default function EditCoursePage({ params }: EditCoursePageProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [courseId, setCourseId] = useState<string | null>(null)
  const router = useRouter()
  
  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      slug: "",
      published: false,
      thumbnail: "",
    },
  })

  useEffect(() => {
    async function loadCourse() {
      const { courseId: id } = await params
      setCourseId(id)
      
      try {
        const response = await fetch(`/api/admin/courses/${id}`)
        if (!response.ok) throw new Error("Failed to load course")
        
        const course = await response.json()
        form.reset({
          title: course.title,
          description: course.description || "",
          slug: course.slug,
          published: course.published,
          thumbnail: course.thumbnail || "",
        })
      } catch (error) {
        toast.error("Failed to load course details")
        router.push("/admin/courses")
      }
    }
    
    loadCourse()
  }, [params, form, router])

  async function onSubmit(data: CourseFormData) {
    if (!courseId) return
    
    setIsLoading(true)

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update course")
      }

      toast.success("Course updated successfully!")
      router.push("/admin/courses")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update course")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    if (!courseId) return
    
    const confirmed = window.confirm(
      "Are you sure you want to delete this course? This will also delete all lessons and cannot be undone."
    )
    
    if (!confirmed) return
    
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete course")
      }

      const result = await response.json()
      toast.success(result.message || "Course deleted successfully!")
      router.push("/admin/courses")
    } catch (error) {
      toast.error("Failed to delete course")
    } finally {
      setIsDeleting(false)
    }
  }

  function generateSlug() {
    const title = form.getValues("title")
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
    
    form.setValue("slug", slug)
  }

  if (!courseId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <Link href="/admin/courses" className="inline-flex items-center text-sm text-muted-foreground hover:text-accent mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Courses
      </Link>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit Course</CardTitle>
            <CardDescription>Update course details and settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Introduction to Web Development" 
                          {...field} 
                        />
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
                          placeholder="Describe what students will learn in this course..."
                          className="min-h-[100px] resize-y"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Slug</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            placeholder="e.g., intro-to-web-dev" 
                            {...field} 
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={generateSlug}
                        >
                          Generate
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="thumbnail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thumbnail URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., https://example.com/course-thumbnail.jpg" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="published"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Published</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Make this course visible to students
                        </div>
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

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Course"
                    )}
                  </Button>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/admin/courses")}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="bg-accent hover:bg-[var(--accent-hover)] text-white"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}// Force dynamic rendering
export const dynamic = 'force-dynamic'
