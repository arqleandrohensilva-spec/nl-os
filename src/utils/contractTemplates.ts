
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ContractData {
  numero: string;
  cliente: {
    nome: string;
    cpf: string;
    endereco: string;
    nacionalidade: string;
    estadoCivil: string;
    profissao: string;
  };
  projeto: {
    tipo: string;
    plano: string;
    endereco: string;
    tipoImovel: string;
    areaTerreno: string;
    areaConstruida: string;
    matricula: string;
  };
  prazos: {
    briefing: string;
    estudo: string;
    legal: string;
    executivo: string;
    total: string;
  };
  honorarios: {
    totalExecutivo: string;
    totalCompleto: string;
    marco1: string;
    marco2: string;
    marco3: string;
  };
  nl: {
    cauLeandro: string;
    cauNeandro: string;
    cpfNeandro: string;
  };
}

export const generateContractPDF = (data: ContractData) => {
  const doc = new jsPDF();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 40;

  // Helper for text wrapping and centering
  const addCenteredText = (text: string, size: number, y: number, isBold = false) => {
    doc.setFontSize(size);
    if (isBold) doc.setFont('helvetica', 'bold');
    else doc.setFont('helvetica', 'normal');
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  // --- CAPA ---
  doc.setFillColor(26, 24, 22); // #1A1816
  // doc.rect(0, 0, pageWidth, 40, 'F');
  
  yPos = 80;
  addCenteredText('NL ARQUITETURA', 30, yPos, true);
  
  yPos = 120;
  addCenteredText('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', 18, yPos, true);
  addCenteredText('DE ARQUITETURA E INTERIORES', 16, yPos + 10, true);
  
  yPos = 180;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`CONTRATANTE: ${data.cliente.nome}`, margin, yPos);
  doc.text(`CONTRATO Nº: ${data.numero}`, margin, yPos + 10);
  doc.text(`DATA: ${format(new Date(), 'dd/MM/yyyy')}`, margin, yPos + 20);

  // --- SUMÁRIO (Simplified) ---
  doc.addPage();
  yPos = 30;
  addCenteredText('SUMÁRIO', 16, yPos, true);
  yPos += 20;
  const sections = [
    '1. DAS PARTES',
    '2. DO OBJETO',
    '3. DAS ETAPAS DO PROJETO',
    '4. DOS PRAZOS',
    '5. DOS HONORÁRIOS',
    '6. DAS OBRIGAÇÕES DA CONTRATADA',
    '7. DAS OBRIGAÇÕES DO CONTRATANTE',
    '8. DA PROPRIEDADE INTELECTUAL',
    '9. DA RESCISÃO',
    '10. DISPOSIÇÕES GERAIS'
  ];
  sections.forEach(s => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(s, margin, yPos);
    yPos += 10;
  });

  // --- CLÁUSULAS (14 total) ---
  doc.addPage();
  yPos = 30;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CLÁUSULA PRIMEIRA – DAS PARTES', margin, yPos);
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const partesText = `CONTRATADA: NL ARQUITETURA, representada por LEANDRO (CAU ${data.nl.cauLeandro}) e NEANDRO (CAU ${data.nl.cauNeandro}, CPF ${data.nl.cpfNeandro}).\n\nCONTRATANTE: ${data.cliente.nome}, ${data.cliente.nacionalidade}, ${data.cliente.estadoCivil}, ${data.cliente.profissao}, inscrito(a) no CPF sob nº ${data.cliente.cpf}, residente em ${data.cliente.endereco}.`;
  doc.text(doc.splitTextToSize(partesText, pageWidth - (margin * 2)), margin, yPos);
  
  yPos += 40;
  doc.setFont('helvetica', 'bold');
  doc.text('CLÁUSULA SEGUNDA – DO OBJETO', margin, yPos);
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  const objetoText = `O presente contrato tem por objeto a prestação de serviços de ${data.projeto.tipo} para o imóvel localizado em ${data.projeto.endereco}, seguindo o plano ${data.projeto.plano}.`;
  doc.text(doc.splitTextToSize(objetoText, pageWidth - (margin * 2)), margin, yPos);

  // Remaining clauses (3-14) placeholders
  for (let i = 3; i <= 14; i++) {
    yPos += 25;
    if (yPos > 260) {
      doc.addPage();
      yPos = 30;
    }
    doc.setFont('helvetica', 'bold');
    doc.text(`CLÁUSULA ${i} – TÍTULO DA CLÁUSULA ${i}`, margin, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.text(`Conteúdo detalhado da cláusula ${i} referente aos termos e condições da NL Arquitetura...`, margin, yPos);
  }

  // --- ASSINATURAS ---
  doc.addPage();
  yPos = 50;
  addCenteredText('__________________________________________', 12, yPos);
  addCenteredText(data.cliente.nome, 10, yPos + 5);
  addCenteredText('CONTRATANTE', 8, yPos + 10);
  
  yPos += 40;
  addCenteredText('__________________________________________', 12, yPos);
  addCenteredText('NL ARQUITETURA', 10, yPos + 5);
  addCenteredText('CONTRATADA', 8, yPos + 10);

  // --- ANEXO I - ESCOPO ---
  doc.addPage();
  yPos = 30;
  addCenteredText('ANEXO I – ESCOPO DOS SERVIÇOS', 14, yPos, true);
  yPos += 20;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tipo de Serviço: ${data.projeto.tipo}`, margin, yPos);
  doc.text(`Plano Escolhido: ${data.projeto.plano}`, margin, yPos + 10);
  doc.text(`Local: ${data.projeto.endereco}`, margin, yPos + 20);
  
  // --- ANEXO II - CRONOGRAMA ---
  doc.addPage();
  yPos = 30;
  addCenteredText('ANEXO II – CRONOGRAMA DE ETAPAS', 14, yPos, true);
  yPos += 20;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Etapa', 'Prazo Estimado']],
    body: [
      ['Levantamento & Briefing', `${data.prazos.briefing} dias úteis`],
      ['Estudo Preliminar com 3D', `${data.prazos.estudo} dias úteis`],
      ['Projeto Legal & Aprovações', `${data.prazos.legal} dias úteis`],
      ['Projeto Executivo', `${data.prazos.executivo} dias úteis`],
      ['PRAZO TOTAL ESTIMADO', `${data.prazos.total} semanas`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [139, 115, 85] } // Bronze
  });

  // --- ANEXO III - HONORÁRIOS ---
  doc.addPage();
  yPos = 30;
  addCenteredText('ANEXO III – HONORÁRIOS E PAGAMENTOS', 14, yPos, true);
  yPos += 20;
  
  const valTotal = data.projeto.plano === 'Executivo' ? data.honorarios.totalExecutivo : data.honorarios.totalCompleto;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Marco de Pagamento', 'Percentual', 'Valor (R$)']],
    body: [
      ['Marco 1 – Entrada', '30%', data.honorarios.marco1],
      ['Marco 2 – Anteprojeto', '40%', data.honorarios.marco2],
      ['Marco 3 – Executivo', '30%', data.honorarios.marco3],
      ['TOTAL DO CONTRATO', '100%', valTotal]
    ],
    theme: 'striped',
    headStyles: { fillColor: [139, 115, 85] }
  });

  // --- ANEXO IV - SERVIÇOS ADICIONAIS ---
  doc.addPage();
  yPos = 30;
  addCenteredText('ANEXO IV – SERVIÇOS ADICIONAIS', 14, yPos, true);
  yPos += 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const adicionais = `Os seguintes serviços não estão inclusos no escopo base e serão cobrados à parte caso solicitados:\n\n1. Maquetes físicas;\n2. Taxas de prefeitura e órgãos públicos;\n3. Projetos complementares (elétrica, hidráulica, estrutural);\n4. Visitas técnicas excedentes ao previsto.`;
  doc.text(doc.splitTextToSize(adicionais, pageWidth - (margin * 2)), margin, yPos);

  return doc;
};
