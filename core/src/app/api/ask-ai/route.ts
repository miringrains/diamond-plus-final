import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/supabase/auth-server'
import OpenAI from 'openai'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(request: NextRequest) {
  try {
    // Optional: Check for session but don't require it
    const session = await auth()
    
    const { message } = await request.json()
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }

    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not configured')
      return NextResponse.json({ 
        reply: "I'm sorry, but the AI service is not properly configured. Please contact support." 
      })
    }

    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: `You are Ask Ricky AI, an AI assistant that embodies the coaching style and expertise of Ricky Carruth. 
          You specialize in real estate sales, success strategies, and motivational coaching.
          Respond in a friendly, encouraging, and actionable manner.
          Keep responses concise but valuable.
          Focus on practical advice that can be implemented immediately.`
        },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response."

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Ask AI error:', error)
    
    // Check if it's an OpenAI API error
    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error:', error.status, error.message)
      if (error.status === 401) {
        return NextResponse.json({ 
          reply: "Authentication error with AI service. Please check the API key configuration." 
        })
      }
    }
    
    return NextResponse.json({ 
      reply: "I encountered an unexpected error. Please try again." 
    })
  }
}
