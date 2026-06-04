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
      aprovacoes: {
        Row: {
          created_at: string
          data: string
          documento: string | null
          etapa: string
          id: string
          ip_address: string | null
          nome_aprovador: string
          projeto_id: string
          token_cliente: string | null
        }
        Insert: {
          created_at?: string
          data?: string
          documento?: string | null
          etapa: string
          id?: string
          ip_address?: string | null
          nome_aprovador: string
          projeto_id: string
          token_cliente?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          documento?: string | null
          etapa?: string
          id?: string
          ip_address?: string | null
          nome_aprovador?: string
          projeto_id?: string
          token_cliente?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aprovacoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      arquivos_projeto: {
        Row: {
          created_at: string | null
          dropbox_path: string
          etapa: string | null
          id: string
          liberado: boolean | null
          nome_arquivo: string
          projeto_id: string | null
        }
        Insert: {
          created_at?: string | null
          dropbox_path: string
          etapa?: string | null
          id?: string
          liberado?: boolean | null
          nome_arquivo: string
          projeto_id?: string | null
        }
        Update: {
          created_at?: string | null
          dropbox_path?: string
          etapa?: string | null
          id?: string
          liberado?: boolean | null
          nome_arquivo?: string
          projeto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_projeto_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      base_conhecimento: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      briefings: {
        Row: {
          cidade: string | null
          cliente_id: string | null
          criado_em: string
          email: string | null
          id: string
          lead_id: string | null
          nome: string | null
          origem: string | null
          preenchido_em: string | null
          respostas: Json | null
          status: string
          tipo_projeto: string | null
          token: string | null
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          cliente_id?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          nome?: string | null
          origem?: string | null
          preenchido_em?: string | null
          respostas?: Json | null
          status?: string
          tipo_projeto?: string | null
          token?: string | null
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          cliente_id?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          nome?: string | null
          origem?: string | null
          preenchido_em?: string | null
          respostas?: Json | null
          status?: string
          tipo_projeto?: string | null
          token?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "briefings_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      calculos_proposta: {
        Row: {
          complexidade: number
          created_at: string
          custo_hora_momento: number
          fases: Json
          horas_total: number
          id: string
          observacoes: string | null
          proposal_id: string
          updated_at: string
          valor_completo: number
          valor_executivo: number
        }
        Insert: {
          complexidade?: number
          created_at?: string
          custo_hora_momento?: number
          fases?: Json
          horas_total?: number
          id?: string
          observacoes?: string | null
          proposal_id: string
          updated_at?: string
          valor_completo?: number
          valor_executivo?: number
        }
        Update: {
          complexidade?: number
          created_at?: string
          custo_hora_momento?: number
          fases?: Json
          horas_total?: number
          id?: string
          observacoes?: string | null
          proposal_id?: string
          updated_at?: string
          valor_completo?: number
          valor_executivo?: number
        }
        Relationships: [
          {
            foreignKeyName: "calculos_proposta_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          area_m2: number | null
          briefing_enviado: boolean | null
          briefing_preenchido: boolean | null
          cidade: string | null
          contrato_assinado: boolean | null
          contrato_assinado_em: string | null
          contrato_gerado: boolean | null
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          endereco_imovel: string | null
          etapa_fluxo: string | null
          id: string
          imovel_definido: string | null
          nome: string
          observacoes: string | null
          orcamento: string | null
          origem: string | null
          prazo: string | null
          proposta_enviada: boolean | null
          quem_decide: string | null
          reuniao_agendada: boolean | null
          reuniao_data: string | null
          reuniao_link: string | null
          reuniao_local: string | null
          reuniao_notas: string | null
          status_comercial: string | null
          tipo_projeto: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          area_m2?: number | null
          briefing_enviado?: boolean | null
          briefing_preenchido?: boolean | null
          cidade?: string | null
          contrato_assinado?: boolean | null
          contrato_assinado_em?: string | null
          contrato_gerado?: boolean | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco_imovel?: string | null
          etapa_fluxo?: string | null
          id?: string
          imovel_definido?: string | null
          nome: string
          observacoes?: string | null
          orcamento?: string | null
          origem?: string | null
          prazo?: string | null
          proposta_enviada?: boolean | null
          quem_decide?: string | null
          reuniao_agendada?: boolean | null
          reuniao_data?: string | null
          reuniao_link?: string | null
          reuniao_local?: string | null
          reuniao_notas?: string | null
          status_comercial?: string | null
          tipo_projeto?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          area_m2?: number | null
          briefing_enviado?: boolean | null
          briefing_preenchido?: boolean | null
          cidade?: string | null
          contrato_assinado?: boolean | null
          contrato_assinado_em?: string | null
          contrato_gerado?: boolean | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco_imovel?: string | null
          etapa_fluxo?: string | null
          id?: string
          imovel_definido?: string | null
          nome?: string
          observacoes?: string | null
          orcamento?: string | null
          origem?: string | null
          prazo?: string | null
          proposta_enviada?: boolean | null
          quem_decide?: string | null
          reuniao_agendada?: boolean | null
          reuniao_data?: string | null
          reuniao_link?: string | null
          reuniao_local?: string | null
          reuniao_notas?: string | null
          status_comercial?: string | null
          tipo_projeto?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
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
      configuracoes: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      contexto_marketing_ativo: {
        Row: {
          cliente: string
          created_at: string | null
          etapa_atual: string | null
          id: string
          proxima_entrega: string | null
          status: string | null
          tipo: string | null
          user_id: string
        }
        Insert: {
          cliente: string
          created_at?: string | null
          etapa_atual?: string | null
          id?: string
          proxima_entrega?: string | null
          status?: string | null
          tipo?: string | null
          user_id: string
        }
        Update: {
          cliente?: string
          created_at?: string | null
          etapa_atual?: string | null
          id?: string
          proxima_entrega?: string | null
          status?: string | null
          tipo?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contratos: {
        Row: {
          categoria_cancelamento: string | null
          cliente_id: string | null
          cliente_nome: string | null
          conteudo: string | null
          criado_em: string
          dados_gerais: Json | null
          data_cancelamento: string | null
          id: string
          lead_id: string | null
          motivo_cancelamento: string | null
          numero: string | null
          plano: string | null
          prazos: Json | null
          projeto_id: string | null
          revisao: number | null
          status: string
          tipo: string
          updated_at: string | null
          valores: Json | null
        }
        Insert: {
          categoria_cancelamento?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          conteudo?: string | null
          criado_em?: string
          dados_gerais?: Json | null
          data_cancelamento?: string | null
          id?: string
          lead_id?: string | null
          motivo_cancelamento?: string | null
          numero?: string | null
          plano?: string | null
          prazos?: Json | null
          projeto_id?: string | null
          revisao?: number | null
          status?: string
          tipo: string
          updated_at?: string | null
          valores?: Json | null
        }
        Update: {
          categoria_cancelamento?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          conteudo?: string | null
          criado_em?: string
          dados_gerais?: Json | null
          data_cancelamento?: string | null
          id?: string
          lead_id?: string | null
          motivo_cancelamento?: string | null
          numero?: string | null
          plano?: string | null
          prazos?: Json | null
          projeto_id?: string | null
          revisao?: number | null
          status?: string
          tipo?: string
          updated_at?: string | null
          valores?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_historico: {
        Row: {
          acao: string
          arquivo_url: string | null
          contrato_id: string | null
          criado_em: string
          id: string
          numero: string
          observacao: string | null
        }
        Insert: {
          acao: string
          arquivo_url?: string | null
          contrato_id?: string | null
          criado_em?: string
          id?: string
          numero: string
          observacao?: string | null
        }
        Update: {
          acao?: string
          arquivo_url?: string | null
          contrato_id?: string | null
          criado_em?: string
          id?: string
          numero?: string
          observacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_historico_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_historico_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_clientes"
            referencedColumns: ["id"]
          },
        ]
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
      depoimentos: {
        Row: {
          aprovado_em: string | null
          criado_em: string
          id: string
          pesquisa_id: string | null
          publicado_em: string | null
          status: string
          texto_formatado: string
          updated_at: string
        }
        Insert: {
          aprovado_em?: string | null
          criado_em?: string
          id?: string
          pesquisa_id?: string | null
          publicado_em?: string | null
          status?: string
          texto_formatado: string
          updated_at?: string
        }
        Update: {
          aprovado_em?: string | null
          criado_em?: string
          id?: string
          pesquisa_id?: string | null
          publicado_em?: string | null
          status?: string
          texto_formatado?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depoimentos_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas_satisfacao"
            referencedColumns: ["id"]
          },
        ]
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
      diretrizes_marketing: {
        Row: {
          content: string
          created_at: string
          id: string
          persona_examples: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          persona_examples?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          persona_examples?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      documento_links: {
        Row: {
          criado_em: string
          documento_id: string | null
          expira_em: string
          id: string
          token: string
        }
        Insert: {
          criado_em?: string
          documento_id?: string | null
          expira_em: string
          id?: string
          token: string
        }
        Update: {
          criado_em?: string
          documento_id?: string | null
          expira_em?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_links_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          criado_em: string
          etapa: string
          id: string
          nome: string
          projeto_id: string | null
          tamanho: number | null
          url: string
          versao: number
        }
        Insert: {
          criado_em?: string
          etapa: string
          id?: string
          nome: string
          projeto_id?: string | null
          tamanho?: number | null
          url: string
          versao?: number
        }
        Update: {
          criado_em?: string
          etapa?: string
          id?: string
          nome?: string
          projeto_id?: string | null
          tamanho?: number | null
          url?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "documentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_checklist: {
        Row: {
          categoria: string
          criado_em: string
          data_recebimento: string | null
          id: string
          item: string
          observacao: string | null
          projeto_id: string | null
          status: string
          updated_at: string
          url_arquivo: string | null
        }
        Insert: {
          categoria: string
          criado_em?: string
          data_recebimento?: string | null
          id?: string
          item: string
          observacao?: string | null
          projeto_id?: string | null
          status?: string
          updated_at?: string
          url_arquivo?: string | null
        }
        Update: {
          categoria?: string
          criado_em?: string
          data_recebimento?: string | null
          id?: string
          item?: string
          observacao?: string | null
          projeto_id?: string | null
          status?: string
          updated_at?: string
          url_arquivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_checklist_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      dropbox_settings: {
        Row: {
          access_token: string | null
          account_id: string | null
          contract_template_path: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          refresh_token: string | null
          updated_at: string | null
          vendor_template_path: string | null
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          contract_template_path?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string | null
          vendor_template_path?: string | null
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          contract_template_path?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string | null
          vendor_template_path?: string | null
        }
        Relationships: []
      }
      financeiro_parcelas: {
        Row: {
          agendamento_cobranca: Json | null
          cliente_id: string | null
          cliente_nome: string
          criado_em: string | null
          data_notificacao_cobranca: string | null
          data_recebimento: string | null
          data_vencimento: string
          descricao: string | null
          id: string
          iss_aliquota: number | null
          iss_valor: number | null
          nf_data_emissao: string | null
          nf_emitida: boolean | null
          nf_numero: string | null
          notificacoes_enviadas: Json | null
          numero_parcela: number
          projeto_id: string | null
          status: string
          total_parcelas: number
          valor: number
          valor_liquido: number | null
          valor_recebido: number | null
        }
        Insert: {
          agendamento_cobranca?: Json | null
          cliente_id?: string | null
          cliente_nome: string
          criado_em?: string | null
          data_notificacao_cobranca?: string | null
          data_recebimento?: string | null
          data_vencimento: string
          descricao?: string | null
          id?: string
          iss_aliquota?: number | null
          iss_valor?: number | null
          nf_data_emissao?: string | null
          nf_emitida?: boolean | null
          nf_numero?: string | null
          notificacoes_enviadas?: Json | null
          numero_parcela: number
          projeto_id?: string | null
          status?: string
          total_parcelas: number
          valor: number
          valor_liquido?: number | null
          valor_recebido?: number | null
        }
        Update: {
          agendamento_cobranca?: Json | null
          cliente_id?: string | null
          cliente_nome?: string
          criado_em?: string | null
          data_notificacao_cobranca?: string | null
          data_recebimento?: string | null
          data_vencimento?: string
          descricao?: string | null
          id?: string
          iss_aliquota?: number | null
          iss_valor?: number | null
          nf_data_emissao?: string | null
          nf_emitida?: boolean | null
          nf_numero?: string | null
          notificacoes_enviadas?: Json | null
          numero_parcela?: number
          projeto_id?: string | null
          status?: string
          total_parcelas?: number
          valor?: number
          valor_liquido?: number | null
          valor_recebido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_parcelas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_parcelas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_clientes: {
        Row: {
          autor_id: string | null
          cliente_id: string | null
          data_hora: string | null
          descricao: string | null
          id: string
          status_anterior: string | null
          status_novo: string | null
          tipo: string | null
        }
        Insert: {
          autor_id?: string | null
          cliente_id?: string | null
          data_hora?: string | null
          descricao?: string | null
          id?: string
          status_anterior?: string | null
          status_novo?: string | null
          tipo?: string | null
        }
        Update: {
          autor_id?: string | null
          cliente_id?: string | null
          data_hora?: string | null
          descricao?: string | null
          id?: string
          status_anterior?: string | null
          status_novo?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_conteudo: {
        Row: {
          conteudo: Json
          created_at: string
          favorito: boolean
          id: string
          input_usado: string | null
          post_type: string | null
          tipo: string
        }
        Insert: {
          conteudo: Json
          created_at?: string
          favorito?: boolean
          id?: string
          input_usado?: string | null
          post_type?: string | null
          tipo: string
        }
        Update: {
          conteudo?: Json
          created_at?: string
          favorito?: boolean
          id?: string
          input_usado?: string | null
          post_type?: string | null
          tipo?: string
        }
        Relationships: []
      }
      knowledge_base_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          is_active?: boolean
          updated_at?: string
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
          cliente_id: string | null
          created_at: string
          criado: string
          criado_por: string | null
          endereco: string | null
          estado: string | null
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
          cliente_id?: string | null
          created_at?: string
          criado?: string
          criado_por?: string | null
          endereco?: string | null
          estado?: string | null
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
          cliente_id?: string | null
          created_at?: string
          criado?: string
          criado_por?: string | null
          endereco?: string | null
          estado?: string | null
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
        Relationships: [
          {
            foreignKeyName: "leads_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_cliente: {
        Row: {
          created_at: string
          id: string
          mensagem: string
          projeto_id: string
          token_cliente: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mensagem: string
          projeto_id: string
          token_cliente?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mensagem?: string
          projeto_id?: string
          token_cliente?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_cliente_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          lida: boolean
          modulo: string
          tipo: Database["public"]["Enums"]["notification_type"]
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          lida?: boolean
          modulo: string
          tipo: Database["public"]["Enums"]["notification_type"]
          titulo: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          lida?: boolean
          modulo?: string
          tipo?: Database["public"]["Enums"]["notification_type"]
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pesquisas_satisfacao: {
        Row: {
          avaliacao_processo: string | null
          avaliacao_resultado: string | null
          cliente_nome: string
          comentario: string | null
          criado_em: string
          id: string
          nota_geral: number | null
          projeto_id: string | null
          respondida_em: string | null
          status: string
          tipo: string | null
          token: string
          updated_at: string
          video_dropbox_path: string | null
          video_url: string | null
        }
        Insert: {
          avaliacao_processo?: string | null
          avaliacao_resultado?: string | null
          cliente_nome: string
          comentario?: string | null
          criado_em?: string
          id?: string
          nota_geral?: number | null
          projeto_id?: string | null
          respondida_em?: string | null
          status?: string
          tipo?: string | null
          token: string
          updated_at?: string
          video_dropbox_path?: string | null
          video_url?: string | null
        }
        Update: {
          avaliacao_processo?: string | null
          avaliacao_resultado?: string | null
          cliente_nome?: string
          comentario?: string | null
          criado_em?: string
          id?: string
          nota_geral?: number | null
          projeto_id?: string | null
          respondida_em?: string | null
          status?: string
          tipo?: string | null
          token?: string
          updated_at?: string
          video_dropbox_path?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pesquisas_satisfacao_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_checklist: {
        Row: {
          concluido: boolean | null
          concluido_em: string | null
          concluido_por: string | null
          criado_em: string
          etapa: string
          id: string
          item: string
          projeto_id: string | null
        }
        Insert: {
          concluido?: boolean | null
          concluido_em?: string | null
          concluido_por?: string | null
          criado_em?: string
          etapa: string
          id?: string
          item: string
          projeto_id?: string | null
        }
        Update: {
          concluido?: boolean | null
          concluido_em?: string | null
          concluido_por?: string | null
          criado_em?: string
          etapa?: string
          id?: string
          item?: string
          projeto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projeto_checklist_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_etapas: {
        Row: {
          aprovado_por: string | null
          criado_em: string
          data_aprovacao: string | null
          data_entrega: string | null
          data_inicio: string | null
          etapa: string
          horas_estimadas: number | null
          horas_lancadas: number | null
          id: string
          moodboard_url: string | null
          notas: string | null
          projeto_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          aprovado_por?: string | null
          criado_em?: string
          data_aprovacao?: string | null
          data_entrega?: string | null
          data_inicio?: string | null
          etapa: string
          horas_estimadas?: number | null
          horas_lancadas?: number | null
          id?: string
          moodboard_url?: string | null
          notas?: string | null
          projeto_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          aprovado_por?: string | null
          criado_em?: string
          data_aprovacao?: string | null
          data_entrega?: string | null
          data_inicio?: string | null
          etapa?: string
          horas_estimadas?: number | null
          horas_lancadas?: number | null
          id?: string
          moodboard_url?: string | null
          notas?: string | null
          projeto_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_etapas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos: {
        Row: {
          area_m2: number | null
          cidade: string | null
          cliente_id: string | null
          criado_em: string | null
          criado_por: string | null
          data_inicio: string | null
          dropbox_folder: string | null
          etapa_atual: string | null
          horas_acompanhamento: number | null
          horas_anteprojeto: number | null
          horas_briefing: number | null
          horas_conceito: number | null
          horas_detalhamento: number | null
          horas_estimadas: number | null
          horas_executivo: number | null
          id: string
          link_apresentacao: string | null
          nome: string
          nome_cliente: string | null
          prazo_final: string | null
          proposta_id: string | null
          slug_cliente: string | null
          status_geral: string | null
          tipo: string | null
          token_cliente: string | null
          updated_at: string | null
          valor_proposta: number | null
          valor_total: number | null
        }
        Insert: {
          area_m2?: number | null
          cidade?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_inicio?: string | null
          dropbox_folder?: string | null
          etapa_atual?: string | null
          horas_acompanhamento?: number | null
          horas_anteprojeto?: number | null
          horas_briefing?: number | null
          horas_conceito?: number | null
          horas_detalhamento?: number | null
          horas_estimadas?: number | null
          horas_executivo?: number | null
          id?: string
          link_apresentacao?: string | null
          nome: string
          nome_cliente?: string | null
          prazo_final?: string | null
          proposta_id?: string | null
          slug_cliente?: string | null
          status_geral?: string | null
          tipo?: string | null
          token_cliente?: string | null
          updated_at?: string | null
          valor_proposta?: number | null
          valor_total?: number | null
        }
        Update: {
          area_m2?: number | null
          cidade?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_inicio?: string | null
          dropbox_folder?: string | null
          etapa_atual?: string | null
          horas_acompanhamento?: number | null
          horas_anteprojeto?: number | null
          horas_briefing?: number | null
          horas_conceito?: number | null
          horas_detalhamento?: number | null
          horas_estimadas?: number | null
          horas_executivo?: number | null
          id?: string
          link_apresentacao?: string | null
          nome?: string
          nome_cliente?: string | null
          prazo_final?: string | null
          proposta_id?: string | null
          slug_cliente?: string | null
          status_geral?: string | null
          tipo?: string | null
          token_cliente?: string | null
          updated_at?: string | null
          valor_proposta?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_views: {
        Row: {
          id: string
          proposal_id: string | null
          secoes_tempo: Json | null
          tempo_segundos: number | null
          viewed_at: string
        }
        Insert: {
          id?: string
          proposal_id?: string | null
          secoes_tempo?: Json | null
          tempo_segundos?: number | null
          viewed_at?: string
        }
        Update: {
          id?: string
          proposal_id?: string | null
          secoes_tempo?: Json | null
          tempo_segundos?: number | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_views_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          area: number | null
          cidade: string | null
          cliente: string
          cliente_id: string | null
          created_at: string
          data: string | null
          estado: string | null
          id: string
          link_proposta: string | null
          objetivo: string | null
          status: string | null
          tipo: string
          updated_at: string
          validade: number | null
          valor_completo: number | null
          valor_executivo: number | null
          versao: number | null
        }
        Insert: {
          area?: number | null
          cidade?: string | null
          cliente: string
          cliente_id?: string | null
          created_at?: string
          data?: string | null
          estado?: string | null
          id?: string
          link_proposta?: string | null
          objetivo?: string | null
          status?: string | null
          tipo: string
          updated_at?: string
          validade?: number | null
          valor_completo?: number | null
          valor_executivo?: number | null
          versao?: number | null
        }
        Update: {
          area?: number | null
          cidade?: string | null
          cliente?: string
          cliente_id?: string | null
          created_at?: string
          data?: string | null
          estado?: string | null
          id?: string
          link_proposta?: string | null
          objetivo?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string
          validade?: number | null
          valor_completo?: number | null
          valor_executivo?: number | null
          versao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      proposta_engajamento: {
        Row: {
          created_at: string | null
          dispositivo: string | null
          id: string
          proposta_id: string
          secao_capa_tempo: number | null
          secao_diagnostico_tempo: number | null
          secao_escopo_tempo: number | null
          secao_fechamento_tempo: number | null
          secao_investimento_tempo: number | null
          secao_manifesto_tempo: number | null
          tempo_total: number | null
        }
        Insert: {
          created_at?: string | null
          dispositivo?: string | null
          id?: string
          proposta_id: string
          secao_capa_tempo?: number | null
          secao_diagnostico_tempo?: number | null
          secao_escopo_tempo?: number | null
          secao_fechamento_tempo?: number | null
          secao_investimento_tempo?: number | null
          secao_manifesto_tempo?: number | null
          tempo_total?: number | null
        }
        Update: {
          created_at?: string | null
          dispositivo?: string | null
          id?: string
          proposta_id?: string
          secao_capa_tempo?: number | null
          secao_diagnostico_tempo?: number | null
          secao_escopo_tempo?: number | null
          secao_fechamento_tempo?: number | null
          secao_investimento_tempo?: number | null
          secao_manifesto_tempo?: number | null
          tempo_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposta_engajamento_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          area_m2: string | null
          cliente_cidade: string | null
          cliente_nome: string | null
          complexidade: string | null
          complexidade_multiplicador: number | null
          created_at: string | null
          custo_hora: number | null
          fases: Json | null
          id: string
          lucro_previsto: number | null
          margem_real: number | null
          observacoes: string | null
          plano_completo: number | null
          plano_executivo: number | null
          slug: string
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          area_m2?: string | null
          cliente_cidade?: string | null
          cliente_nome?: string | null
          complexidade?: string | null
          complexidade_multiplicador?: number | null
          created_at?: string | null
          custo_hora?: number | null
          fases?: Json | null
          id?: string
          lucro_previsto?: number | null
          margem_real?: number | null
          observacoes?: string | null
          plano_completo?: number | null
          plano_executivo?: number | null
          slug: string
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          area_m2?: string | null
          cliente_cidade?: string | null
          cliente_nome?: string | null
          complexidade?: string | null
          complexidade_multiplicador?: number | null
          created_at?: string | null
          custo_hora?: number | null
          fases?: Json | null
          id?: string
          lucro_previsto?: number | null
          margem_real?: number | null
          observacoes?: string | null
          plano_completo?: number | null
          plano_executivo?: number | null
          slug?: string
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      propostas_clientes: {
        Row: {
          acessos: number | null
          area: string | null
          cidade: string | null
          criado_em: string | null
          estado: string | null
          id: string
          nome_cliente: string | null
          objetivo: string | null
          slug: string
          tipo: string
          tipo_negocio: string | null
          ultimo_acesso: string | null
          validade: string | null
          valor_completo: string | null
          valor_executivo: string | null
        }
        Insert: {
          acessos?: number | null
          area?: string | null
          cidade?: string | null
          criado_em?: string | null
          estado?: string | null
          id?: string
          nome_cliente?: string | null
          objetivo?: string | null
          slug: string
          tipo: string
          tipo_negocio?: string | null
          ultimo_acesso?: string | null
          validade?: string | null
          valor_completo?: string | null
          valor_executivo?: string | null
        }
        Update: {
          acessos?: number | null
          area?: string | null
          cidade?: string | null
          criado_em?: string | null
          estado?: string | null
          id?: string
          nome_cliente?: string | null
          objetivo?: string | null
          slug?: string
          tipo?: string
          tipo_negocio?: string | null
          ultimo_acesso?: string | null
          validade?: string | null
          valor_completo?: string | null
          valor_executivo?: string | null
        }
        Relationships: []
      }
      servicos: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          descricao: string | null
          horas_estimadas: number
          id: string
          nome: string
          tipo: string | null
          vezes_usado: number | null
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          horas_estimadas: number
          id?: string
          nome: string
          tipo?: string | null
          vezes_usado?: number | null
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          horas_estimadas?: number
          id?: string
          nome?: string
          tipo?: string | null
          vezes_usado?: number | null
        }
        Relationships: []
      }
      sessoes_horas: {
        Row: {
          criado_em: string | null
          duracao_minutos: number | null
          etapa: string | null
          fim: string | null
          id: string
          inicio: string
          is_manual: boolean | null
          observacao: string | null
          projeto_id: string | null
          responsavel: string | null
        }
        Insert: {
          criado_em?: string | null
          duracao_minutos?: number | null
          etapa?: string | null
          fim?: string | null
          id?: string
          inicio: string
          is_manual?: boolean | null
          observacao?: string | null
          projeto_id?: string | null
          responsavel?: string | null
        }
        Update: {
          criado_em?: string | null
          duracao_minutos?: number | null
          etapa?: string | null
          fim?: string | null
          id?: string
          inicio?: string
          is_manual?: boolean | null
          observacao?: string | null
          projeto_id?: string | null
          responsavel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_horas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      templates_escopo: {
        Row: {
          ajuste_area: boolean | null
          ativo: boolean | null
          criado_em: string | null
          descricao: string | null
          id: string
          nome: string
          servicos_ids: string[]
        }
        Insert: {
          ajuste_area?: boolean | null
          ativo?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome: string
          servicos_ids: string[]
        }
        Update: {
          ajuste_area?: boolean | null
          ativo?: boolean | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          servicos_ids?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      contratos_clientes: {
        Row: {
          cliente_id: string | null
          criado_em: string | null
          id: string | null
          marco1_valor: string | null
          marco2_valor: string | null
          marco3_valor: string | null
          numero: string | null
          status: string | null
          valor_total: string | null
        }
        Insert: {
          cliente_id?: string | null
          criado_em?: string | null
          id?: string | null
          marco1_valor?: never
          marco2_valor?: never
          marco3_valor?: never
          numero?: string | null
          status?: string | null
          valor_total?: never
        }
        Update: {
          cliente_id?: string | null
          criado_em?: string | null
          id?: string | null
          marco1_valor?: never
          marco2_valor?: never
          marco3_valor?: never
          numero?: string | null
          status?: string | null
          valor_total?: never
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_briefing_by_token: {
        Args: { p_token: string }
        Returns: {
          cidade: string
          cliente_id: string
          criado_em: string
          email: string
          id: string
          lead_id: string
          leads: Json
          nome: string
          origem: string
          preenchido_em: string
          respostas: Json
          status: string
          tipo_projeto: string
          token: string
          whatsapp: string
        }[]
      }
      get_document_link_by_token: {
        Args: { p_token: string }
        Returns: {
          criado_em: string
          documento_id: string | null
          expira_em: string
          id: string
          token: string
        }[]
        SetofOptions: {
          from: "*"
          to: "documento_links"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_project_by_token_or_slug: {
        Args: { p_val: string }
        Returns: {
          area_m2: number | null
          cidade: string | null
          cliente_id: string | null
          criado_em: string | null
          criado_por: string | null
          data_inicio: string | null
          dropbox_folder: string | null
          etapa_atual: string | null
          horas_acompanhamento: number | null
          horas_anteprojeto: number | null
          horas_briefing: number | null
          horas_conceito: number | null
          horas_detalhamento: number | null
          horas_estimadas: number | null
          horas_executivo: number | null
          id: string
          link_apresentacao: string | null
          nome: string
          nome_cliente: string | null
          prazo_final: string | null
          proposta_id: string | null
          slug_cliente: string | null
          status_geral: string | null
          tipo: string | null
          token_cliente: string | null
          updated_at: string | null
          valor_proposta: number | null
          valor_total: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "projetos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_project_files_by_token: {
        Args: { p_val: string }
        Returns: {
          created_at: string | null
          dropbox_path: string
          etapa: string | null
          id: string
          liberado: boolean | null
          nome_arquivo: string
          projeto_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "arquivos_projeto"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_project_stages_by_token: {
        Args: { p_val: string }
        Returns: {
          aprovado_por: string | null
          criado_em: string
          data_aprovacao: string | null
          data_entrega: string | null
          data_inicio: string | null
          etapa: string
          horas_estimadas: number | null
          horas_lancadas: number | null
          id: string
          moodboard_url: string | null
          notas: string | null
          projeto_id: string | null
          status: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "projeto_etapas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_proposal_by_slug: {
        Args: { p_slug: string; p_tipo: string }
        Returns: {
          acessos: number | null
          area: string | null
          cidade: string | null
          criado_em: string | null
          estado: string | null
          id: string
          nome_cliente: string | null
          objetivo: string | null
          slug: string
          tipo: string
          tipo_negocio: string | null
          ultimo_acesso: string | null
          validade: string | null
          valor_completo: string | null
          valor_executivo: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "propostas_clientes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_survey_by_token: {
        Args: { p_token: string }
        Returns: {
          avaliacao_processo: string | null
          avaliacao_resultado: string | null
          cliente_nome: string
          comentario: string | null
          criado_em: string
          id: string
          nota_geral: number | null
          projeto_id: string | null
          respondida_em: string | null
          status: string
          tipo: string | null
          token: string
          updated_at: string
          video_dropbox_path: string | null
          video_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "pesquisas_satisfacao"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      increment_proposal_access: { Args: { p_id: string }; Returns: undefined }
    }
    Enums: {
      notification_type:
        | "urgente"
        | "financeiro"
        | "projeto"
        | "satisfacao"
        | "lead"
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
      notification_type: [
        "urgente",
        "financeiro",
        "projeto",
        "satisfacao",
        "lead",
      ],
    },
  },
} as const
