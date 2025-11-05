"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Loader2, 
  Upload, 
  Save,
  AlertTriangle
} from "lucide-react"
import { User as SupabaseUser } from "@supabase/supabase-js"

interface UserProfileFormProps {
  user: SupabaseUser
  onProfileUpdate?: () => void
}

export function UserProfileForm({ user, onProfileUpdate }: UserProfileFormProps) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [profileImageUrl, setProfileImageUrl] = useState("")
  const [birthDate, setBirthDate] = useState<string>("")
  // Prefill from members table if available
  useEffect(() => {
    const init = async () => {
      try {
        const { data, error } = await supabase
          .from('members')
          .select('first_name, last_name, profile_image, profile_image_url, birth_date')
          .eq('email', user.email)
          .limit(1)
          .single()

        if (!error && data) {
          setFirstName(data.first_name || "")
          setLastName(data.last_name || "")
          // Prefer image stored for this email; do not auto-fallback to auth avatar here
          setProfileImageUrl(data.profile_image_url || data.profile_image || "")
          if (data.birth_date) {
            // ensure YYYY-MM-DD
            const d = new Date(data.birth_date)
            if (!isNaN(d.getTime())) {
              const yyyy = d.getFullYear()
              const mm = String(d.getMonth() + 1).padStart(2, '0')
              const dd = String(d.getDate()).padStart(2, '0')
              setBirthDate(`${yyyy}-${mm}-${dd}`)
            }
          }
        } else {
          // No member row found; as a last resort, use auth provider avatar if present
          const fallbackAuthAvatar = (user?.user_metadata as any)?.avatar_url || ""
          if (fallbackAuthAvatar) setProfileImageUrl(fallbackAuthAvatar)
        }
      } catch (e) {
        // no-op
      }
    }
    init()
  }, [user.email])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB')
      return
    }

    try {
      setUploading(true)
      setError('')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `profile-images/${fileName}`

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath)

  setProfileImageUrl(publicUrl)
    } catch (error: any) {
      console.error('Error uploading image:', error)
      setError(error.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      setLoading(true)
      setError('')

      const { error } = await supabase.rpc('update_user_profile_v2', {
        user_email: user.email,
        // Do not update names from this dialog
        new_first_name: null,
        new_last_name: null,
        new_profile_image: profileImageUrl || null,
        new_birth_date: birthDate ? new Date(birthDate).toISOString().slice(0,10) : null
      })

      if (error) {
        throw error
      }

      onProfileUpdate?.()
    } catch (error: any) {
      console.error('Error updating profile:', error)
      const msg = String(error?.message || '').toLowerCase()
      const needsFallback = msg.includes('could not find the function') || msg.includes('schema cache') || msg.includes('update_user_profile_v2')

      if (needsFallback) {
        try {
          // Fallback: update the members table directly using email
          const isoBirth = birthDate ? new Date(birthDate).toISOString().slice(0,10) : null
          const { error: updateError } = await supabase
            .from('members')
            .update({
              // store in both possible columns for compatibility
              profile_image_url: profileImageUrl || null,
              profile_image: profileImageUrl || null,
              birth_date: isoBirth,
            })
            .eq('email', user.email)

          if (updateError) {
            throw updateError
          }

          onProfileUpdate?.()
          return
        } catch (fallbackErr: any) {
          console.error('Fallback update failed:', fallbackErr)
          setError(fallbackErr?.message || 'Failed to update profile (fallback)')
          return
        }
      } else {
        setError(error.message || 'Failed to update profile')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Profile Image */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage 
                src={profileImageUrl || (user?.user_metadata as any)?.avatar_url || ''} 
                onError={() => setProfileImageUrl("")}
              />
              <AvatarFallback>
                {firstName?.[0] || user.email?.[0]?.toUpperCase()}
                {lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Names are not editable in this dialog; only photo and birth date. */}

          {/* Birth Date */}
          <div>
            <Label htmlFor="birthDate">Birth Date</Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>

          {/* Email is not editable here; omit field. */}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || uploading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
