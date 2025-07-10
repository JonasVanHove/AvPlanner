import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // You'll need this for admin operations

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateDatabaseConstraint() {
  try {
    console.log('Updating database constraint to include remote status...')
    
    // Drop existing constraint
    const { error: dropError } = await supabase.rpc('sql', {
      query: 'ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_status_check;'
    })
    
    if (dropError) {
      console.error('Error dropping constraint:', dropError)
      return
    }
    
    // Add new constraint with remote status
    const { error: addError } = await supabase.rpc('sql', {
      query: `ALTER TABLE availability ADD CONSTRAINT availability_status_check 
              CHECK (status IN ('available', 'remote', 'unavailable', 'need_to_check', 'absent', 'holiday', 'maybe'));`
    })
    
    if (addError) {
      console.error('Error adding constraint:', addError)
      return
    }
    
    console.log('Database constraint updated successfully!')
    
  } catch (error) {
    console.error('Error updating database:', error)
  }
}

updateDatabaseConstraint()
