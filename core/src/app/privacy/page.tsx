export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose prose-invert max-w-none">
        <p className="text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
        <p className="text-muted-foreground">
          We collect information you provide directly to us, such as when you create an account, enroll in a course, or contact us for support.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
        <p className="text-muted-foreground">
          We use the information we collect to provide, maintain, and improve our services, and to communicate with you.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Data Security</h2>
        <p className="text-muted-foreground">
          We implement appropriate technical and organizational measures to protect your personal information.
        </p>
      </div>
    </div>
  )
}
