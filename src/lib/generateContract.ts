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
    // Buscar configurações dinamicamente
    const { data: dropboxSettings } = await supabase
      .from('dropbox_settings')
      .select('contract_template_path, vendor_template_path')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    const templatePath = (dropboxSettings as any)?.contract_template_path || '/NL Arquitetos/07 - Projetos NL OS/00 - Templates/NL_Contrato_Final.docx';
    const vendorTemplatePath = (dropboxSettings as any)?.vendor_template_path;

    // Se o plano for 'Fornecedor' e houver um template configurado, usa ele
    const activePath = (data.projeto.plano === 'Fornecedor' && vendorTemplatePath) ? vendorTemplatePath : templatePath;

    const response = await supabase.functions.invoke('dropbox-proxy', {
      body: { action: 'download', path: activePath },
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
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

    const valor = data.projeto.plano === 'Completo' ? parseNum(data.honorarios.totalCompleto) : 
                  data.projeto.plano === 'Fornecedor' ? parseNum(data.honorarios.totalExecutivo) : // Fornecedor usa campo executivo como base se necessário
                  parseNum(data.honorarios.totalExecutivo);
    const marco1 = Math.round(valor * 0.30 * 100) / 100;
    const marco2 = Math.round(valor * 0.40 * 100) / 100;
    const marco3 = Math.round((valor - marco1 - marco2) * 100) / 100;

    const tipoImovel = data.projeto.tipoImovel || 'Residência Existente';

    console.log('DEBUG projeto.tipo:', JSON.stringify(data.projeto.tipo));
    console.log('DEBUG projeto.tipoImovel:', JSON.stringify(data.projeto.tipoImovel));
    console.log('DEBUG projeto.plano:', JSON.stringify(data.projeto.plano));

    const templateData = {
      ano: String(new Date().getFullYear()),
      numero: data.numero || '001',
      data: data.dataAssinatura || new Date().toLocaleDateString('pt-BR'),
      nome_cliente: (data.cliente.nome || '').toUpperCase(),
      cpf_cliente: data.cliente.cpf || '',
      nacionalidade: data.cliente.nacionalidade || 'brasileiro(a)',
      estado_civil: data.cliente.estadoCivil || '',
      profissao: data.cliente.profissao || '',
      endereco_cliente: data.cliente.endereco || '',
      endereco_imovel: (data.projeto.endereco || '').toUpperCase(),
      tipo_residencial: data.projeto.tipo === 'Residencial'                                                        ? 'X' : ' ',
      tipo_interiores:  (data.projeto.tipo === 'Interiores' || data.projeto.tipo === 'int')                        ? 'X' : ' ',
      tipo_comercial:   (data.projeto.tipo === 'Comercial'  || data.projeto.tipo === 'com')                        ? 'X' : ' ',
      tipo_arqint:      (data.projeto.tipo === 'Arquitetura + Interiores' || data.projeto.tipo === 'ARQ+INT' || data.projeto.tipo === 'arq') ? 'X' : ' ',

      plano_executivo:  (data.projeto.plano === 'Executivo' || data.projeto.plano !== 'Completo') ? 'X' : ' ',
      plano_completo:   data.projeto.plano === 'Completo'                                         ? 'X' : ' ',

      tipo_imovel_terreno:     data.projeto.tipoImovel === 'Terreno'              ? 'X' : ' ',
      tipo_imovel_residencia:  (data.projeto.tipoImovel === 'Residência' || data.projeto.tipoImovel === 'Residência Existente') ? 'X' : ' ',
      tipo_imovel_apartamento: data.projeto.tipoImovel === 'Apartamento'          ? 'X' : ' ',
      tipo_imovel_sala:        data.projeto.tipoImovel === 'Sala Comercial'       ? 'X' : ' ',
      tipo_imovel_outro: '',
      area_terreno:    (data.projeto.areaTerreno != null && data.projeto.areaTerreno !== '') ? data.projeto.areaTerreno : 'Não se aplica',
      area_construida: (data.projeto.areaConstruida != null && data.projeto.areaConstruida !== '') ? data.projeto.areaConstruida : 'Não se aplica',
      matricula: data.projeto.matricula || '',
      cartorio: data.projeto.cartorio || '',
      prazo_briefing: data.prazos.briefing || '5',
      prazo_estudo: data.prazos.estudo || '15',
      prazo_legal: data.prazos.legal || '10',
      prazo_executivo: data.prazos.executivo || '30',
      prazo_semanas: data.prazos.total || '',
      prazo_total_dias: (() => {
        const b = parseInt(data.prazos.briefing || '0');
        const e = parseInt(data.prazos.estudo || '0');
        const l = parseInt(data.prazos.legal || '0');
        const x = parseInt(data.prazos.executivo || '0');
        return String(b + e + l + x);
      })(),
      prazo_total: (() => {
        const b = parseInt(data.prazos.briefing || '0');
        const e = parseInt(data.prazos.estudo || '0');
        const l = parseInt(data.prazos.legal || '0');
        const x = parseInt(data.prazos.executivo || '0');
        const total = b + e + l + x;
        return total > 0 ? String(total) : (data.prazos.total || '');
      })(),
      valor_total: formatVal(valor),
      valor_total_extenso: valorPorExtenso(valor),
      marco1_valor: formatVal(marco1),
      marco1_extenso: valorPorExtenso(marco1),
      marco2_valor: formatVal(marco2),
      marco2_extenso: valorPorExtenso(marco2),
      marco3_valor: formatVal(marco3),
      marco3_extenso: valorPorExtenso(marco3),
      nome_cliente_testemunha: data.cliente.testemunhaNome || '',
      cpf_testemunha: data.cliente.testemunhaCpf || '',
      tipo_projeto_nome: (() => {
        const t = String(data.projeto.tipo || '').trim();
        console.log('DEBUG tipo_projeto:', JSON.stringify(t));
        if (t.includes('Arquitetura') || t === 'ARQ+INT' || t === 'arq') return 'ARQUITETURA + INTERIORES';
        if (t === 'Interiores' || t === 'int') return 'INTERIORES';
        if (t === 'Comercial' || t === 'com') return 'COMERCIAL';
        return t;
      })(),
      plano_nome: data.projeto.plano === 'Completo' ? 'PLANO COMPLETO' : 'PLANO EXECUTIVO',
      nro_contrato: data.numero || '',
    };

    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, { 
      paragraphLoop: true, 
      linebreaks: true, 
      errorLogging: false, 
      delimiters: { start: '{', end: '}' } 
    });
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
  }
};

