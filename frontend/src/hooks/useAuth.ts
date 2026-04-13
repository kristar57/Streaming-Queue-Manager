import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '../types'

export interface AuthContextValue {
  user: User | null
  profile: Profile | null
  authReady: boolean
  profileReady: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  authReady: false,
  profileReady: false,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}
