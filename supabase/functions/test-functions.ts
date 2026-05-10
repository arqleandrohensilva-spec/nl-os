import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const BASE_URL = "http://localhost:8000";

Deno.test("analyze-engagement: test with empty engagement data", async () => {
  const payload = {
    engagement: [],
    proposal: { cliente: "João", tipo: "Residencial" }
  };

  const res = await fetch(`${BASE_URL}/analyze-engagement`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" }
  });

  const data = await res.json();
  assertEquals(res.status, 200);
  assert(data.analysis.includes("Sem dados de engajamento"));
});

Deno.test("generate-followup: test with simple proposal", async () => {
  const payload = {
    proposal: {
      cliente: "João Silva",
      tipo: "Reforma Apartamento",
      status: "Enviada",
      views_count: 2,
      data: new Date().toISOString(),
      validade: 15
    }
  };

  const res = await fetch(`${BASE_URL}/generate-followup`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" }
  });

  const data = await res.json();
  assertEquals(res.status, 200);
  // Se não houver chave API, deve retornar erro amigável ou vazio dependendo da implementação
  if (data.error) {
    assert(data.error.includes("ANTHROPIC_API_KEY"));
  } else {
    assert(data.message.length > 0);
  }
});