export const getContractPreviewHtml = async (data: ContractData) => {
  try {
    const docxBlob = await generateContractDocx(data);
    if (!docxBlob) return null;

    const arrayBuffer = await docxBlob.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer }, {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Heading 1'] => h2:fresh",
        "p[style-name='Heading 2'] => h3:fresh",
        "b => strong",
        "i => em",
        "u => u",
        "strike => del"
      ]
    });
    // Limpar o HTML para evitar tags vazias e melhorar visualização
    let html = result.value;
    html = html.replace(/<p><\/p>/g, '<br />');
    
    return `
      <style>
        .contract-preview h1 { font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 20px; text-transform: uppercase; }
        .contract-preview h2 { font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .contract-preview p { margin-bottom: 12px; text-align: justify; line-height: 1.6; font-size: 14px; }
        .contract-preview strong { font-weight: bold; }
        .contract-preview table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .contract-preview td, .contract-preview th { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
      </style>
      <div class="contract-preview-container">
        ${html}
      </div>
    `;
  } catch (error: any) {
    console.error('Erro ao gerar preview do contrato:', error);
    toast.error(`Erro ao gerar preview: ${error.message || error}`);
    return null;
  }
};

export const generateContractPDF = async (data: ContractData) => {
  try {
    const html = await getContractPreviewHtml(data);
    if (!html) return null;

    const element = document.createElement('div');
    element.innerHTML = html;
    // O html retornado por getContractPreviewHtml já contém estilos e um container
    
    const opt = {
      margin: [15, 15, 15, 15] as [number, number, number, number],
      filename: `${data.numero} - ${data.cliente.nome}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    // Gerar o PDF diretamente no navegador usando html2pdf.js
    const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
    return pdfBlob;
  } catch (error: any) {
    console.error('Erro ao gerar PDF via html2pdf:', error);
    toast.error(`Erro ao gerar PDF: ${error.message || error}`);
    return null;
  }
};