
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { ContractData } from '@/utils/contractTemplates';
import { toast } from 'sonner';

export const generateContractDocx = async (data: ContractData) => {
  try {
    console.log('Iniciando geração de DOCX via template do Dropbox...');
    
    const response = await supabase.functions.invoke('dropbox-proxy', {
      body: {
        action: 'download',
        path: '/NL Arquitetos/07 - Projetos NL OS/00 - Templates/Contrato_NL_Final.docx'
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
    
    const filledXml = docXml
      .replace(/\[NOME COMPLETO\]/g, data.cliente.nome || '')
      .replace(/\[xxx\]/g, data.cliente.cpf || '')
      .replace(/\[nacionalidade\]/g, data.cliente.nacionalidade || '')
      .replace(/\[estado civil\]/g, data.cliente.estadoCivil || '')
      .replace(/\[profissão\]/g, data.cliente.profissao || '')
      .replace(/\[endereço completo\]/g, data.cliente.endereco || '')
      .replace(/\[ENDEREÇO DO TERRENO OU CONDOMÍNIO\]/g, data.projeto.endereco || '')
      .replace(/\[DATA DA ASSINATURA\]/g, data.dataAssinatura || format(new Date(), 'dd/MM/yyyy'))
      .replace(/NL-\[ANO\]-\[NR\]/g, data.numero || '');
      
    zip.file('word/document.xml', filledXml);

    // 2. Docxtemplater for standard {TAG} placeholders
    const doc = new Docxtemplater(zip, { 
      paragraphLoop: true,
      linebreaks: true 
    });

    doc.setData({
      NOME_CLIENTE: data.cliente.nome,
      CPF_CLIENTE: data.cliente.cpf,
      NACIONALIDADE: data.cliente.nacionalidade,
      ESTADO_CIVIL: data.cliente.estadoCivil,
      PROFISSAO: data.cliente.profissao,
      ENDERECO_CLIENTE: data.cliente.endereco,
      CAU_LEANDRO: data.nl.cauLeandro,
      CAU_NEANDRO: data.nl.cauNeandro,
      CPF_NEANDRO: data.nl.cpfNeandro,
      TIPO_PROJETO: data.projeto.tipo,
      PLANO: data.projeto.plano,
      ENDERECO_IMOVEL: data.projeto.endereco,
      TIPO_IMOVEL: data.projeto.tipoImovel,
      AREA_TERRENO: data.projeto.areaTerreno,
      AREA_CONSTRUIDA: data.projeto.areaConstruida,
      MATRICULA: data.projeto.matricula,
      CARTORIO: data.projeto.cartorio,
      PRAZO_LEVANTAMENTO: data.prazos.briefing,
      PRAZO_ESTUDO: data.prazos.estudo,
      PRAZO_LEGAL: data.prazos.legal,
      PRAZO_EXECUTIVO: data.prazos.executivo,
      PRAZO_TOTAL: data.prazos.total,
      VALOR_EXECUTIVO: data.honorarios.totalExecutivo,
      VALOR_COMPLETO: data.honorarios.totalCompleto,
      MARCO1: data.honorarios.marco1,
      MARCO2: data.honorarios.marco2,
      MARCO3: data.honorarios.marco3,
      NUMERO_CONTRATO: data.numero,
      DATA_ASSINATURA: data.dataAssinatura || format(new Date(), 'dd/MM/yyyy'),
    });

    try {
      doc.render();
    } catch (error) {
      console.error('Erro ao renderizar Docxtemplater:', error);
    }
    
    const blob = doc.getZip().generate({ 
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
