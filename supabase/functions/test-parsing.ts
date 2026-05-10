// Script para testar as Edge Functions localmente com Mock AI

async function testFunctions() {
  console.log("🚀 Iniciando testes das Edge Functions com MOCK_AI=true...");
  
  // Definir variável de ambiente para o mock
  Deno.env.set("MOCK_AI", "true");

  // 1. Teste Generate Followup
  console.log("\n--- Testando generate-followup ---");
  try {
    const { default: handler } = await import("./generate-followup/index.ts");
    const req = new Request("http://localhost/generate-followup", {
      method: "POST",
      body: JSON.stringify({
        proposal: {
          cliente: "Teste Mock",
          tipo: "Projeto Residencial",
          status: "Enviada",
          views_count: 5,
          data: new Date().toISOString(),
          validade: 30
        }
      })
    });
    
    const res = await handler(req);
    const data = await res.json();
    console.log("Resposta generate-followup:", data);
    
    if (data.message && data.message.includes("[MOCK]")) {
      console.log("✅ Parsing de generate-followup validado com sucesso!");
    } else {
      console.error("❌ Falha no parsing ou resposta inesperada de generate-followup");
    }
  } catch (err) {
    console.error("Erro ao testar generate-followup:", err);
  }

  // 2. Teste Analyze Engagement
  console.log("\n--- Testando analyze-engagement ---");
  try {
    const { default: handler } = await import("./analyze-engagement/index.ts");
    const req = new Request("http://localhost/analyze-engagement", {
      method: "POST",
      body: JSON.stringify({
        proposal: { cliente: "Teste Mock", tipo: "Comercial" },
        engagement: {
          tempo_total: 120,
          dispositivo: "Desktop",
          secao_investimento_tempo: 45
        }
      })
    });
    
    const res = await handler(req);
    const data = await res.json();
    console.log("Resposta analyze-engagement:", data);
    
    if (data.analysis && data.analysis.includes("[MOCK]")) {
      console.log("✅ Parsing de analyze-engagement validado com sucesso!");
    } else {
      console.error("❌ Falha no parsing ou resposta inesperada de analyze-engagement");
    }
  } catch (err) {
    console.error("Erro ao testar analyze-engagement:", err);
  }
}

testFunctions();
