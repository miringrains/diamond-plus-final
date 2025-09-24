import { trace, SpanStatusCode } from '@opentelemetry/api';

// Simple wrapper to check if OpenTelemetry is enabled
const isOtelEnabled = () => process.env.OTEL_ENABLED === 'true';

// Helper to trace async operations
export async function traceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  // If OpenTelemetry is not enabled, just run the function
  if (!isOtelEnabled()) {
    return fn();
  }

  const tracer = trace.getTracer('diamond-district', '0.1.0');
  const span = tracer.startSpan(name);
  
  try {
    if (attributes) {
      span.setAttributes(attributes);
    }
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  } finally {
    span.end();
  }
}

// Helper to add events to the current span
export function addSpanEvent(eventName: string, attributes?: Record<string, any>) {
  if (!isOtelEnabled()) return;
  
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(eventName, attributes);
  }
}

// Helper to record exceptions
export function recordException(error: Error, attributes?: Record<string, any>) {
  if (!isOtelEnabled()) return;
  
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    if (attributes) {
      span.setAttributes(attributes);
    }
  }
}
