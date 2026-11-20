
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "connection_handshakes": {
                  Row: {
                    "created_at": string,"expires_at": string,"handshake_encrypted": string,"id": string,"marketplace": Database["public"]['Enums']["marketplace"],"state_hash": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at": string,"handshake_encrypted": string,"id"?: string,"marketplace": Database["public"]['Enums']["marketplace"],"state_hash": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"handshake_encrypted"?: string,"id"?: string,"marketplace"?: Database["public"]['Enums']["marketplace"],"state_hash"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"item_photos": {
                  Row: {
                    "created_at": string,"id": string,"item_id": string,"position": number,"storage_path": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"item_id": string,"position": number,"storage_path": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"item_id"?: string,"position"?: number,"storage_path"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_photos_item_id_user_id_fkey"
      columns: ["item_id","user_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"items": {
                  Row: {
                    "accepts_offers": boolean,"artist": string | null,"created_at": string,"currency": string,"description": string | null,"discogs_release_id": number | null,"equipment_condition": Database["public"]['Enums']["equipment_condition"] | null,"format": string | null,"id": string,"media_condition": Database["public"]['Enums']["record_condition"] | null,"price_minor": number | null,"release_year": number | null,"sleeve_condition": Database["public"]['Enums']["record_condition"] | null,"status": Database["public"]['Enums']["item_status"],"title": string,"type": Database["public"]['Enums']["item_type"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepts_offers"?: boolean,"artist"?: string | null,"created_at"?: string,"currency"?: string,"description"?: string | null,"discogs_release_id"?: number | null,"equipment_condition"?: Database["public"]['Enums']["equipment_condition"] | null,"format"?: string | null,"id"?: string,"media_condition"?: Database["public"]['Enums']["record_condition"] | null,"price_minor"?: number | null,"release_year"?: number | null,"sleeve_condition"?: Database["public"]['Enums']["record_condition"] | null,"status"?: Database["public"]['Enums']["item_status"],"title": string,"type": Database["public"]['Enums']["item_type"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "accepts_offers"?: boolean,"artist"?: string | null,"created_at"?: string,"currency"?: string,"description"?: string | null,"discogs_release_id"?: number | null,"equipment_condition"?: Database["public"]['Enums']["equipment_condition"] | null,"format"?: string | null,"id"?: string,"media_condition"?: Database["public"]['Enums']["record_condition"] | null,"price_minor"?: number | null,"release_year"?: number | null,"sleeve_condition"?: Database["public"]['Enums']["record_condition"] | null,"status"?: Database["public"]['Enums']["item_status"],"title"?: string,"type"?: Database["public"]['Enums']["item_type"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"listings": {
                  Row: {
                    "created_at": string,"error_message": string | null,"external_id": string | null,"id": string,"item_id": string,"marketplace": Database["public"]['Enums']["marketplace"],"status": Database["public"]['Enums']["listing_status"],"updated_at": string,"url": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"error_message"?: string | null,"external_id"?: string | null,"id"?: string,"item_id": string,"marketplace": Database["public"]['Enums']["marketplace"],"status"?: Database["public"]['Enums']["listing_status"],"updated_at"?: string,"url"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"error_message"?: string | null,"external_id"?: string | null,"id"?: string,"item_id"?: string,"marketplace"?: Database["public"]['Enums']["marketplace"],"status"?: Database["public"]['Enums']["listing_status"],"updated_at"?: string,"url"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listings_item_id_user_id_fkey"
      columns: ["item_id","user_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"offers": {
                  Row: {
                    "amount_minor": number,"buyer": string | null,"created_at": string,"currency": string,"expires_at": string | null,"external_id": string,"id": string,"listing_id": string,"status": Database["public"]['Enums']["offer_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"buyer"?: string | null,"created_at"?: string,"currency": string,"expires_at"?: string | null,"external_id": string,"id"?: string,"listing_id": string,"status"?: Database["public"]['Enums']["offer_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "amount_minor"?: number,"buyer"?: string | null,"created_at"?: string,"currency"?: string,"expires_at"?: string | null,"external_id"?: string,"id"?: string,"listing_id"?: string,"status"?: Database["public"]['Enums']["offer_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "offers_listing_id_user_id_fkey"
      columns: ["listing_id","user_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"platform_connections": {
                  Row: {
                    "access_token_encrypted": string | null,"created_at": string,"expires_at": string | null,"external_username": string | null,"id": string,"marketplace": Database["public"]['Enums']["marketplace"],"refresh_token_encrypted": string | null,"status": Database["public"]['Enums']["connection_status"],"token_secret_encrypted": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_token_encrypted"?: string | null,"created_at"?: string,"expires_at"?: string | null,"external_username"?: string | null,"id"?: string,"marketplace": Database["public"]['Enums']["marketplace"],"refresh_token_encrypted"?: string | null,"status"?: Database["public"]['Enums']["connection_status"],"token_secret_encrypted"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "access_token_encrypted"?: string | null,"created_at"?: string,"expires_at"?: string | null,"external_username"?: string | null,"id"?: string,"marketplace"?: Database["public"]['Enums']["marketplace"],"refresh_token_encrypted"?: string | null,"status"?: Database["public"]['Enums']["connection_status"],"token_secret_encrypted"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"currency": string,"id": string,"language": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"currency"?: string,"id": string,"language"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: string,"id"?: string,"language"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_tokens": {
                  Row: {
                    "created_at": string,"id": string,"token": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"token": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"token"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sales": {
                  Row: {
                    "buyer": string | null,"created_at": string,"currency": string,"external_order_id": string,"fees_minor": number,"id": string,"item_artist": string | null,"item_title": string,"listing_id": string | null,"marketplace": Database["public"]['Enums']["marketplace"],"price_minor": number,"sold_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "buyer"?: string | null,"created_at"?: string,"currency": string,"external_order_id": string,"fees_minor"?: number,"id"?: string,"item_artist"?: string | null,"item_title": string,"listing_id"?: string | null,"marketplace": Database["public"]['Enums']["marketplace"],"price_minor": number,"sold_at": string,"user_id": string
                  }
                  Update: {
                    "buyer"?: string | null,"created_at"?: string,"currency"?: string,"external_order_id"?: string,"fees_minor"?: number,"id"?: string,"item_artist"?: string | null,"item_title"?: string,"listing_id"?: string | null,"marketplace"?: Database["public"]['Enums']["marketplace"],"price_minor"?: number,"sold_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sales_listing_id_user_id_fkey"
      columns: ["listing_id","user_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id","user_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "connection_status": "connected"|"expired"|"revoked","equipment_condition": "new"|"like_new"|"good"|"fair"|"for_parts","item_status": "draft"|"active"|"sold"|"removed","item_type": "record"|"equipment","listing_status": "pending"|"published"|"error"|"paused"|"removed","marketplace": "ebay"|"discogs","offer_status": "pending"|"accepted"|"rejected"|"expired"|"withdrawn","record_condition": "M"|"NM"|"VG+"|"VG"|"G+"|"G"|"F"|"P"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "connection_status": ["connected", "expired", "revoked"],"equipment_condition": ["new", "like_new", "good", "fair", "for_parts"],"item_status": ["draft", "active", "sold", "removed"],"item_type": ["record", "equipment"],"listing_status": ["pending", "published", "error", "paused", "removed"],"marketplace": ["ebay", "discogs"],"offer_status": ["pending", "accepted", "rejected", "expired", "withdrawn"],"record_condition": ["M", "NM", "VG+", "VG", "G+", "G", "F", "P"]
          }
        }
} as const
