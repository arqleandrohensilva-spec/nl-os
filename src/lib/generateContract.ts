import { supabase } from '@/integrations/supabase/client';
import { ContractData } from '@/utils/contractTemplates';
import { toast } from 'sonner';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';

const valorPorExtenso = (valor: number): string => {
  if (!valor || valor === 0) return 'zero reais';
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const converterAte999 = (n: number): string => {
    if (n === 100) return 'cem';
    if (n === 0) return '';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    const partes = [];
    if (c > 0) partes.push(centenas[c]);
    if (n % 100 < 20 && n % 100 > 0) { partes.push(unidades[n % 100]); }
    else { if (d > 0) partes.push(dezenas[d]); if (u > 0) partes.push(unidades[u]); }
    return partes.join(' e ');
  };
  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);
  let resultado = '';
  if (inteiro >= 1000000) { const m = Math.floor(inteiro / 1000000); resultado += converterAte999(m) + (m === 1 ? ' milhão' : ' milhões'); if (inteiro % 1000000 > 0) resultado += ' e '; }
  if (inteiro >= 1000 && inteiro < 1000000) { const mil = Math.floor(inteiro / 1000); resultado += converterAte999(mil) + ' mil'; if (inteiro % 1000 > 0) resultado += ' e '; }
  const resto = inteiro % 1000;
  if (resto > 0) resultado += converterAte999(resto);
  resultado += inteiro === 1 ? ' real' : ' reais';
  if (centavos > 0) resultado += ' e ' + converterAte999(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  return resultado;
};

export const generateContractDocx = async (data: ContractData) => {
  try {
    const response = await supabase.functions.invoke('dropbox-proxy', {
      body: { action: 'download', path: '/NL Arquitetos/07 - Projetos NL OS/00 - Templates/NL_Contrato_Final.docx' }
    });
    if (response.error) throw new Error(`Erro de rede: ${response.error.message}`);
    if (!response.data) throw new Error('Resposta vazia');
    if (response.data?.error) {
      const err = response.data.error;
      if (err['.tag'] === 'expired_access_token') throw new Error('Conexão com Dropbox expirou. Reconecte nas configurações.');
      throw new Error(`Erro no Dropbox: ${response.data.error_summary || JSON.stringify(err)}`);
    }
    let arrayBuffer: ArrayBuffer;
    if (response.data instanceof Blob) { arrayBuffer = await response.data.arrayBuffer(); }
    else if (response.data instanceof ArrayBuffer) { arrayBuffer = response.data; }
    else { throw new Error('Formato de arquivo inválido'); }

    const parseNum = (val: string | undefined): number => {
      if (!val) return 0;
      return parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
    };
    const formatVal = (n: number): string => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const valor = data.projeto.plano === 'Completo' ? parseNum(data.honorarios.totalCompleto) : parseNum(data.honorarios.totalExecutivo);
    const marco1 = Math.round(valor * 0.30);
    const marco2 = Math.round(valor * 0.40);
    const marco3 = valor - marco1 - marco2;

    const tipoImovel = data.projeto.tipoImovel || 'Residência Existente';

    const templateData = {
      ano: String(new Date().getFullYear()),
      numero: data.numero || '001',
      data: data.dataAssinatura || new Date().toLocaleDateString('pt-BR'),
      nome_cliente: data.cliente.nome || '',
      cpf_cliente: data.cliente.cpf || '',
      nacionalidade: data.cliente.nacionalidade || 'brasileiro(a)',
      estado_civil: data.cliente.estadoCivil || '',
      profissao: data.cliente.profissao || '',
      endereco_cliente: data.cliente.endereco || '',
      endereco_imovel: data.projeto.endereco || '',
      tipo_arqint:    data.projeto.tipo === 'ARQ+INT'     ? '[X]' : '[ ]',
      tipo_interiores: data.projeto.tipo === 'Interiores' ? '[X]' : '[ ]',
      tipo_comercial: data.projeto.tipo === 'Comercial'   ? '[X]' : '[ ]',
      plano_executivo: data.projeto.plano !== 'Completo'  ? '[X]' : '[ ]',
      plano_completo:  data.projeto.plano === 'Completo'  ? '[X]' : '[ ]',
      tipo_imovel_terreno:    tipoImovel === 'Terreno'              ? '[X]' : '[ ]',
      tipo_imovel_residencia: tipoImovel === 'Residência Existente' ? '[X]' : '[ ]',
      tipo_imovel_apartamento: tipoImovel === 'Apartamento'         ? '[X]' : '[ ]',
      tipo_imovel_sala:       tipoImovel === 'Sala Comercial'       ? '[X]' : '[ ]',
      area_terreno: data.projeto.areaTerreno || data.projeto.areaConstruida || '',
      area_construida: data.projeto.areaConstruida || '',
      matricula: data.projeto.matricula || '',
      cartorio: data.projeto.cartorio || '',
      prazo_briefing: data.prazos.briefing || '5',
      prazo_estudo: data.prazos.estudo || '15',
      prazo_legal: data.prazos.legal || '10',
      prazo_executivo: data.prazos.executivo || '30',
      prazo_semanas: data.prazos.total || '12',
      prazo_total_dias: data.prazos.totalDias || '65',
      valor_total: formatVal(valor),
      valor_total_extenso: valorPorExtenso(valor),
      marco1_valor: formatVal(marco1),
      marco1_extenso: valorPorExtenso(marco1),
      marco2_valor: formatVal(marco2),
      marco2_extenso: valorPorExtenso(marco2),
      marco3_valor: formatVal(marco3),
      marco3_extenso: valorPorExtenso(marco3),
      cpf_testemunha: '',
    };

    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, errorLogging: false });
    try {
      doc.setData(templateData);
      doc.render();
    } catch (renderError: any) {
      const message = renderError?.properties?.errors
        ?.map((e: any) => e.message)
        ?.join(', ') || renderError.message;
      throw new Error(`Erro ao preencher template: ${message}`);
    }

    return doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

  } catch (error: any) {
    console.error('Erro ao gerar contrato:', error);
    toast.error(`Erro ao gerar contrato: ${error.message || error}`);
    return null;
  }

export const generateContractPDF = async (data: ContractData) => {
  try {
    const docxBlob = await generateContractDocx(data);
    if (!docxBlob) return null;

    const arrayBuffer = await docxBlob.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;

    const element = document.createElement('div');
    element.innerHTML = `
      <div style="padding: 40px; font-family: Arial, sans-serif; line-height: 1.5; color: #333; background: white;">
        ${html}
      </div>
    `;
    
    // Configurações do PDF para garantir qualidade e layout similar ao Word
    const opt = {
      margin: [15, 15, 15, 15],
      filename: `${data.numero || 'Contrato'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const pdfBlob = await html2pdf().from(element).set(opt).output('blob');
    return pdfBlob;
  } catch (error: any) {
    console.error('Erro ao gerar PDF do contrato:', error);
    toast.error(`Erro ao gerar PDF: ${error.message || error}`);
    return null;
  }
};