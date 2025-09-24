export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Check if OpenTelemetry is enabled
    const otelEnabled = process.env.OTEL_ENABLED === 'true';
    
    if (otelEnabled) {
      console.log('[Instrumentation] OpenTelemetry is enabled, initializing...');
      try {
        // Dynamically import OpenTelemetry to avoid loading if not enabled
        const { initializeOpenTelemetry } = await import('./lib/telemetry/otel-setup');
        await initializeOpenTelemetry();
        console.log('[Instrumentation] OpenTelemetry initialized successfully');
        
        // Enhance console.log to include trace context
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        const { trace } = await import('@opentelemetry/api');
        
        console.log = (...args: any[]) => {
          const span = trace.getActiveSpan();
          if (span) {
            const spanContext = span.spanContext();
            originalLog(`[${spanContext.traceId}:${spanContext.spanId}]`, ...args);
          } else {
            originalLog(...args);
          }
        };
        
        console.error = (...args: any[]) => {
          const span = trace.getActiveSpan();
          if (span) {
            const spanContext = span.spanContext();
            originalError(`[${spanContext.traceId}:${spanContext.spanId}]`, ...args);
          } else {
            originalError(...args);
          }
        };
        
        console.warn = (...args: any[]) => {
          const span = trace.getActiveSpan();
          if (span) {
            const spanContext = span.spanContext();
            originalWarn(`[${spanContext.traceId}:${spanContext.spanId}]`, ...args);
          } else {
            originalWarn(...args);
          }
        };
        
      } catch (error) {
        console.error('[Instrumentation] Failed to initialize OpenTelemetry:', error);
        console.error('[Instrumentation] Continuing without OpenTelemetry...');
        // Don't crash the app if OpenTelemetry fails
      }
    } else {
      console.log('[Instrumentation] OpenTelemetry is disabled (set OTEL_ENABLED=true to enable)');
    }
    
    // Keep existing error handling - this always runs
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Instrumentation] Unhandled Rejection at:', promise, 'reason:', reason)
    })

    process.on('uncaughtException', (error) => {
      console.error('[Instrumentation] Uncaught Exception:', error)
      // Don't exit the process in production
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1)
      }
    })
  }
}