export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
      <div className="prose prose-invert max-w-none">
        <p className="text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground">
          By accessing and using the Diamond District Course Platform, you agree to be bound by these Terms of Service.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Use of Service</h2>
        <p className="text-muted-foreground">
          The courses and content provided on this platform are for educational purposes only.
        </p>
      </div>
    </div>
  )
}
