export default function DashboardLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-[#176FFF]" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
