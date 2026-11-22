export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      banners: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          link_url: string | null
          starts_at: string | null
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          starts_at?: string | null
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          starts_at?: string | null
          title?: string
        }
        Relationships: []
      }
      genres: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          email: string
          id: string
          kind: string
          name: string
          phone: string | null
          read: boolean
          subject: string | null
        }
        Insert: {
          body: string
          created_at?: string
          email: string
          id?: string
          kind?: string
          name: string
          phone?: string | null
          read?: boolean
          subject?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          email?: string
          id?: string
          kind?: string
          name?: string
          phone?: string | null
          read?: boolean
          subject?: string | null
        }
        Relationships: []
      }
      play_logs: {
        Row: {
          artist: string | null
          id: string
          played_at: string
          request_id: string | null
          song_id: string | null
          source: string
          title: string
        }
        Insert: {
          artist?: string | null
          id?: string
          played_at?: string
          request_id?: string | null
          song_id?: string | null
          source: string
          title: string
        }
        Update: {
          artist?: string | null
          id?: string
          played_at?: string
          request_id?: string | null
          song_id?: string | null
          source?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "song_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_logs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_items: {
        Row: {
          created_at: string
          id: string
          playlist_id: string
          position: number
          song_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          playlist_id: string
          position?: number
          song_id: string
        }
        Update: {
          created_at?: string
          id?: string
          playlist_id?: string
          position?: number
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          repeat: boolean
          shuffle: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          repeat?: boolean
          shuffle?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          repeat?: boolean
          shuffle?: boolean
        }
        Relationships: []
      }
      presenters: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          name: string
          photo_url: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      schedule_slots: {
        Row: {
          created_at: string
          day_of_week: number
          description: string | null
          end_time: string
          id: string
          presenter_id: string | null
          start_time: string
          title: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          description?: string | null
          end_time: string
          id?: string
          presenter_id?: string | null
          start_time: string
          title: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          description?: string | null
          end_time?: string
          id?: string
          presenter_id?: string | null
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_slots_presenter_id_fkey"
            columns: ["presenter_id"]
            isOneToOne: false
            referencedRelation: "presenters"
            referencedColumns: ["id"]
          },
        ]
      }
      song_requests: {
        Row: {
          created_at: string
          id: string
          link: string | null
          listener_name: string
          note: string | null
          played_at: string | null
          priority: number
          song_id: string | null
          song_text: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          youtube_id: string | null
          youtube_title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          listener_name: string
          note?: string | null
          played_at?: string | null
          priority?: number
          song_id?: string | null
          song_text: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          youtube_id?: string | null
          youtube_title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          listener_name?: string
          note?: string | null
          played_at?: string | null
          priority?: number
          song_id?: string | null
          song_text?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          youtube_id?: string | null
          youtube_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "song_requests_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          active: boolean
          album: string | null
          artist: string | null
          cover_url: string | null
          created_at: string
          duration_sec: number | null
          file_path: string
          file_url: string
          genre_id: string | null
          id: string
          mime_type: string | null
          size_bytes: number | null
          title: string
          year: number | null
        }
        Insert: {
          active?: boolean
          album?: string | null
          artist?: string | null
          cover_url?: string | null
          created_at?: string
          duration_sec?: number | null
          file_path: string
          file_url: string
          genre_id?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          title: string
          year?: number | null
        }
        Update: {
          active?: boolean
          album?: string | null
          artist?: string | null
          cover_url?: string | null
          created_at?: string
          duration_sec?: number | null
          file_path?: string
          file_url?: string
          genre_id?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          title?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "songs_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      station_settings: {
        Row: {
          accent_color: string | null
          active_playlist_id: string | null
          contact_email: string | null
          contact_phone: string | null
          facebook: string | null
          id: number
          instagram: string | null
          live_message: string | null
          live_program_active: boolean
          live_program_title: string | null
          live_program_url: string | null
          logo_url: string | null
          max_requests_per_hour: number
          mode: string
          name: string
          request_rules: string | null
          requests_enabled: boolean
          slogan: string | null
          stream_url: string | null
          tiktok: string | null
          updated_at: string
          whatsapp: string | null
          youtube: string | null
          youtube_requests_enabled: boolean
        }
        Insert: {
          accent_color?: string | null
          active_playlist_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          facebook?: string | null
          id?: number
          instagram?: string | null
          live_message?: string | null
          live_program_active?: boolean
          live_program_title?: string | null
          live_program_url?: string | null
          logo_url?: string | null
          max_requests_per_hour?: number
          mode?: string
          name?: string
          request_rules?: string | null
          requests_enabled?: boolean
          slogan?: string | null
          stream_url?: string | null
          tiktok?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube?: string | null
          youtube_requests_enabled?: boolean
        }
        Update: {
          accent_color?: string | null
          active_playlist_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          facebook?: string | null
          id?: number
          instagram?: string | null
          live_message?: string | null
          live_program_active?: boolean
          live_program_title?: string | null
          live_program_url?: string | null
          logo_url?: string | null
          max_requests_per_hour?: number
          mode?: string
          name?: string
          request_rules?: string | null
          requests_enabled?: boolean
          slogan?: string | null
          stream_url?: string | null
          tiktok?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube?: string | null
          youtube_requests_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "settings_playlist_fk"
            columns: ["active_playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_queue: {
        Args: never
        Returns: {
          created_at: string
          id: string
          listener: string
          priority: number
          song_id: string
          song_text: string
          status: Database["public"]["Enums"]["request_status"]
          youtube_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "listener"
      request_status:
        | "pending"
        | "approved"
        | "queued"
        | "playing"
        | "done"
        | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "listener"],
      request_status: [
        "pending",
        "approved",
        "queued",
        "playing",
        "done",
        "rejected",
      ],
    },
  },
} as const