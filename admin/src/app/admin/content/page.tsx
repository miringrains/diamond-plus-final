import { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Plus, Video, Mic, BookOpen } from "lucide-react"
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
  title: "Diamond Plus Content | Admin",
  description: "Manage Diamond Plus content",
}

export const dynamic = 'force-dynamic'

export default async function ContentPage() {
  const content = await prisma.dp_content.findMany({
    include: {
      dp_videos: true,
      dp_podcasts: true,
    },
    orderBy: {
      created_at: 'desc'
    }
  })

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'module':
        return <BookOpen className="h-4 w-4" />
      case 'workshop':
        return <Video className="h-4 w-4" />
      case 'podcast':
        return <Mic className="h-4 w-4" />
      default:
        return <Video className="h-4 w-4" />
    }
  }

  const getContentCount = (item: any) => {
    if (item.type === 'podcast') {
      return `${item.dp_podcasts.length} episode${item.dp_podcasts.length !== 1 ? 's' : ''}`
    }
    return `${item.dp_videos.length} video${item.dp_videos.length !== 1 ? 's' : ''}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Diamond Plus Content</h1>
          <p className="text-muted-foreground">
            Manage videos, podcasts, and modules for Diamond Plus portal
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/content/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Content
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {content.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No content yet. Click "Add Content" to get started.
                </TableCell>
              </TableRow>
            ) : (
              content.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getContentIcon(item.type)}
                      {item.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.category || '-'}
                  </TableCell>
                  <TableCell>
                    {getContentCount(item)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_published ? "default" : "outline"}>
                      {item.is_published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(item.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/content/${item.id}`}>
                        Edit
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
