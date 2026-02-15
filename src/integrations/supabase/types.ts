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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ad_slots: {
        Row: {
          content: string | null
          created_at: string
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          priority: number
          slot_position: string
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          priority?: number
          slot_position?: string
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          priority?: number
          slot_position?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_invite_audit: {
        Row: {
          invite_id: string | null
          redeemed_at: string | null
          redeemed_by: string | null
        }
        Insert: {
          invite_id?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Update: {
          invite_id?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Relationships: []
      }
      admin_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message: string
          priority: number
          title: string
          type: Database["public"]["Enums"]["announcement_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
          priority?: number
          title: string
          type?: Database["public"]["Enums"]["announcement_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          priority?: number
          title?: string
          type?: Database["public"]["Enums"]["announcement_type"]
          updated_at?: string
        }
        Relationships: []
      }
      avatar_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number | null
          rarity: string
          type: string
          unlock_requirement: Json | null
          unlock_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number | null
          rarity?: string
          type: string
          unlock_requirement?: Json | null
          unlock_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number | null
          rarity?: string
          type?: string
          unlock_requirement?: Json | null
          unlock_type?: string
        }
        Relationships: []
      }
      crypto_exchange_requests: {
        Row: {
          admin_id: string | null
          admin_notes: string | null
          amount: number
          created_at: string
          crypto_address: string | null
          crypto_type: string | null
          fee_amount: number
          id: string
          payment_link: string | null
          payment_method: string
          payment_proof_url: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          admin_notes?: string | null
          amount: number
          created_at?: string
          crypto_address?: string | null
          crypto_type?: string | null
          fee_amount?: number
          id?: string
          payment_link?: string | null
          payment_method: string
          payment_proof_url?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          admin_notes?: string | null
          amount?: number
          created_at?: string
          crypto_address?: string | null
          crypto_type?: string | null
          fee_amount?: number
          id?: string
          payment_link?: string | null
          payment_method?: string
          payment_proof_url?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      drop_claims: {
        Row: {
          claimed_at: string
          drop_id: string
          id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          drop_id: string
          id?: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          drop_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drop_claims_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "product_drops"
            referencedColumns: ["id"]
          },
        ]
      }
      food_orders: {
        Row: {
          created_at: string
          id: string
          items: string[]
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          items: string[]
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          items?: string[]
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      forum_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      forum_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          reply_id: string | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type?: string
          reply_id?: string | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          reply_id?: string | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          is_best_answer: boolean | null
          likes_count: number | null
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_best_answer?: boolean | null
          likes_count?: number | null
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_best_answer?: boolean | null
          likes_count?: number | null
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          category_id: string | null
          content: string
          created_at: string
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          last_reply_at: string | null
          last_reply_by: string | null
          replies_count: number | null
          title: string
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          category_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_reply_at?: string | null
          last_reply_by?: string | null
          replies_count?: number | null
          title: string
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          category_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_reply_at?: string | null
          last_reply_by?: string | null
          replies_count?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      game_participants: {
        Row: {
          game_id: string
          id: string
          is_spectator: boolean
          joined_at: string
          result: Json | null
          user_id: string
          wager_amount: number
        }
        Insert: {
          game_id: string
          id?: string
          is_spectator?: boolean
          joined_at?: string
          result?: Json | null
          user_id: string
          wager_amount?: number
        }
        Update: {
          game_id?: string
          id?: string
          is_spectator?: boolean
          joined_at?: string
          result?: Json | null
          user_id?: string
          wager_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_participants_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          game_data: Json | null
          game_type: Database["public"]["Enums"]["game_type"]
          host_id: string | null
          id: string
          lobby_type: Database["public"]["Enums"]["lobby_type"]
          max_players: number
          status: Database["public"]["Enums"]["game_status"]
          updated_at: string
          wager_amount: number
          winner_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          game_data?: Json | null
          game_type: Database["public"]["Enums"]["game_type"]
          host_id?: string | null
          id?: string
          lobby_type?: Database["public"]["Enums"]["lobby_type"]
          max_players?: number
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
          wager_amount?: number
          winner_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          game_data?: Json | null
          game_type?: Database["public"]["Enums"]["game_type"]
          host_id?: string | null
          id?: string
          lobby_type?: Database["public"]["Enums"]["lobby_type"]
          max_players?: number
          status?: Database["public"]["Enums"]["game_status"]
          updated_at?: string
          wager_amount?: number
          winner_id?: string | null
        }
        Relationships: []
      }
      gift_card_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          gift_card_id: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          gift_card_id: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          gift_card_id?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_transactions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          balance: number
          claimed_at: string | null
          claimed_by: string | null
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          initial_balance: number
          pass2u_model_id: string | null
          pass2u_pass_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          balance?: number
          claimed_at?: string | null
          claimed_by?: string | null
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          initial_balance: number
          pass2u_model_id?: string | null
          pass2u_pass_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          claimed_at?: string | null
          claimed_by?: string | null
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          initial_balance?: number
          pass2u_model_id?: string | null
          pass2u_pass_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          best_streak: number | null
          game_type: Database["public"]["Enums"]["game_type"]
          id: string
          losses: number | null
          score: number | null
          streak: number | null
          updated_at: string
          user_id: string
          wins: number | null
        }
        Insert: {
          best_streak?: number | null
          game_type: Database["public"]["Enums"]["game_type"]
          id?: string
          losses?: number | null
          score?: number | null
          streak?: number | null
          updated_at?: string
          user_id: string
          wins?: number | null
        }
        Update: {
          best_streak?: number | null
          game_type?: Database["public"]["Enums"]["game_type"]
          id?: string
          losses?: number | null
          score?: number | null
          streak?: number | null
          updated_at?: string
          user_id?: string
          wins?: number | null
        }
        Relationships: []
      }
      lounge_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          message_type: string | null
          reply_to: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          reply_to?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          reply_to?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lounge_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "lounge_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      music_now_playing: {
        Row: {
          artist: string | null
          current_position: number | null
          id: string
          is_playing: boolean | null
          request_id: string | null
          source_type: string
          source_url: string
          started_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          artist?: string | null
          current_position?: number | null
          id?: string
          is_playing?: boolean | null
          request_id?: string | null
          source_type: string
          source_url: string
          started_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          artist?: string | null
          current_position?: number | null
          id?: string
          is_playing?: boolean | null
          request_id?: string | null
          source_type?: string
          source_url?: string
          started_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_now_playing_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "music_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      music_requests: {
        Row: {
          approved_by: string | null
          artist: string | null
          created_at: string | null
          id: string
          played_at: string | null
          requested_at: string | null
          source_type: string
          source_url: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          artist?: string | null
          created_at?: string | null
          id?: string
          played_at?: string | null
          requested_at?: string | null
          source_type: string
          source_url: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          artist?: string | null
          created_at?: string | null
          id?: string
          played_at?: string | null
          requested_at?: string | null
          source_type?: string
          source_url?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          customer_email: string
          customer_name: string | null
          id: string
          product_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_email: string
          customer_name?: string | null
          id?: string
          product_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          id?: string
          product_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          configuration: Json | null
          created_at: string
          display_name: string
          id: string
          is_enabled: boolean
          payment_method: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          configuration?: Json | null
          created_at?: string
          display_name: string
          id?: string
          is_enabled?: boolean
          payment_method: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          configuration?: Json | null
          created_at?: string
          display_name?: string
          id?: string
          is_enabled?: boolean
          payment_method?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      playlist_tracks: {
        Row: {
          artist: string | null
          created_at: string
          duration: number | null
          id: string
          playlist_id: string
          sort_order: number | null
          title: string
          url: string
        }
        Insert: {
          artist?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          playlist_id: string
          sort_order?: number | null
          title: string
          url: string
        }
        Update: {
          artist?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          playlist_id?: string
          sort_order?: number | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "user_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      product_drops: {
        Row: {
          claims_count: number | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          max_claims: number | null
          product_id: string | null
          starts_at: string
          title: string
        }
        Insert: {
          claims_count?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_claims?: number | null
          product_id?: string | null
          starts_at: string
          title: string
        }
        Update: {
          claims_count?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_claims?: number | null
          product_id?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_drops_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          bank: string | null
          bin: string | null
          brand: string | null
          card_type: string | null
          category: Database["public"]["Enums"]["product_category"]
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          expire: string | null
          file_url: string | null
          id: string
          image_url: string | null
          is_active: boolean
          price: number
          product_type: string | null
          short_description: string | null
          state: string | null
          title: string
          updated_at: string
          zip: string | null
        }
        Insert: {
          bank?: string | null
          bin?: string | null
          brand?: string | null
          card_type?: string | null
          category?: Database["public"]["Enums"]["product_category"]
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          expire?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          price?: number
          product_type?: string | null
          short_description?: string | null
          state?: string | null
          title: string
          updated_at?: string
          zip?: string | null
        }
        Update: {
          bank?: string | null
          bin?: string | null
          brand?: string | null
          card_type?: string | null
          category?: Database["public"]["Enums"]["product_category"]
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          expire?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          price?: number
          product_type?: string | null
          short_description?: string | null
          state?: string | null
          title?: string
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          require_membership: boolean
          site_password: string
          support_enabled: boolean | null
          support_queue_limit: number | null
          support_status: string | null
          telegram_admin_chat_id: string | null
          telegram_admin_enabled: boolean
          telegram_bot_token: string | null
          telegram_customer_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          require_membership?: boolean
          site_password?: string
          support_enabled?: boolean | null
          support_queue_limit?: number | null
          support_status?: string | null
          telegram_admin_chat_id?: string | null
          telegram_admin_enabled?: boolean
          telegram_bot_token?: string | null
          telegram_customer_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          require_membership?: boolean
          site_password?: string
          support_enabled?: boolean | null
          support_queue_limit?: number | null
          support_status?: string | null
          telegram_admin_chat_id?: string | null
          telegram_admin_enabled?: boolean
          telegram_bot_token?: string | null
          telegram_customer_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      stickers: {
        Row: {
          category: string | null
          created_at: string
          emoji: string
          id: string
          is_premium: boolean | null
          name: string
          price: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          emoji: string
          id?: string
          is_premium?: boolean | null
          name: string
          price?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          emoji?: string
          id?: string
          is_premium?: boolean | null
          name?: string
          price?: number | null
        }
        Relationships: []
      }
      support_chats: {
        Row: {
          created_at: string
          id: string
          status: string
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          chat_id: string
          created_at: string
          file_url: string | null
          id: string
          is_read: boolean
          message: string
          message_type: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_read?: boolean
          message: string
          message_type?: string
          sender_id: string
          sender_type: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_read?: boolean
          message?: string
          message_type?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "support_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      user_avatar_items: {
        Row: {
          id: string
          item_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_avatar_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "avatar_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_avatars: {
        Row: {
          avatar_url: string | null
          badges: string[] | null
          bio: string | null
          created_at: string
          display_name: string | null
          equipped_badges: string[] | null
          equipped_frame: string | null
          equipped_picture: string | null
          id: string
          level: number | null
          title: string | null
          total_losses: number | null
          total_wagered: number | null
          total_wins: number | null
          updated_at: string
          user_id: string
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          badges?: string[] | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          equipped_badges?: string[] | null
          equipped_frame?: string | null
          equipped_picture?: string | null
          id?: string
          level?: number | null
          title?: string | null
          total_losses?: number | null
          total_wagered?: number | null
          total_wins?: number | null
          updated_at?: string
          user_id: string
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          badges?: string[] | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          equipped_badges?: string[] | null
          equipped_frame?: string | null
          equipped_picture?: string | null
          id?: string
          level?: number | null
          title?: string | null
          total_losses?: number | null
          total_wagered?: number | null
          total_wins?: number | null
          updated_at?: string
          user_id?: string
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_avatars_equipped_frame_fkey"
            columns: ["equipped_frame"]
            isOneToOne: false
            referencedRelation: "avatar_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_avatars_equipped_picture_fkey"
            columns: ["equipped_picture"]
            isOneToOne: false
            referencedRelation: "avatar_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_playlists: {
        Row: {
          created_at: string
          id: string
          is_public: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stickers: {
        Row: {
          id: string
          purchased_at: string
          sticker_id: string
          user_id: string
        }
        Insert: {
          id?: string
          purchased_at?: string
          sticker_id: string
          user_id: string
        }
        Update: {
          id?: string
          purchased_at?: string
          sticker_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stickers_sticker_id_fkey"
            columns: ["sticker_id"]
            isOneToOne: false
            referencedRelation: "stickers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_room_participants: {
        Row: {
          id: string
          is_muted: boolean | null
          is_speaking: boolean | null
          joined_at: string | null
          room_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_muted?: boolean | null
          is_speaking?: boolean | null
          joined_at?: string | null
          room_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_muted?: boolean | null
          is_speaking?: boolean | null
          joined_at?: string | null
          room_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "voice_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_rooms: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          is_active: boolean | null
          max_participants: number | null
          name: string
          room_type: string
          scheduled_end: string | null
          scheduled_start: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name: string
          room_type?: string
          scheduled_end?: string | null
          scheduled_start?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name?: string
          room_type?: string
          scheduled_end?: string | null
          scheduled_start?: string | null
        }
        Relationships: []
      }
      wager_challenges: {
        Row: {
          challenged_id: string | null
          challenger_id: string
          created_at: string
          game_type: Database["public"]["Enums"]["game_type"]
          id: string
          message: string | null
          scheduled_at: string | null
          status: string | null
          updated_at: string
          wager_amount: number
        }
        Insert: {
          challenged_id?: string | null
          challenger_id: string
          created_at?: string
          game_type: Database["public"]["Enums"]["game_type"]
          id?: string
          message?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string
          wager_amount?: number
        }
        Update: {
          challenged_id?: string | null
          challenger_id?: string
          created_at?: string
          game_type?: Database["public"]["Enums"]["game_type"]
          id?: string
          message?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string
          wager_amount?: number
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          payment_method: string | null
          payment_reference: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_wallet_balance: {
        Args: {
          p_amount: number
          p_payment_method: string
          p_payment_reference?: string
        }
        Returns: Json
      }
      admin_adjust_wallet: {
        Args: {
          p_amount: number
          p_description?: string
          p_target_user_id: string
          p_type: string
        }
        Returns: Json
      }
      create_food_orders_table_if_not_exists: {
        Args: never
        Returns: undefined
      }
      create_order: {
        Args: { p_customer_email: string; p_product_id: string }
        Returns: Json
      }
      generate_gift_card_code: { Args: never; Returns: string }
      get_my_email: { Args: never; Returns: string }
      get_or_create_wallet: {
        Args: { p_user_id: string }
        Returns: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_product_download_url: {
        Args: { p_product_id: string }
        Returns: Json
      }
      get_site_access_requirements: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_wallet_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      place_game_wager: {
        Args: {
          p_game_id: string
          p_is_spectator?: boolean
          p_wager_amount: number
        }
        Returns: Json
      }
      purchase_with_wallet: { Args: { p_product_id: string }; Returns: Json }
      redeem_gift_card: { Args: { p_code: string }; Returns: Json }
      refund_game_players: { Args: { p_game_id: string }; Returns: Json }
      resolve_game:
        | {
            Args: { p_game_data?: Json; p_game_id: string; p_winner_id: string }
            Returns: Json
          }
        | {
            Args: { p_game_data?: Json; p_game_id: string; p_winner_id: string }
            Returns: Json
          }
      use_invite: {
        Args: { invite_email: string; user_id: string }
        Returns: undefined
      }
      validate_invite_on_signup: {
        Args: { invite_email: string }
        Returns: Json
      }
      validate_site_password: {
        Args: { input_password: string }
        Returns: Json
      }
    }
    Enums: {
      announcement_type: "restock" | "update" | "promo" | "info"
      app_role: "admin" | "customer"
      game_status: "waiting" | "in_progress" | "completed" | "cancelled"
      game_type: "dice" | "blackjack" | "roulette" | "coinflip"
      lobby_type: "1v1" | "2v2" | "vs_house" | "spectate"
      order_status: "pending" | "completed" | "failed" | "refunded"
      product_category: "software" | "courses" | "templates" | "assets"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      announcement_type: ["restock", "update", "promo", "info"],
      app_role: ["admin", "customer"],
      game_status: ["waiting", "in_progress", "completed", "cancelled"],
      game_type: ["dice", "blackjack", "roulette", "coinflip"],
      lobby_type: ["1v1", "2v2", "vs_house", "spectate"],
      order_status: ["pending", "completed", "failed", "refunded"],
      product_category: ["software", "courses", "templates", "assets"],
    },
  },
} as const
