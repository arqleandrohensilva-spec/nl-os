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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      config_escritorio: {
        Row: {
          atualizado_em: string | null
          custo_hora: number | null
          dias_mes: number | null
          horas_dia: number | null
          id: string
          margem_lucro: number | null
          mercados: string[] | null
          meta_custo_hora: number | null
          num_arquitetos: number | null
          percentual_produtivo: number | null
        }
        Insert: {
          atualizado_em?: string | null
          custo_hora?: number | null
          dias_mes?: number | null
          horas_dia?: number | null
          id?: string
          margem_lucro?: number | null
          mercados?: string[] | null
          meta_custo_hora?: number | null
          num_arquitetos?: number | null
          percentual_produtivo?: number | null
        }
        Update: {
          atualizado_em?: string | null
          custo_hora?: number | null
          dias_mes?: number | null
          horas_dia?: number | null
          id?: string
          margem_lucro?: number | null
          mercados?: string[] | null
          meta_custo_hora?: number | null
          num_arquitetos?: number | null
          percentual_produtivo?: number | null
        }
        Relationships: []
      }
      custos_escritorio: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          criado_em: string | null
          frequencia: string | null
          id: string
          nome: string
          valor: number
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          criado_em?: string | null
          frequencia?: string | null
          id?: string
          nome: string
          valor: number
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          criado_em?: string | null
          frequencia?: string | null
          id?: string
          nome?: string
          valor?: number
        }
        Relationships: []
      }
      diagnosticos_ia: {
        Row: {
          conteudo: string
          criado_em: string | null
          criado_por: string | null
          custo_hora_momento: number | null
          id: string
          modulo: string | null
          status: string | null
        }
        Insert: {
          conteudo: string
          criado_em?: string | null
          criado_por?: string | null
          custo_hora_momento?: number | null
          id?: string
          modulo?: string | null
          status?: string | null
        }
        Update: {
          conteudo?: string
          criado_em?: string | null
          criado_por?: string | null
          custo_hora_momento?: number | null
          id?: string
          modulo?: string | null
          status?: string | null
        }
        Relationships: []
      }
      lead_logs: {
        Row: {
          autor: string
          created_at: string
          data: string
          id: string
          lead_id: string
          nota: string
          tipo: string
        }
        Insert: {
          autor?: string
          created_at?: string
          data?: string
          id?: string
          lead_id: string
          nota?: string
          tipo: string
        }
        Update: {
          autor?: string
          created_at?: string
          data?: string
          id?: string
          lead_id?: string
          nota?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          area: number
          cidade: string
          created_at: string
          criado: string
          criado_por: string | null
          etapa_desde: string
          fechado_em: string | null
          id: string
          nome: string
          obs: string
          orcamento: number
          origem: string
          proxima_acao_data: string | null
          proxima_acao_nota: string | null
          proxima_acao_tipo: string | null
          score: number
          stage: string
          temp: string
          tipo: string
          updated_at: string
          whats: string
        }
        Insert: {
          area?: number
          cidade?: string
          created_at?: string
          criado?: string
          criado_por?: string | null
          etapa_desde?: string
          fechado_em?: string | null
          id?: string
          nome: string
          obs?: string
          orcamento?: number
          origem?: string
          proxima_acao_data?: string | null
          proxima_acao_nota?: string | null
          proxima_acao_tipo?: string | null
          score?: number
          stage?: string
          temp?: string
          tipo?: string
          updated_at?: string
          whats?: string
        }
        Update: {
          area?: number
          cidade?: string
          created_at?: string
          criado?: string
          criado_por?: string | null
          etapa_desde?: string
          fechado_em?: string | null
          id?: string
          nome?: string
          obs?: string
          orcamento?: number
          origem?: string
          proxima_acao_data?: string | null
          proxima_acao_nota?: string | null
          proxima_acao_tipo?: string | null
          score?: number
          stage?: string
          temp?: string
          tipo?: string
          updated_at?: string
          whats?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
