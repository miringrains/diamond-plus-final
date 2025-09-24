import { trace, metrics, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';

// Get tracer and meter instances
const tracer = trace.getTracer('diamond-district.video', '1.0.0');
const meter = metrics.getMeter('diamond-district.video', '1.0.0');

// Define metrics for video operations
const videoMetrics = {
  loadTime: meter.createHistogram('video.load_time_ms', {
    description: 'Time for video to be ready for playback in milliseconds',
    unit: 'ms',
  }),
  resumeTime: meter.createHistogram('video.resume_time_ms', {
    description: 'Time to resume video at saved position in milliseconds',
    unit: 'ms',
  }),
  progressSaveTime: meter.createHistogram('progress.save_time_ms', {
    description: 'Time to save progress to database in milliseconds',
    unit: 'ms',
  }),
  bufferingEvents: meter.createCounter('video.buffering_events_total', {
    description: 'Total number of buffering events',
  }),
  progressUpdates: meter.createCounter('progress.updates_total', {
    description: 'Total number of progress updates',
  }),
  resumeFailures: meter.createCounter('video.resume_failures_total', {
    description: 'Total number of failed resume attempts',
  }),
};

/**
 * Simplified video telemetry helper for tracking video player operations
 * Addresses the specific issues mentioned in the player audit
 */
export class VideoTelemetry {
  private sessionSpan: Span | null = null;
  private lessonId: string;
  private userId: string;
  
  constructor(lessonId: string, userId: string) {
    this.lessonId = lessonId;
    this.userId = userId;
  }
  
  /**
   * Start a video viewing session
   */
  startSession(initialPosition: number = 0): void {
    this.sessionSpan = tracer.startSpan('video.session', {
      kind: SpanKind.CLIENT,
      attributes: {
        'lesson.id': this.lessonId,
        'user.id': this.userId,
        'video.initial_position_seconds': initialPosition,
        'video.has_saved_progress': initialPosition > 0,
      },
    });
  }
  
  /**
   * Track video load completion
   */
  trackVideoLoaded(duration: number, loadTimeMs: number): void {
    videoMetrics.loadTime.record(loadTimeMs, {
      'lesson.id': this.lessonId,
    });
    
    if (this.sessionSpan) {
      this.sessionSpan.addEvent('video.loaded', {
        'video.duration_seconds': duration,
        'video.load_time_ms': loadTimeMs,
      });
    }
  }
  
  /**
   * Track resume attempt - critical for debugging resume timing issues
   */
  trackResumeAttempt(targetPosition: number, actualPosition: number, success: boolean, timeToResumeMs: number): void {
    const positionDiff = Math.abs(targetPosition - actualPosition);
    
    if (success) {
      videoMetrics.resumeTime.record(timeToResumeMs, {
        'lesson.id': this.lessonId,
      });
    } else {
      videoMetrics.resumeFailures.add(1, {
        'lesson.id': this.lessonId,
      });
    }
    
    if (this.sessionSpan) {
      this.sessionSpan.addEvent('video.resume_attempt', {
        'resume.target_position': targetPosition,
        'resume.actual_position': actualPosition,
        'resume.position_diff': positionDiff,
        'resume.success': success,
        'resume.time_ms': timeToResumeMs,
      });
      
      // Log warning for significant position mismatches
      if (positionDiff > 2) {
        this.sessionSpan.addEvent('video.resume_position_mismatch', {
          'resume.expected': targetPosition,
          'resume.actual': actualPosition,
          'resume.diff': positionDiff,
        });
      }
    }
  }
  
  /**
   * Track buffering events
   */
  trackBuffering(durationMs: number): void {
    videoMetrics.bufferingEvents.add(1, {
      'lesson.id': this.lessonId,
    });
    
    if (this.sessionSpan) {
      this.sessionSpan.addEvent('video.buffering', {
        'buffering.duration_ms': durationMs,
      });
    }
  }
  
  /**
   * Track progress save operations
   */
  async trackProgressSave<T>(
    position: number,
    operation: () => Promise<T>
  ): Promise<T> {
    const span = tracer.startSpan('progress.save', {
      kind: SpanKind.CLIENT,
      attributes: {
        'lesson.id': this.lessonId,
        'user.id': this.userId,
        'progress.position_seconds': position,
      },
    });
    
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      videoMetrics.progressSaveTime.record(duration, {
        'lesson.id': this.lessonId,
      });
      
      videoMetrics.progressUpdates.add(1, {
        'lesson.id': this.lessonId,
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  }
  
  /**
   * Track double progress tracking issue
   */
  trackDuplicateProgressCall(timeSinceLastCall: number): void {
    if (this.sessionSpan) {
      this.sessionSpan.addEvent('progress.duplicate_call', {
        'duplicate.time_since_last_ms': timeSinceLastCall,
      });
    }
  }
  
  /**
   * Track page visibility changes (for missing persistence issue)
   */
  trackVisibilityChange(isHidden: boolean, currentPosition: number): void {
    if (this.sessionSpan) {
      this.sessionSpan.addEvent('page.visibility_change', {
        'page.is_hidden': isHidden,
        'video.position_at_change': currentPosition,
      });
    }
  }
  
  /**
   * End the video session
   */
  endSession(finalPosition: number, completed: boolean): void {
    if (this.sessionSpan) {
      this.sessionSpan.addEvent('video.session_end', {
        'video.final_position_seconds': finalPosition,
        'video.completed': completed,
      });
      this.sessionSpan.setStatus({ code: SpanStatusCode.OK });
      this.sessionSpan.end();
      this.sessionSpan = null;
    }
  }
  
  /**
   * Track any errors that occur
   */
  trackError(error: Error, context: Record<string, any> = {}): void {
    if (this.sessionSpan) {
      this.sessionSpan.recordException(error);
      this.sessionSpan.addEvent('video.error', {
        'error.message': error.message,
        'error.name': error.name,
        ...context,
      });
    }
  }
}

/**
 * Helper function to trace video API operations
 */
export async function traceVideoApiOperation<T>(
  operationName: string,
  attributes: Record<string, any>,
  operation: () => Promise<T>
): Promise<T> {
  const span = tracer.startSpan(operationName, {
    kind: SpanKind.SERVER,
    attributes,
  });
  
  try {
    const result = await operation();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    throw error;
  } finally {
    span.end();
  }
}
