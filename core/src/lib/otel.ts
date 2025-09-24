import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import crypto from 'crypto';

export const svc = { name: 'diamond-district' };

// Fast hash function for PII protection
export function hashId(s: string): string {
  if (!s) return 'anonymous';
  return crypto.createHash('sha256').update(s).digest('hex').substring(0, 16);
}

// Base attributes for spans
export function spanAttrBase({
  userId,
  courseId,
  slug
}: {
  userId?: string;
  courseId?: string;
  slug?: string;
}) {
  const attrs: Record<string, any> = {};
  
  if (userId) {
    attrs['app.user.hash'] = hashId(userId);
  }
  if (courseId) {
    attrs['app.course.id'] = courseId;
  }
  if (slug) {
    attrs['app.course.slug'] = slug;
  }
  
  return attrs;
}

// Get current trace context headers
export function getTraceHeaders(): Record<string, string> {
  try {
    const span = trace.getActiveSpan();
    if (!span) return {};
    
    const spanContext = span.spanContext();
    if (!spanContext || !spanContext.traceId || !spanContext.spanId) return {};
    
    const traceparent = `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags.toString(16).padStart(2, '0')}`;
    
    return {
      'traceparent': traceparent
    };
  } catch (error) {
    // Silently fail if telemetry is not initialized
    return {};
  }
}

// Helper to propagate trace context
export function propagateContext(headers: Headers) {
  try {
    const traceHeaders = getTraceHeaders();
    Object.entries(traceHeaders).forEach(([key, value]) => {
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    });
  } catch (error) {
    // Silently fail if headers are not available
  }
}

// Create a tracer instance
export const tracer = trace.getTracer(svc.name, '1.0.0');

// Helper for creating spans with standard attributes
export function createSpan(
  name: string,
  options?: {
    kind?: SpanKind;
    attributes?: Record<string, any>;
  }
) {
  return tracer.startSpan(name, {
    kind: options?.kind || SpanKind.INTERNAL,
    attributes: {
      'service.name': svc.name,
      ...options?.attributes
    }
  });
}
