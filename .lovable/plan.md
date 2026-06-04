1. **Adicionar estado**:
   - `isReferralModalOpen`, `selectedSurveyForReferral`, `isInternalNoteModalOpen`, `selectedSurveyForInternalNote`, `internalNote`, `generatingTestimonial`.

2. **Implementar funções**:
   - `handleGenerateTestimonial(survey)`: Chama edge function `ai-advisor`, formata resposta, insere no banco, mostra toast.
   - `handleSaveInternalNote()`: Atualiza `pesquisas_satisfacao.notas_internas`.
   - `openReferralModal(survey)`: Abre modal de indicação.

3. **Atualizar renderização da lista de pesquisas (aba PESQUISAS)**:
   - Adicionar botões "GERAR DEPOIMENTO" (se nota >= 9), "PEDIR INDICAÇÃO" (se nota >= 9 e sem depoimento), "REGISTRAR CONTATO" (se nota <= 6).

4. **Atualizar renderização da aba DEPOIMENTOS**:
   - Mostrar versões (Instagram, Google, Frase), botões APROVAR/PUBLICADO.

5. **Adicionar Modais**:
   - Modal de indicação (WhatsApp).
   - Modal de nota interna.