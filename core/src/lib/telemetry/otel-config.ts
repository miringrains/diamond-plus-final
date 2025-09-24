// OpenTelemetry configuration for production
export const OTEL_CONFIG = {
  serviceName: 'diamond-district',
  serviceVersion: '0.1.0',
  domain: 'diamondplusportal.com',
  
  // Check if OTEL is enabled
  isEnabled: () => process.env.OTEL_ENABLED === 'true',
  
  // Get the OTLP endpoint
  getEndpoint: () => process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
  
  // Get resource attributes
  getResourceAttributes: () => ({
    'service.name': process.env.OTEL_SERVICE_NAME || 'diamond-district',
    'service.version': '0.1.0',
    'service.namespace': 'video-platform',
    'deployment.environment': process.env.NODE_ENV || 'development',
    'service.instance.id': process.env.pm_id || process.pid.toString(),
    'host.name': 'diamondplusportal.com',
  }),
  
  // Instrumentations to disable (reduce noise)
  disabledInstrumentations: [
    '@opentelemetry/instrumentation-fs',
    '@opentelemetry/instrumentation-net',
    '@opentelemetry/instrumentation-dns',
    '@opentelemetry/instrumentation-winston', // Since we don't have winston transport
  ],
  
  // URLs to ignore
  ignoreUrls: [
    /_next\/static/,
    /_next\/image/,
    /favicon/,
    /\/api\/health/,
    /\.js$/,
    /\.css$/,
    /\.map$/,
  ],
  
  // API endpoints to track specially
  apiEndpoints: {
    video: /\/api\/videos\//,
    progress: /\/api\/progress/,
    upload: /\/api\/upload/,
    auth: /\/api\/auth\//,
  },
};

// Helper to check if a URL should be ignored
export function shouldIgnoreUrl(url: string): boolean {
  return OTEL_CONFIG.ignoreUrls.some(pattern => pattern.test(url));
}

// Helper to categorize API endpoints
export function categorizeApiEndpoint(url: string): string | null {
  for (const [category, pattern] of Object.entries(OTEL_CONFIG.apiEndpoints)) {
    if (pattern.test(url)) {
      return category;
    }
  }
  return null;
}
