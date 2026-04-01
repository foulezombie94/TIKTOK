/**
 * Database Types — Supabase Schema Definition
 * Updated for Phase 4 Architecture
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
        }
      }
      videos: {
        Row: {
          id: string
          user_id: string
          video_url: string
          thumbnail_url: string | null
          caption: string | null
          music_name: string | null
          views_count: number
          created_at: string
        }
      }
      likes: {
        Row: {
          id: string
          user_id: string
          video_id: string
          created_at: string
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string
          video_id: string
          content: string
          created_at: string
        }
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          video_id: string
          created_at: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          actor_id: string
          video_id: string | null
          type: 'like' | 'comment' | 'follow' | 'bookmark' | 'gift'
          text: string | null
          read: boolean
          created_at: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          receiver_id: string
          content: string
          read: boolean
          created_at: string
        }
      }
      conversations: {
        Row: {
          id: string
          participant_1: string
          participant_2: string
          updated_at: string
          created_at: string
        }
      }
      wallets: {
        Row: {
          user_id: string
          balance: number
        }
      }
      transactions: {
        Row: {
          id: string
          sender_id: string | null
          receiver_id: string
          amount: number
          type: 'purchase' | 'gift'
          video_id: string | null
          created_at: string
        }
      }
      admin_roles: {
        Row: {
          user_id: string
          level_access: string
        }
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          video_id: string
          reason: string
          status: 'pending' | 'resolved' | 'rejected'
          created_at: string
        }
      }
      video_views: {
        Row: {
          id: string
          user_id: string
          video_id: string
          created_at: string
        }
      }
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          ip_address: string | null
          user_agent: string | null
          metadata: Record<string, unknown>
          created_at: string
        }
      }
    }
    Functions: {
      get_fyp_videos: {
        Args: {
          p_user_id: string
          p_offset: number
          p_limit: number
        }
        Returns: FeedVideoRow[]
      }
      get_fyp_videos_cursor: {
        Args: {
          p_user_id: string
          p_cursor: string | null
          p_cursor_id: string | null
          p_limit: number
        }
        Returns: FeedVideoRow[]
      }
      send_gift: {
        Args: {
          p_receiver_id: string
          p_amount: number
          p_video_id: string
        }
        Returns: boolean
      }
      credit_wallet: {
        Args: {
          p_user_id: string
          p_amount: number
        }
        Returns: boolean
      }
      get_creator_dashboard: {
        Args: {
          p_creator_id: string
        }
        Returns: CreatorDashboardData
      }
      check_username_availability: {
        Args: {
          p_username: string
        }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_resource_type?: string
          p_resource_id?: string
          p_metadata?: Record<string, unknown>
        }
        Returns: void
      }
    }
  }
}

// Feed video row returned by RPC functions
export interface FeedVideoRow {
  id: string
  user_id: string
  video_url: string
  thumbnail_url: string | null
  caption: string | null
  music_name: string | null
  views_count: number
  created_at: string
  username: string
  display_name: string | null
  avatar_url: string | null
  likes_count: number
  comments_count: number
  bookmarks_count: number
  user_has_liked: boolean
  user_has_saved: boolean
  user_is_following: boolean
}

// Creator dashboard data
export interface CreatorDashboardData {
  total_views_30d: number
  total_coins: number
  chartData: Array<{ date: string; daily_views: number }>
}

// Convenience type aliases
export type DbUser = Database['public']['Tables']['users']['Row']
export type DbVideo = Database['public']['Tables']['videos']['Row']
export type DbComment = Database['public']['Tables']['comments']['Row']
export type DbNotification = Database['public']['Tables']['notifications']['Row']
export type DbMessage = Database['public']['Tables']['messages']['Row']
export type DbTransaction = Database['public']['Tables']['transactions']['Row']
export type DbWallet = Database['public']['Tables']['wallets']['Row']
export type DbReport = Database['public']['Tables']['reports']['Row']
export type DbAuditLog = Database['public']['Tables']['audit_log']['Row']
