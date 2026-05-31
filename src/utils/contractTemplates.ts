
import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface ContractData {
  numero: string;
  cliente: {
    nome: string;
    cpf: string;
    endereco: string;
    nacionalidade: string;
    estadoCivil: string;
    profissao: string;
    testemunhaNome?: string;
    testemunhaCpf?: string;
  };
  projeto: {
    tipo: string;
    plano: string;
    endereco: string;
    tipoImovel: string;
    areaTerreno: string | null;
    areaConstruida: string | null;
    matricula: string;
    cartorio: string;
  };
  prazos: {
    briefing: string;
    estudo: string;
    legal: string;
    executivo: string;
    total: string;
    totalDias?: string;
    prazoLevantamento?: string;
    prazoEstudo?: string;
    prazoLegal?: string;
    prazoExecutivo?: string;
    prazoTotal?: string;
  };
  honorarios: {
    totalExecutivo: string;
    totalCompleto: string;
    marco1: string;
    marco2: string;
    marco3: string;
    valorExecutivo?: string;
    valorCompleto?: string;
    totalExtenso?: string;
  };
  nl: {
    cauLeandro: string;
    cauNeandro: string;
    cpfNeandro: string;
  };
  dataAssinatura?: string;
}

export interface TemplateParagraph {
  texto: string;
  indent: number;
  runs?: {
    texto: string;
    bold?: boolean;
    italic?: boolean;
  }[];
}

const replacePlaceholders = (text: string, data: ContractData) => {
  if (!text) return '';
  
  const campos: Record<string, string> = {
    '{NOME_CLIENTE}': data.cliente.nome,
    '{NACIONALIDADE}': data.cliente.nacionalidade,
    '{ESTADO_CIVIL}': data.cliente.estadoCivil,
    '{PROFISSAO}': data.cliente.profissao,
    '{CPF_CLIENTE}': data.cliente.cpf,
    '{ENDERECO_CLIENTE}': data.cliente.endereco,
    '{CAU_LEANDRO}': data.nl.cauLeandro,
    '{CAU_NEANDRO}': data.nl.cauNeandro,
    '{CPF_NEANDRO}': data.nl.cpfNeandro,
    '{TIPO_PROJETO}': data.projeto.tipo,
    '{PLANO}': data.projeto.plano,
    '{ENDERECO_IMOVEL}': data.projeto.endereco,
    '{TIPO_IMOVEL}': data.projeto.tipoImovel,
    '{AREA_TERRENO}': data.projeto.areaTerreno,
    '{AREA_CONSTRUIDA}': data.projeto.areaConstruida,
    '{MATRICULA}': data.projeto.matricula,
    '{CARTORIO}': data.projeto.cartorio,
    '{PRAZO_LEVANTAMENTO}': data.prazos.prazoLevantamento || data.prazos.briefing,
    '{PRAZO_ESTUDO}': data.prazos.prazoEstudo || data.prazos.estudo,
    '{PRAZO_LEGAL}': data.prazos.prazoLegal || data.prazos.legal,
    '{PRAZO_EXECUTIVO}': data.prazos.prazoExecutivo || data.prazos.executivo,
    '{PRAZO_TOTAL}': data.prazos.prazoTotal || data.prazos.total,
    '{VALOR_EXECUTIVO}': data.honorarios.valorExecutivo || data.honorarios.totalExecutivo,
    '{VALOR_COMPLETO}': data.honorarios.valorCompleto || data.honorarios.totalCompleto,
    '{MARCO1}': data.honorarios.marco1,
    '{MARCO2}': data.honorarios.marco2,
    '{MARCO3}': data.honorarios.marco3,
    '{NUMERO_CONTRATO}': data.numero,
    '{DATA_ASSINATURA}': data.dataAssinatura || format(new Date(), 'dd/MM/yyyy'),
  };

  let result = text;
  Object.keys(campos).forEach(key => {
    result = result.split(key).join(campos[key] || '');
  });
  return result;
};

export const generateContractPDF = (data: ContractData, paragraphs?: TemplateParagraph[]) => {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4'
  });

  const margin = 25;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  const addFooter = (currentPage: number, totalPages: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    const footerText = `NL Arquitetos · ${data.numero} · Pág. ${currentPage} de ${totalPages}`;
    const textWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - textWidth) / 2, pageHeight - 10);
  };

  if (!paragraphs || paragraphs.length === 0) {
    // Fallback if no paragraphs provided (original logic simplified)
    doc.setFontSize(18);
    doc.text('Contrato de Prestação de Serviços', margin, yPos);
    return doc;
  }

  // Iterate paragraphs
  paragraphs.forEach((p, index) => {
    const isAnnex = p.texto.startsWith('ANEXO');
    const isSignature = p.texto.includes('________________') || p.texto.toUpperCase().includes('CONTRATANTE') || p.texto.toUpperCase().includes('CONTRATADA');
    
    // Check for page break
    if (isAnnex || (isSignature && !paragraphs[index-1]?.texto.includes('____'))) {
      if (yPos > margin) {
        doc.addPage();
        yPos = margin;
      }
    }

    // Determine font and size
    let fontSize = 11;
    let isBold = false;
    
    if (isAnnex) {
      fontSize = 16;
      isBold = true;
    } else if (p.texto.startsWith('CLÁUSULA')) {
      fontSize = 13;
      isBold = true;
    }

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');

    // Handle indentation (template indent is in some unit, let's assume it's small or convert it)
    // The user said "Parágrafos com indent proporcional". 
    // In the template I saw "indent": 708 or 3540. If 3540 is centered, and contentWidth is ~160mm.
    // Let's guess 3540 / 20 = 177? No, maybe it's 1/1440 of an inch? (Twips)
    // 3540 twips = 3540 / 1440 * 25.4 = 62.4 mm.
    // 708 twips = 708 / 1440 * 25.4 = 12.5 mm.
    const indentMm = (p.indent || 0) / 1440 * 25.4;
    const xPos = margin + indentMm;

    // Process text and runs
    let fullText = replacePlaceholders(p.texto, data);
    
    // If there are runs, we should use them for bold/italic parts
    if (p.runs && p.runs.length > 0) {
      const lines = doc.splitTextToSize(fullText, contentWidth - indentMm);
      
      // jsPDF's splitTextToSize doesn't easily map back to runs if we want mixed formatting.
      // For simplicity and since most paragraphs are single format or just title-bold, 
      // we'll handle standard paragraphs with a single format if they are simple, 
      // or try to handle mixed if needed.
      // But let's check if we can just use the processed fullText for now.
      
      lines.forEach((line: string) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(line, xPos, yPos);
        yPos += fontSize * 0.5; // Line height
      });
      yPos += 2; // Paragraph spacing
    } else {
      const lines = doc.splitTextToSize(fullText, contentWidth - indentMm);
      lines.forEach((line: string) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(line, xPos, yPos);
        yPos += fontSize * 0.5;
      });
      yPos += 2;
    }
  });

  // Add footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  return doc;
};
