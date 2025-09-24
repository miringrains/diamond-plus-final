import { Span } from '@opentelemetry/api';
import { IncomingMessage, ClientRequest, RequestOptions } from 'http';
import { HttpInstrumentationConfig } from '@opentelemetry/instrumentation-http';

// Type guards to safely check request types
function isIncomingMessage(request: ClientRequest | IncomingMessage): request is IncomingMessage {
  return 'url' in request && 'headers' in request && 'method' in request;
}

function isClientRequest(request: ClientRequest | IncomingMessage): request is ClientRequest {
  return 'getHeader' in request && 'setHeader' in request;
}

// Create a robust HTTP instrumentation configuration
export function createHttpInstrumentationConfig(): HttpInstrumentationConfig {
  return {
    enabled: true,
    
    // Hook to add custom attributes to spans for incoming requests
    requestHook: (span: Span, request: ClientRequest | IncomingMessage) => {
      try {
        // For incoming requests (server-side)
        if (isIncomingMessage(request)) {
          const url = request.url || '';
          
          // Add basic attributes
          span.setAttributes({
            'http.domain': 'diamondplusportal.com',
            'http.url.path': url,
          });
          
          // Categorize API endpoints
          if (url.startsWith('/api/')) {
            span.setAttribute('http.route.type', 'api');
            
            if (url.includes('/api/videos/')) {
              span.setAttribute('api.category', 'video');
            } else if (url.includes('/api/progress')) {
              span.setAttribute('api.category', 'progress');
            } else if (url.includes('/api/upload')) {
              span.setAttribute('api.category', 'upload');
            } else if (url.includes('/api/auth/')) {
              span.setAttribute('api.category', 'auth');
            }
          }
          
          // Add request size for uploads
          const contentLength = request.headers['content-length'];
          if (contentLength) {
            span.setAttribute('http.request.body.size', parseInt(contentLength, 10));
          }
        }
        
        // For outgoing requests (client-side)
        if (isClientRequest(request)) {
          // Add any client-specific attributes here
          span.setAttribute('http.request.type', 'outgoing');
        }
      } catch (error) {
        // Don't let instrumentation errors break the app
        console.error('[OTEL] Error in requestHook:', error);
      }
    },
    
    // Hook to add custom attributes to responses
    responseHook: (span: Span, response: IncomingMessage | any) => {
      try {
        // Add response size
        if (response.headers && response.headers['content-length']) {
          span.setAttribute('http.response.body.size', parseInt(response.headers['content-length'], 10));
        }
        
        // Add response status category
        if (response.statusCode) {
          const statusCode = response.statusCode;
          if (statusCode >= 500) {
            span.setAttribute('http.response.category', 'server_error');
          } else if (statusCode >= 400) {
            span.setAttribute('http.response.category', 'client_error');
          } else if (statusCode >= 300) {
            span.setAttribute('http.response.category', 'redirect');
          } else if (statusCode >= 200) {
            span.setAttribute('http.response.category', 'success');
          }
        }
      } catch (error) {
        console.error('[OTEL] Error in responseHook:', error);
      }
    },
    
    // Function to ignore incoming requests we don't want to trace
    ignoreIncomingRequestHook: (request: IncomingMessage) => {
      const url = request.url || '';
      
      // Ignore static assets
      if (url.includes('/_next/static') || 
          url.includes('/_next/image') ||
          url.includes('/favicon') ||
          url.includes('.js') ||
          url.includes('.css') ||
          url.includes('.map') ||
          url.includes('.png') ||
          url.includes('.jpg') ||
          url.includes('.ico')) {
        return true;
      }
      
      // Ignore health checks
      if (url === '/api/health' || url === '/health') {
        return true;
      }
      
      // Ignore Next.js internal routes
      if (url.startsWith('/_next/') && !url.includes('/_next/data')) {
        return true;
      }
      
      return false;
    },
    
    // Function to ignore outgoing requests we don't want to trace
    ignoreOutgoingRequestHook: (request: RequestOptions) => {
      const hostname = request.hostname || request.host || '';
      
      // Ignore telemetry exports to prevent loops
      if (hostname.includes('localhost') && (request.port === 4318 || request.port === 4317)) {
        return true;
      }
      
      // Ignore OpenTelemetry collector endpoints
      if (hostname.includes('4318') || hostname.includes('4317')) {
        return true;
      }
      
      return false;
    },
    
    // Server name for the service
    serverName: 'diamondplusportal.com',
    
    // Only create spans when there's a parent span (reduces noise)
    requireParentforOutgoingSpans: false,
    requireParentforIncomingSpans: false,
    
    // Headers to capture as span attributes
    headersToSpanAttributes: {
      client: {
        requestHeaders: ['user-agent', 'x-forwarded-for'],
        responseHeaders: ['content-type', 'cache-control'],
      },
      server: {
        requestHeaders: ['user-agent', 'x-forwarded-for', 'referer'],
        responseHeaders: ['content-type', 'cache-control', 'x-response-time'],
      },
    },
  };
}
