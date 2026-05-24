
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import PizZip from 'pizzip';
import { ContractData } from '@/utils/contractTemplates';
import { toast } from 'sonner';

export const generateContractDocx = async (data: ContractData) => {
  try {
    console.log('Iniciando geração de DOCX via template do Dropbox...');
    
    const response = await supabase.functions.invoke('dropbox-proxy', {
      body: {
        action: 'download',
        path: '/NL Arquitetos/07 - PROJETOS NL OS/00 - TEMPLATES/NL_Contrato_Final.docx'
      }
    });

    if (response.error) {
      console.error('Erro de rede na Edge Function:', response.error);
      throw new Error(`Erro de rede: ${response.error.message || 'Falha ao conectar com a Edge Function'}`);
    }
    
    if (!response.data) {
      throw new Error('A resposta da Edge Function está vazia');
    }
    
    if (response.data && response.data.error) {
      console.error('Erro retornado pelo Dropbox:', response.data.error);
      const errorData = response.data.error;
      let errorMsg = typeof errorData === 'string' ? errorData : '';
      
      if (errorData['.tag'] === 'expired_access_token' || (typeof errorData === 'object' && errorData.error && errorData.error['.tag'] === 'expired_access_token')) {
        throw new Error('A conexão com o Dropbox expirou. Por favor, reconecte o Dropbox nas configurações do sistema.');
      }
      
      if (!errorMsg && response.data.error_summary) errorMsg = response.data.error_summary;
      if (!errorMsg && typeof errorData === 'object') errorMsg = JSON.stringify(errorData);
      
      throw new Error(`Erro no Dropbox: ${errorMsg || 'Erro desconhecido'}`);
    }

    let arrayBuffer: ArrayBuffer;
    if (response.data instanceof Blob) {
      arrayBuffer = await response.data.arrayBuffer();
    } else if (response.data instanceof ArrayBuffer) {
      arrayBuffer = response.data;
    } else {
      console.error('Tipo de dado inesperado recebido:', typeof response.data);
      throw new Error('Formato de arquivo inválido recebido do Dropbox');
    }

    const zip = new PizZip(arrayBuffer);
    
    // 1. Manual replacement for non-standard placeholders
    let docXml = zip.files['word/document.xml'].asText();
    
    const hoje = format(new Date(), 'dd/MM/yyyy');
    const ano = new Date().getFullYear();

    // Formatar valores por extenso (simplificado)
    const formatarValor = (v: number) => v?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00';

    const parseNum = (val: string | undefined) => {
      if (!val) return 0;
      return parseFloat(val.replace(/\./g, '').replace(',', '.'));
    };

    const valor = data.projeto.plano === 'Completo' 
      ? parseNum(data.honorarios.totalCompleto) 
      : parseNum(data.honorarios.totalExecutivo);
      
    const marco1 = Math.round(valor * 0.30);
    const marco2 = Math.round(valor * 0.40);
    const marco3 = Math.round(valor * 0.30);

    const filledXml = docXml
      // Número do contrato
      .replace(/\[ANO\]/g, String(ano))
      .replace(/\[NR\]/g, data.numero || '001')
      
      // Datas
      .replace(/\[DATA\]/g, hoje)
      .replace(/\[DATA DA ASSINATURA\]/g, hoje)
      
      // Contratante — capa
      .replace(/\[NOME COMPLETO DO CONTRATANTE\]/g, data.cliente.nome || '')
      .replace(/\[ENDEREÇO COMPLETO DO IMÓVEL \/ TERRENO\]/g, data.projeto.endereco || '')
      
      // Contratante — cláusula primeira
      .replace(/\[NOME COMPLETO\]/g, data.cliente.nome || '')
      .replace(/\[nacionalidade\]/g, data.cliente.nacionalidade || 'brasileiro(a)')
      .replace(/\[estado civil\]/g, data.cliente.estadoCivil || '')
      .replace(/\[profissão\]/g, data.cliente.profissao || '')
      .replace(/\[endereço completo\]/g, data.cliente.endereco || '')
      .replace(/\[ENDEREÇO DO TERRENO OU CONDOMÍNIO\]/g, data.projeto.endereco || '')
      
      // CPF — primeiro [xxx] é do contratante
      .replace(/\[xxx\]/, data.cliente.cpf || '')
      
      // Tipo de projeto — marcar o correto com [X]
      .replace(
        /\[ \] Arquitetura \+ Interiores    \[ \] Interiores    \[ \] Comercial/,
        data.projeto.tipo === 'ARQ+INT' 
          ? '[X] Arquitetura + Interiores    [ ] Interiores    [ ] Comercial'
          : data.projeto.tipo === 'Interiores'
          ? '[ ] Arquitetura + Interiores    [X] Interiores    [ ] Comercial'
          : '[ ] Arquitetura + Interiores    [ ] Interiores    [X] Comercial'
      )
      
      // Plano contratado
      .replace(
        /\[ \] Plano Executivo    \[ \] Plano Completo/g,
        data.projeto.plano === 'Completo'
          ? '[ ] Plano Executivo    [X] Plano Completo'
          : '[X] Plano Executivo    [ ] Plano Completo'
      )
      
      // Áreas
      .replace(/\[____ m²\] de terreno/, `[${data.projeto.areaTerreno || data.projeto.areaConstruida || ''}  m²] de terreno`)
      .replace(/previsão estimada de \[____ m²\]/, `previsão estimada de [${data.projeto.areaConstruida || ''} m²]`)
      .replace(/corresponde a \[____ m²\]/, `corresponde a [${data.projeto.areaConstruida || ''} m²]`)
      
      // Matrícula e Cartório
      .replace(/Matrícula nº: __________________/, `Matrícula nº: ${data.projeto.matricula || ''}`)
      .replace(/Cartório: ______________________/, `Cartório: ${data.projeto.cartorio || ''}`)
      
      // Prazo total em semanas
      .replace(/______ semanas/, `${data.prazos.total || '12'} semanas`)
      
      // Prazos por etapa (dias úteis) — substituir em ordem
      .replace(/____ dias úteis\./, `${data.prazos.briefing || '5'} dias úteis.`)
      .replace(/____ dias úteis\./, `${data.prazos.briefing || '5'} dias úteis.`)
      .replace(/____ dias úteis\./, `${data.prazos.estudo || '15'} dias úteis.`)
      .replace(/____ dias úteis\./, `${data.prazos.estudo || '15'} dias úteis.`)
      .replace(/____ dias úteis\./, `${data.prazos.legal || '10'} dias úteis.`)
      .replace(/____ dias úteis\./, `${data.prazos.executivo || '30'} dias úteis.`)
      
      // Prazo total em dias úteis
      .replace(/_____ \n/, `${data.prazos.totalDias || '65'} dias úteis\n`)
      
      // Valor total
      .replace(/R\$ __________  \(_______________________________________________\)/, 
        `R$ ${formatarValor(valor)} (${data.honorarios.totalExtenso || 'valor por extenso'})`)
      
      // Valor total cláusula honorários
      .replace(/R\$ __________ \(________________________________________\)\./, 
        `R$ ${formatarValor(valor)} (${data.honorarios.totalExtenso || 'valor por extenso'}).`)
      
      // Marcos de pagamento
      .replace(/Valor: R\$ __________ \(____________________________\)\.[\s\S]*?Marco 2/, 
        `Valor: R$ ${formatarValor(marco1)} (30% do total).\nMarco 2`)
      .replace(/Valor: R\$ __________ \(____________________________\)\.[\s\S]*?Marco 3/, 
        `Valor: R$ ${formatarValor(marco2)} (40% do total).\nMarco 3`)
      .replace(/Valor: R\$ __________ \(____________________________\)\.$/, 
        `Valor: R$ ${formatarValor(marco3)} (30% do total).`);
        
    zip.file('word/document.xml', filledXml);

    const blob = zip.generate({ 
      type: 'blob', 
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    
    return blob;
  } catch (error: any) {
    console.error('Erro completo ao gerar DOCX:', error);
    toast.error(`Erro ao carregar template do Dropbox: ${error.message || error}`);
    return null;
  }
};
