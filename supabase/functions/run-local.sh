#!/bin/bash

# Este script ajuda a testar localmente as Edge Functions simulando o ambiente do Supabase.
# Você pode usar 'deno run --allow-net --allow-env supabase/functions/analyze-engagement/index.ts' 
# ou rodar 'supabase functions serve' se tiver o CLI instalado.

# Exemplo de comando para rodar uma função individualmente com Deno (precisa de ajustes no import da std):
# deno run --allow-net --allow-env --allow-read supabase/functions/analyze-engagement/index.ts

echo "Para simular localmente, use o comando do Supabase CLI:"
echo "supabase functions serve"
echo ""
echo "Para rodar os testes após as funções estarem UP:"
echo "deno test --allow-net supabase/functions/test-functions.ts"
