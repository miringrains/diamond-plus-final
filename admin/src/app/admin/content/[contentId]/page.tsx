import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus } from "lucide-react"
import { ContentEditForm } from "@/components/admin/content-edit-form"
import { PodcastUploadForm } from "@/components/admin/podcast-upload-form"
import { VideoUploadForm } from "@/components/admin/video-upload-form"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

export const metadata: Metadata = {
  title: "Edit Content | Admin",
  description: "Edit Diamond Plus content",
}

export const dynamic = 'force-dynamic'

interface ContentPageProps {
  params: Promise<{
    contentId: string
  }>
}

export default async function ContentEditPage({ params }: ContentPageProps) {
  const { contentId } = await params
  const content = await prisma.dp_content.findUnique({
    where: {
      id: contentId,
    },
    include: {
      dp_videos: {
        orderBy: {
          order_index: 'asc'
        }
      },
      dp_podcasts: {
        orderBy: {
          episode_number: 'asc'
        }
      },
    },
  })

  if (!content) {
    notFound()
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/content">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="secondary" className="capitalize">
              {content.type}
            </Badge>
            <Badge variant={content.is_published ? "default" : "outline"}>
              {content.is_published ? "Published" : "Draft"}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="media">
            {content.type === 'podcast' ? 'Episodes' : 'Videos'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <ContentEditForm content={content} />
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {content.type === 'podcast' ? 'Podcast Episodes' : 'Videos'}
            </h2>
          </div>

          {/* Upload Form */}
          <div className="rounded-lg border p-6">
            <h3 className="text-lg font-medium mb-4">
              Upload New {content.type === 'podcast' ? 'Episode' : 'Video'}
            </h3>
            {content.type === 'podcast' ? (
              <PodcastUploadForm contentId={content.id} />
            ) : (
              <VideoUploadForm contentId={content.id} />
            )}
          </div>

          {/* Media List */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  {content.type === 'podcast' && <TableHead>Episode</TableHead>}
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.type === 'podcast' ? (
                  content.dp_podcasts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No episodes uploaded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    content.dp_podcasts.map((podcast) => (
                      <TableRow key={podcast.id}>
                        <TableCell className="font-medium">{podcast.title}</TableCell>
                        <TableCell>
                          {podcast.episode_number ? `#${podcast.episode_number}` : '-'}
                        </TableCell>
                        <TableCell>{formatDuration(podcast.duration)}</TableCell>
                        <TableCell>
                          <Badge variant={podcast.mux_ready_at ? "default" : "secondary"}>
                            {podcast.mux_ready_at ? "Ready" : "Processing"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(podcast.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                ) : (
                  content.dp_videos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No videos uploaded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    content.dp_videos.map((video) => (
                      <TableRow key={video.id}>
                        <TableCell className="font-medium">{video.title}</TableCell>
                        <TableCell>{formatDuration(video.duration)}</TableCell>
                        <TableCell>
                          <Badge variant={video.mux_ready_at ? "default" : "secondary"}>
                            {video.mux_ready_at ? "Ready" : "Processing"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(video.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
