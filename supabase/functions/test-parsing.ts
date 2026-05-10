const ANTHROPIC_MOCK_RESPONSE = {
  content: [
    {
      text: "Olá! Notei que você viu a proposta da NL Arquitetos. Alguma dúvida?"
    }
  ]
};

async function testParsing() {
  console.log("Simulando parsing de resposta da Anthropic...");
  
  const data = ANTHROPIC_MOCK_RESPONSE;
  const message = data?.content?.[0]?.text;

  if (!message) {
    console.error("ERRO: Falha no parsing da mensagem!");
    return;
  }

  console.log("SUCESSO: Mensagem extraída:", message);
}

testParsing();
