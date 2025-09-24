import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTEL_CONFIG } from './otel-config';
import { createHttpInstrumentationConfig } from './http-instrumentation-config';

export async function initializeOpenTelemetry() {
  try {
    if (!OTEL_CONFIG.isEnabled()) {
      console.log('[OTEL] OpenTelemetry is disabled');
      return null;
    }
    
    const endpoint = OTEL_CONFIG.getEndpoint();
    console.log(`[OTEL] Initializing with service name: ${OTEL_CONFIG.serviceName}`);
    console.log(`[OTEL] OTLP Endpoint: ${endpoint}`);
    console.log(`[OTEL] Domain: ${OTEL_CONFIG.domain}`);
    
    const resource = new Resource(OTEL_CONFIG.getResourceAttributes());

    // Configure trace exporter
    const traceExporter = new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS ? 
        JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS) : {},
      timeoutMillis: 10000,
    });

    // Configure metrics exporter
    const metricExporter = new OTLPMetricExporter({
      url: `${endpoint}/v1/metrics`,
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS ? 
        JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS) : {},
      timeoutMillis: 10000,
    });

    const sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 10000,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable noisy/problematic instrumentations
          '@opentelemetry/instrumentation-fs': { enabled: false },
          '@opentelemetry/instrumentation-net': { enabled: false },
          '@opentelemetry/instrumentation-dns': { enabled: false },
          '@opentelemetry/instrumentation-winston': { enabled: false },
          // Use our properly typed HTTP instrumentation configuration
          '@opentelemetry/instrumentation-http': createHttpInstrumentationConfig(),
        }),
      ],
    });

    // Initialize the SDK
    sdk.start();
    
    // Graceful shutdown handlers
    const gracefulShutdown = async () => {
      console.log('[OTEL] Shutting down gracefully...');
      try {
        await sdk.shutdown();
        console.log('[OTEL] Shutdown complete');
      } catch (error) {
        console.error('[OTEL] Error during shutdown:', error);
      }
    };

    process.once('SIGTERM', gracefulShutdown);
    process.once('SIGINT', gracefulShutdown);
    
    console.log('[OTEL] OpenTelemetry initialized successfully');
    return sdk;
  } catch (error) {
    console.error('[OTEL] Failed to initialize OpenTelemetry:', error);
    throw error;
  }
}
