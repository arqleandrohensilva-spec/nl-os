# Correção integral de segurança

## Objetivo

Eliminar os achados ativos de segurança sem interromper os portais públicos por token, o login normal ou os fluxos internos do NL OS.

## Implementação

1. **Corrigir autenticação e autorização no frontend**
   - Alterar `/auth/callback` para aceitar tokens somente no fragmento da URL (`#...`), nunca na query string que pode ser registrada por servidores e proxies.
   - Adicionar proteção por módulo às rotas internas, usando as permissões já configuradas em perfis; administradores continuam com acesso total.
   - Manter `ProtectedRoute` como primeira barreira e impedir acesso direto por URL a módulos não autorizados.

2. **Aplicar permissões reais no banco**
   - Criar uma função interna segura para verificar se o usuário possui acesso a um módulo por perfil ou papel administrativo.
   - Substituir políticas amplas de usuário autenticado por políticas alinhadas aos módulos: clientes, pipeline, projetos, horas, financeiro, propostas, documentos, marketing, configurações e administração.
   - Remover políticas duplicadas e permissivas que hoje são combinadas e anulam as regras mais restritivas.
   - Restringir notificações ao próprio usuário e `briefings_completos` à equipe autorizada de projetos/administração.
   - Preservar apenas os acessos públicos indispensáveis, sempre mediados por token exato e funções específicas.

3. **Endurecer funções privilegiadas e arquivos**
   - Revogar execução pública das funções de trigger e utilitários internos que não devem ser chamados pela API.
   - Manter públicas somente as funções necessárias aos portais externos, com validação de token e permissões explícitas.
   - Restringir anexos de briefing e biblioteca visual ao módulo correspondente/admin, mantendo upload público somente na pasta de um token válido.
   - Confirmar que atribuição de papéis e edição de perfis continuam exclusivas de administradores.

4. **Validar e registrar**
   - Verificar novamente o linter, scanner de segurança e dependências.
   - Testar login, bloqueio por módulo, acesso administrativo e carregamento das rotas públicas por token.
   - Confirmar a presença do `index.html` na raiz e a configuração padrão do Vite; tratar o erro de entrypoint como problema de contexto de execução caso não seja reproduzível.
   - Marcar como resolvidos apenas os achados efetivamente corrigidos e documentar riscos residuais intencionais.

## Áreas afetadas

- Autenticação e callback de sessão
- Rotas internas e permissões por perfil
- Políticas de acesso das tabelas operacionais
- Notificações, briefings e dados financeiros
- Storage de anexos e biblioteca de marketing
- Funções privilegiadas expostas pela API

## Medidas preventivas

- Autorização em profundidade: interface, rota e banco verificam a mesma permissão.
- Privilégio mínimo e remoção de políticas duplicadas.
- Tokens públicos nunca concedem acesso genérico a tabelas.
- Credenciais e sessões nunca são incorporadas ao bundle ou transportadas na query string.
- Nova varredura após alterações e dependências sem vulnerabilidades altas/críticas.