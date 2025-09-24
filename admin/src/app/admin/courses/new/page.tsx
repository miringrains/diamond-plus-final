"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

const courseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  thumbnail: z.string().url().optional().or(z.literal("")),
})

type CourseFormData = z.infer<typeof courseSchema>

export default function NewCoursePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      slug: "",
      thumbnail: "",
    },
  })

  async function onSubmit(data: CourseFormData) {
    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to create course")
      }

      const course = await response.json()
      toast.success("Course created successfully!")
      router.push(`/admin/courses/${course.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create course")
      setIsLoading(false)
    }
  }

  // Auto-generate slug from title
  const watchTitle = form.watch("title")
  const generateSlug = () => {
    const slug = watchTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    form.setValue("slug", slug)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/admin/courses" className="inline-flex items-center text-sm text-muted-foreground hover:text-accent mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Courses
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New Course</CardTitle>
          <CardDescription>
            Add a new course to your platform
          </CardDescription>
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
                        placeholder="e.g., Introduction to Diamond Trading"
                        className="bg-muted/50"
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
                          placeholder="e.g., intro-to-diamond-trading"
                          className="bg-muted/50"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateSlug}
                        disabled={!watchTitle}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what students will learn in this course..."
                        className="bg-muted/50 min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
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
                        className="bg-muted/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="bg-accent hover:bg-[var(--accent-hover)] text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating..." : "Create Course"}
                </Button>
                <Link href="/admin/courses">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}// Force dynamic rendering
export const dynamic = 'force-dynamic'
