import { NextRequest, NextResponse } from 'next/server';
import { traceAsync, addSpanEvent } from '@/lib/telemetry';

export async function GET(req: NextRequest) {
  return traceAsync('api.test_otel', async () => {
    console.log('[Test OTEL] Endpoint called');
    console.log('[Test OTEL] OTEL_ENABLED:', process.env.OTEL_ENABLED);
    console.log('[Test OTEL] OTEL_SERVICE_NAME:', process.env.OTEL_SERVICE_NAME);
    console.log('[Test OTEL] OTEL_EXPORTER_OTLP_ENDPOINT:', process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
    
    // Add some test events
    addSpanEvent('test.event_1', { test: true });
    addSpanEvent('test.event_2', { timestamp: new Date().toISOString() });
    
    // Simulate some async work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    addSpanEvent('test.event_3', { work: 'completed' });
    
    return NextResponse.json({
      message: 'OpenTelemetry test endpoint',
      otel_enabled: process.env.OTEL_ENABLED === 'true',
      service_name: process.env.OTEL_SERVICE_NAME || 'not set',
      endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'not set',
      timestamp: new Date().toISOString()
    });
  }, {
    'http.method': 'GET',
    'http.route': '/api/test-otel',
    'test': true
  });
}
