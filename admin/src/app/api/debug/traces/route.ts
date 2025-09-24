import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lessonId = searchParams.get('lessonId')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Read the trace file
    const traceFile = path.join('/var/log/otel-collector/traces.json')
    const content = await fs.readFile(traceFile, 'utf-8')
    const lines = content.trim().split('\n').filter(line => line.trim())
    
    // Parse the last N lines
    const traces = []
    for (const line of lines.slice(-limit)) {
      try {
        const trace = JSON.parse(line)
        
        // Filter by lessonId or userId if provided
        if (lessonId || userId) {
          const hasLessonId = !lessonId || JSON.stringify(trace).includes(lessonId)
          const hasUserId = !userId || JSON.stringify(trace).includes(userId)
          
          if (hasLessonId && hasUserId) {
            traces.push(trace)
          }
        } else {
          traces.push(trace)
        }
      } catch (e) {
        // Skip invalid JSON lines
      }
    }
    
    // Extract relevant information from traces
    const formattedTraces = traces.map(trace => {
      if (!trace.resourceSpans?.[0]?.scopeSpans?.[0]?.spans?.[0]) {
        return null
      }
      
      const span = trace.resourceSpans[0].scopeSpans[0].spans[0]
      const attributes: Record<string, any> = {}
      
      // Extract attributes
      if (span.attributes) {
        for (const attr of span.attributes) {
          if (attr.key && attr.value) {
            attributes[attr.key] = attr.value.stringValue || attr.value.intValue || attr.value.boolValue || attr.value
          }
        }
      }
      
      // Extract events
      const events = []
      if (span.events) {
        for (const event of span.events) {
          const eventAttrs: Record<string, any> = {}
          if (event.attributes) {
            for (const attr of event.attributes) {
              if (attr.key && attr.value) {
                eventAttrs[attr.key] = attr.value.stringValue || attr.value.intValue || attr.value.boolValue || attr.value
              }
            }
          }
          events.push({
            name: event.name,
            time: event.timeUnixNano,
            attributes: eventAttrs
          })
        }
      }
      
      return {
        traceId: span.traceId,
        spanId: span.spanId,
        name: span.name,
        startTime: span.startTimeUnixNano,
        endTime: span.endTimeUnixNano,
        duration: span.endTimeUnixNano ? (parseInt(span.endTimeUnixNano) - parseInt(span.startTimeUnixNano)) / 1000000 : null,
        status: span.status,
        attributes,
        events,
        resource: trace.resource?.attributes || {}
      }
    }).filter(Boolean)
    
    // Sort by start time (most recent first)
    formattedTraces.sort((a, b) => {
      if (!a || !b) return 0
      const aTime = parseInt(a.startTime || '0')
      const bTime = parseInt(b.startTime || '0')
      return bTime - aTime
    })
    
    return NextResponse.json({
      success: true,
      count: formattedTraces.length,
      filters: {
        lessonId,
        userId,
        limit
      },
      traces: formattedTraces
    })
  } catch (error) {
    console.error('Error reading traces:', error)
    return NextResponse.json({
      error: 'Failed to read traces',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
