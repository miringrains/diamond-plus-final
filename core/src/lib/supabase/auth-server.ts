import { createSupabaseServerClient } from './server'

export async function auth() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }
  
  // Get user profile for additional data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  const metadata = profile?.metadata as Record<string, any> | null
  
  return {
    user: {
      id: user.id,
      email: user.email || '',
      name: profile?.full_name || '',
      firstName: metadata?.first_name || '',
      lastName: metadata?.last_name || '',
      role: profile?.role || 'user',
      phone: metadata?.phone || '',
      createdAt: user.created_at,
    }
  }
}
