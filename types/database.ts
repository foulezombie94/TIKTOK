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
    }
  }
}

export type DbUser = Database['public']['Tables']['users']['Row']
export type DbVideo = Database['public']['Tables']['videos']['Row']
export type DbComment = Database['public']['Tables']['comments']['Row']
