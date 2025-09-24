import { createUploadthing, type FileRouter } from "uploadthing/next"
import { auth } from "@/lib/auth"

const f = createUploadthing()

export const ourFileRouter = {
  // Video upload endpoint - admin only
  videoUploader: f({ video: { maxFileSize: "4GB" } })
    .middleware(async () => {
      // Check authentication
      const session = await auth()
      
      if (!session || session.user?.role !== "ADMIN") {
        throw new Error("Unauthorized")
      }
      
      return { userId: session.user?.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId)
      console.log("File url:", file.url)
      
      // For now, we'll handle local storage
      // In production, you'd use the file.url from uploadthing's CDN
      
      return { uploadedBy: metadata.userId, url: file.url }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter