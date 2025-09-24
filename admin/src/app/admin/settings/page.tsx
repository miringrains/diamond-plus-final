import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings, Database, Key, Mail, Cloud, Shield } from "lucide-react"

export default async function AdminSettingsPage() {
  const session = await auth()
  
  if (!session || !session.user || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
    redirect("/login")
  }

  // Get environment status
  const envStatus = {
    database: !!process.env.DATABASE_URL,
    auth: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ghl: !!process.env.GHL_PRIVATE_KEY && !!process.env.GHL_LOCATION_ID,
    aws: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY,
    smtp: !!process.env.SMTP_HOST,
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Platform configuration and integration status
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Platform Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Platform Information
            </CardTitle>
            <CardDescription>Core platform details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Platform URL</p>
              <p className="font-mono text-sm">https://admin.diamondplusportal.com</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Node Environment</p>
              <p className="font-mono text-sm">{process.env.NODE_ENV || "development"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Admin Email</p>
              <p className="font-mono text-sm">{process.env.ADMIN_EMAIL || "Not configured"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Integration Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Integration Status
            </CardTitle>
            <CardDescription>Third-party service connections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Database</span>
              </div>
              <Badge variant={envStatus.database ? "default" : "destructive"}>
                {envStatus.database ? "Connected" : "Not configured"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Authentication</span>
              </div>
              <Badge variant={envStatus.auth ? "default" : "destructive"}>
                {envStatus.auth ? "Configured" : "Not configured"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">GoHighLevel</span>
              </div>
              <Badge variant={envStatus.ghl ? "default" : "secondary"}>
                {envStatus.ghl ? "Connected" : "Not configured"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">AWS S3</span>
              </div>
              <Badge variant={envStatus.aws ? "default" : "secondary"}>
                {envStatus.aws ? "Connected" : "Not configured"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Email (SMTP)</span>
              </div>
              <Badge variant={envStatus.smtp ? "default" : "secondary"}>
                {envStatus.smtp ? "Connected" : "Not configured"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* GoHighLevel Settings */}
        <Card>
          <CardHeader>
            <CardTitle>GoHighLevel Configuration</CardTitle>
            <CardDescription>CRM integration settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Location ID</p>
              <p className="font-mono text-sm">
                {process.env.GHL_LOCATION_ID ? 
                  `${process.env.GHL_LOCATION_ID.slice(0, 8)}...` : 
                  "Not configured"
                }
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Private Key</p>
              <p className="font-mono text-sm">
                {process.env.GHL_PRIVATE_KEY ? 
                  `pit-${process.env.GHL_PRIVATE_KEY.slice(4, 12)}...` : 
                  "Not configured"
                }
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Free Course Tag</p>
              <p className="font-mono text-sm">free course</p>
            </div>
          </CardContent>
        </Card>

        {/* Storage Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Configuration</CardTitle>
            <CardDescription>Video storage settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Storage Type</p>
              <p className="font-mono text-sm">
                {envStatus.aws ? "AWS S3" : "Local Storage"}
              </p>
            </div>
            {envStatus.aws && (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">S3 Bucket</p>
                  <p className="font-mono text-sm">{process.env.S3_BUCKET_NAME || "Not configured"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">AWS Region</p>
                  <p className="font-mono text-sm">{process.env.AWS_REGION || "Not configured"}</p>
                </div>
              </>
            )}
            {!envStatus.aws && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Local Path</p>
                <p className="font-mono text-sm">/public/videos/</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>
            Configure these environment variables in your .env.local file or hosting provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4 font-mono text-sm">
            <p className="text-muted-foreground"># Required - Supabase</p>
            <p>NEXT_PUBLIC_SUPABASE_URL=https://birthcsvtmayyxrzzyhh.supabase.co</p>
            <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...</p>
            <p>SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...</p>
            <br />
            <p className="text-muted-foreground"># Database</p>
            <p>DATABASE_URL=postgresql://...</p>
            <br />
            <p className="text-muted-foreground"># GoHighLevel (Optional)</p>
            <p>GHL_PRIVATE_KEY=pit-xxx...</p>
            <p>GHL_LOCATION_ID=xxx...</p>
            <br />
            <p className="text-muted-foreground"># AWS S3 (Optional)</p>
            <p>AWS_REGION=us-east-1</p>
            <p>AWS_ACCESS_KEY_ID=xxx...</p>
            <p>AWS_SECRET_ACCESS_KEY=xxx...</p>
            <p>S3_BUCKET_NAME=your-bucket</p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}// Force dynamic rendering
export const dynamic = 'force-dynamic'
