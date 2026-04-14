// ============================================================
// Database table types — mirror the schema exactly
// ============================================================

export type TitleType = 'movie' | 'show'
export type EntryStatus = 'want_to_watch' | 'watching' | 'watched' | 'upcoming'
export type EntryPriority = 'high' | 'medium' | 'low'
export type AvailabilityType = 'flatrate' | 'rent' | 'buy' | 'ads' | 'free'
export type NotificationType = 'now_streaming' | 'new_season' | 'leaving_soon'

export interface Profile {
  id: string
  display_name: string
  is_admin: boolean
  can_invite: boolean
  can_delegate: boolean
  is_disabled: boolean
  invited_by: string | null
  consent_accepted_at: string | null
  consent_policy_version: string | null
  enable_recommendations: boolean
  created_at: string
}

export interface InviteCode {
  id: string
  code: string
  created_by: string
  used_by: string | null
  expires_at: string | null
  created_at: string
}

export interface CastMember {
  name: string
  character: string
  profile_path: string | null
}

export interface Title {
  id: string
  tmdb_id: number
  type: TitleType
  title: string
  overview: string | null
  poster_path: string | null
  backdrop_path: string | null
  release_date: string | null
  genres: string[]
  tmdb_rating: number | null
  runtime_minutes: number | null
  season_count: number | null
  episode_count: number | null
  tmdb_status: string | null
  // Enriched from detail + credits fetch
  cast_members: CastMember[] | null
  tagline: string | null
  director: string | null           // movies
  created_by: string | null         // shows
  network: string | null            // shows
  last_air_date: string | null      // shows
  next_episode_air_date: string | null  // shows
  in_production: boolean | null     // shows
  last_synced_at: string
  created_at: string
}

export interface WatchlistEntry {
  id: string
  user_id: string
  title_id: string
  status: EntryStatus
  priority: EntryPriority
  is_caught_up: boolean
  queue_position: number | null
  custom_tags: string[]
  current_season: number | null
  current_episode: number | null
  notes: string | null
  date_started: string | null
  date_completed: string | null
  user_rating: -1 | 1 | 2 | 3 | null
  created_at: string
  updated_at: string
}

export interface Rating {
  id: string
  user_id: string
  title_id: string
  rating: number | null
  review: string | null
  created_at: string
  updated_at: string
}

export interface UserSubscription {
  id: string
  user_id: string
  provider_id: number
  provider_name: string
  provider_logo_path: string | null
  created_at: string
}

export interface StreamingAvailability {
  id: string
  title_id: string
  provider_id: number
  provider_name: string
  provider_logo_path: string | null
  availability_type: AvailabilityType
  country_code: string
  last_checked_at: string
}

export interface NotificationPreferences {
  id: string
  user_id: string
  notify_now_streaming: boolean
  notify_new_season: boolean
  notify_leaving_soon: boolean
  email_enabled: boolean
  created_at: string
}

export interface NotificationLog {
  id: string
  user_id: string
  title_id: string
  type: NotificationType
  sent_at: string
}

// ============================================================
// TMDB API shapes (used before persisting to DB)
// ============================================================

export interface TMDBSearchResult {
  id: number
  media_type: 'movie' | 'tv' | 'person'
  title?: string          // movies
  name?: string           // shows
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string   // movies
  first_air_date?: string // shows
  genre_ids: number[]
  vote_average: number
}

export interface TMDBProviderEntry {
  provider_id: number
  provider_name: string
  logo_path: string
}

export interface TMDBWatchProviders {
  flatrate?: TMDBProviderEntry[]
  rent?: TMDBProviderEntry[]
  buy?: TMDBProviderEntry[]
  ads?: TMDBProviderEntry[]
  free?: TMDBProviderEntry[]
}

// ============================================================
// Composite types used in UI
// ============================================================

export interface WatchlistEntryWithTitle extends WatchlistEntry {
  title: Title
  profile?: { id: string; display_name: string }
}

// ============================================================
// Shared queues
// ============================================================

export interface SharedQueue {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface QueueMember {
  queue_id: string
  user_id: string
  joined_at: string
  // Joined
  profile?: { id: string; display_name: string }
}

export interface QueueTitle {
  id: string
  queue_id: string
  title_id: string
  added_by: string
  queue_position: number | null
  status: 'proposed' | 'active' | 'rejected' | 'shelved'
  created_at: string
  // Joined
  title?: Title
  added_by_profile?: { id: string; display_name: string }
}

// A title in a shared queue with each member's watchlist entry attached
export interface QueueTitleWithMemberEntries extends QueueTitle {
  title: Title
  member_entries: Array<{
    user_id: string
    display_name: string
    entry: WatchlistEntryWithTitle | null
  }>
}

export interface Recommendation {
  id: string
  from_user_id: string
  to_user_id: string
  title_id: string
  message: string | null
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  updated_at: string
  // Joined
  title?: Title
  from_profile?: { id: string; display_name: string }
}

// Form fields when adding or editing a watchlist entry
export interface EntryFormFields {
  status: EntryStatus
  priority: EntryPriority
  notes: string
  custom_tags: string[]
  current_season: number | null
  current_episode: number | null
}

// Filter bar state
export type SortField = 'created_at' | 'updated_at' | 'title' | 'tmdb_rating' | 'priority'
export type SortDir = 'asc' | 'desc'

export interface FilterState {
  search: string
  statuses: EntryStatus[]
  types: TitleType[]
  genres: string[]
  priorities: EntryPriority[]
  viewerIds: string[]        // empty = show all users' entries
  sortField: SortField
  sortDir: SortDir
}

export const DEFAULT_FILTER_STATE: FilterState = {
  search: '',
  statuses: [],
  types: [],
  genres: [],
  priorities: [],
  viewerIds: [],
  sortField: 'updated_at',
  sortDir: 'desc',
}

export const CURRENT_POLICY_VERSION = '2026-04'
