# Plano de Reconstrução do Pré-Briefing Público

Reconstrução completa do arquivo `BriefingPublic.tsx` para implementar fluxos personalizados baseados no tipo de projeto, com visual alinhado à identidade NL (Courier New, Cormorant Garamond, tons de bronze).

## Alterações Propostas

### 1. Estrutura de Fluxos
- **Fluxo ARQ + INTERIORES**: Foco em construção nova e projeto completo.
- **Fluxo INTERIORES**: Foco em reforma e decoração.
- **Fluxo COMERCIAL**: Foco em negócios, experiência do cliente e marca.

### 2. Etapas do Formulário
- **Etapa 1**: Dados Pessoais (Nome, WhatsApp, E-mail, Cidade, Origem).
- **Etapa 2**: Escolha do Tipo de Projeto (Cards visuais que definem os próximos passos).
- **Etapa 3**: O Imóvel / O Negócio (campos específicos por fluxo).
- **Etapa 4**: O Projeto / Prazos e Orçamento (campos específicos por fluxo).

### 3. Visual e UX
- Barra de progresso em bronze.
- Navegação entre etapas (Anterior/Próximo).
- Design minimalista: fundo `#0F0E0C`, texto `#E8E4DF`, detalhes `#8B7355`.
- Tipografia: Courier New para labels e Cormorant Garamond italic para títulos.

### 4. Integração com Banco de Dados (Supabase)
- Salvar todas as respostas no formato JSONB na tabela `briefings`.
- Atualizar o status para 'preenchido' e registrar o timestamp.
- Se houver `cliente_id` vinculado:
  - Atualizar `tipo_projeto`, `area_m2` e `orcamento` na ficha do cliente.
  - Marcar `briefing_preenchido` como true.

## Detalhes Técnicos
- Utilização de `lucide-react` para ícones.
- `sonner` para notificações.
- `framer-motion` para transições suaves entre as etapas (se disponível, senão Tailwind animations).
- Validação básica de campos obrigatórios.
