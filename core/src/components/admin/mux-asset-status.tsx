"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Clock, Globe, Shield, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface MuxAssetStatusProps {
  muxAssetId?: string | null
  muxPlaybackId?: string | null
  muxPolicy?: string | null
  muxReadyAt?: Date | null
  muxError?: string | null
  onRetryIngest?: () => void
  className?: string
}

export function MuxAssetStatus({
  muxAssetId,
  muxPlaybackId,
  muxPolicy,
  muxReadyAt,
  muxError,
  onRetryIngest,
  className
}: MuxAssetStatusProps) {
  if (!muxAssetId) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <AlertCircle className="h-4 w-4" />
        <span>No Mux asset</span>
      </div>
    )
  }

  // Error state
  if (muxError) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Processing Failed
          </Badge>
        </div>
        <p className="text-sm text-destructive">{muxError}</p>
        {onRetryIngest && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetryIngest}
            className="gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        )}
      </div>
    )
  }

  // Processing state
  if (!muxReadyAt) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3 animate-pulse" />
            Processing
          </Badge>
          <span className="text-sm text-muted-foreground">
            Video is being encoded...
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Asset ID:</span> {muxAssetId}
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div className="bg-primary h-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    )
  }

  // Ready state
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Ready
        </Badge>
        {muxPolicy === "signed" ? (
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            Signed
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <Globe className="h-3 w-3" />
            Public
          </Badge>
        )}
      </div>
      
      <div className="text-xs text-muted-foreground space-y-1">
        <div>
          <span className="font-medium">Asset ID:</span> {muxAssetId}
        </div>
        <div>
          <span className="font-medium">Playback ID:</span> {muxPlaybackId}
        </div>
        <div>
          <span className="font-medium">Ready at:</span> {format(muxReadyAt, "PPp")}
        </div>
      </div>
    </div>
  )
}
