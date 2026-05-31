import { supabase } from "@/integrations/supabase/client";
import { ContractData } from "@/utils/contractTemplates";
import { toast } from "sonner";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import mammoth from "mammoth";
import html2pdf from "html2pdf.js";

const valorPorExtenso = (valor: number): string => {
  if (!valor || valor === 0) return "zero reais";
  const unidades = [
    "",
    "um",
    "dois",
    "três",
    "quatro",
    "cinco",
    "seis",
    "sete",
    "oito",
    "nove",
    "dez",
    "onze",
    "doze",
    "treze",
    "quatorze",
    "quinze",
    "dezesseis",
    "dezessete",
    "dezoito",
    "dezenove",
  ];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = [
    "",
    "cento",
    "duzentos",
    "trezentos",
    "quatrocentos",
    "quinhentos",
    "seiscentos",
    "setecentos",
    "oitocentos",
    "novecentos",
  ];
  const converterAte999 = (n: number): string => {
    if (n === 100) return "cem";
    if (n === 0) return "";
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    const partes = [];
    if (c > 0) partes.push(centenas[c]);
    if (n % 100 < 20 && n % 100 > 0) {
      partes.push(unidades[n % 100]);
    } else {
      if (d > 0) partes.push(dezenas[d]);
      if (u > 0) partes.push(unidades[u]);
    }
    return partes.join(" e ");
  };
  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);
  let resultado = "";
  if (inteiro >= 1000000) {
    const m = Math.floor(inteiro / 1000000);
    resultado += converterAte999(m) + (m === 1 ? " milhão" : " milhões");
    if (inteiro % 1000000 > 0) resultado += " e ";
  }
  if (inteiro >= 1000 && inteiro < 1000000) {
    const mil = Math.floor(inteiro / 1000);
    resultado += converterAte999(mil) + " mil";
    if (inteiro % 1000 > 0) resultado += " e ";
  }
  const resto = inteiro % 1000;
  if (resto > 0) resultado += converterAte999(resto);
  resultado += inteiro === 1 ? " real" : " reais";
  if (centavos > 0) resultado += " e " + converterAte999(centavos) + (centavos === 1 ? " centavo" : " centavos");
  return resultado;
};

export const generateContractDocx = async (data: ContractData) => {
  try {
    const { data: dropboxSettings } = await supabase
      .from("dropbox_settings")
      .select("contract_template_path, vendor_template_path")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();

    const templatePath =
      (dropboxSettings as any)?.contract_template_path ||
      "/NL Arquitetos/07 - Projetos NL OS/00 - Templates/NL_Contrato_Final.docx";
    const vendorTemplatePath = (dropboxSettings as any)?.vendor_template_path;
    const activePath = data.projeto.plano === "Fornecedor" && vendorTemplatePath ? vendorTemplatePath : templatePath;

    const response = await supabase.functions.invoke("dropbox-proxy", {
      body: { action: "download", path: activePath },
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    if (response.error) throw new Error(`Erro de rede: ${response.error.message}`);
    if (!response.data) throw new Error("Resposta vazia");
    if (response.data?.error) {
      const err = response.data.error;
      if (err[".tag"] === "expired_access_token")
        throw new Error("Conexão com Dropbox expirou. Reconecte nas configurações.");
      throw new Error(`Erro no Dropbox: ${response.data.error_summary || JSON.stringify(err)}`);
    }
    let arrayBuffer: ArrayBuffer;
    if (response.data instanceof Blob) {
      arrayBuffer = await response.data.arrayBuffer();
    } else if (response.data instanceof ArrayBuffer) {
      arrayBuffer = response.data;
    } else {
      throw new Error("Formato de arquivo inválido");
    }

    const parseNum = (val: string | undefined): number => {
      if (!val) return 0;
      const cleaned = String(val).replace(/[^\d,.]/g, "");
      const normalized = cleaned.replace(/\./g, "").replace(",", ".");
      return parseFloat(normalized) || 0;
    };
    const formatVal = (n: number): string =>
      n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Valor base — tenta totalExecutivo, totalCompleto, marco1*10/3 como fallback
    const valorExec = parseNum(data.honorarios.totalExecutivo);
    const valorComp = parseNum(data.honorarios.totalCompleto);
    const valor =
      data.projeto.plano === "Completo"
        ? valorComp > 0
          ? valorComp
          : valorExec
        : valorExec > 0
          ? valorExec
          : valorComp;

    // Marcos — usa os que vieram preenchidos, recalcula só se vazios
    const m1raw = parseNum(data.honorarios.marco1);
    const m2raw = parseNum(data.honorarios.marco2);
    const m3raw = parseNum(data.honorarios.marco3);

    const marco1 = m1raw > 0 ? m1raw : Math.round(valor * 0.30 * 100) / 100;
    const marco2 = m2raw > 0 ? m2raw : Math.round(valor * 0.40 * 100) / 100;
    const marco3 = m3raw > 0 ? m3raw : Math.round((valor - marco1 - marco2) * 100) / 100;

    const tipoImovel = data.projeto.tipoImovel || "Residência Existente";

    const templateData = {
      ano: String(new Date().getFullYear()),
      nro_contrato: data.numero || "",
      numero: data.numero || "001",
      data: data.dataAssinatura || new Date().toLocaleDateString("pt-BR"),
      nome_cliente: (data.cliente.nome || "").toUpperCase(),
      cpf_cliente: data.cliente.cpf || "",
      nacionalidade: data.cliente.nacionalidade || "brasileiro(a)",
      estado_civil: data.cliente.estadoCivil || "",
      profissao: data.cliente.profissao || "",
      endereco_cliente: data.cliente.endereco || "",
      endereco_imovel: (data.projeto.endereco || "").toUpperCase(),

      tipo_residencial: data.projeto.tipo === "Residencial" ? "X" : " ",
      tipo_interiores: data.projeto.tipo === "Interiores" || data.projeto.tipo === "int" ? "X" : " ",
      tipo_comercial: data.projeto.tipo === "Comercial" || data.projeto.tipo === "com" ? "X" : " ",
      tipo_arqint:
        data.projeto.tipo === "Arquitetura + Interiores" ||
        data.projeto.tipo === "ARQ+INT" ||
        data.projeto.tipo === "arq"
          ? "X"
          : " ",

      plano_executivo: data.projeto.plano !== "Completo" ? "X" : " ",
      plano_completo: data.projeto.plano === "Completo" ? "X" : " ",

      tipo_imovel_terreno: tipoImovel === "Terreno" ? "X" : " ",
      tipo_imovel_residencia: tipoImovel === "Residência" || tipoImovel === "Residência Existente" ? "X" : " ",
      tipo_imovel_apartamento: tipoImovel === "Apartamento" ? "X" : " ",
      tipo_imovel_sala: tipoImovel === "Sala Comercial" ? "X" : " ",
      tipo_imovel_outro: "",

      area_terreno:
        data.projeto.areaTerreno != null && data.projeto.areaTerreno !== ""
          ? data.projeto.areaTerreno
          : "Não se aplica",
      area_construida:
        data.projeto.areaConstruida != null && data.projeto.areaConstruida !== ""
          ? data.projeto.areaConstruida
          : "Não se aplica",
      matricula: data.projeto.matricula || "",
      cartorio: data.projeto.cartorio || "",

      prazo_briefing: data.prazos.briefing || "5",
      prazo_estudo: data.prazos.estudo || "15",
      prazo_legal: data.prazos.legal || "10",
      prazo_executivo: data.prazos.executivo || "30",
      prazo_semanas: data.prazos.total || "",
      prazo_total_dias: (() => {
        const b = parseInt(data.prazos.briefing || "0");
        const e = parseInt(data.prazos.estudo || "0");
        const l = parseInt(data.prazos.legal || "0");
        const x = parseInt(data.prazos.executivo || "0");
        const t = b + e + l + x;
        return t > 0 ? String(t) : data.prazos.total || "";
      })(),
      prazo_total: (() => {
        const b = parseInt(data.prazos.briefing || "0");
        const e = parseInt(data.prazos.estudo || "0");
        const l = parseInt(data.prazos.legal || "0");
        const x = parseInt(data.prazos.executivo || "0");
        const t = b + e + l + x;
        return t > 0 ? String(t) : data.prazos.total || "";
      })(),

      valor_total: formatVal(valor),
      valor_total_extenso: valorPorExtenso(valor),
      marco1_valor: formatVal(marco1),
      marco1_extenso: valorPorExtenso(marco1),
      marco2_valor: formatVal(marco2),
      marco2_extenso: valorPorExtenso(marco2),
      marco3_valor: formatVal(marco3),
      marco3_extenso: valorPorExtenso(marco3),

      nome_cliente_testemunha: data.cliente.testemunhaNome || "",
      cpf_testemunha: data.cliente.testemunhaCpf || "",

      tipo_projeto_nome: (() => {
        const t = String(data.projeto.tipo || "").trim();
        if (t.includes("Arquitetura") || t === "ARQ+INT" || t === "arq") return "ARQUITETURA + INTERIORES";
        if (t === "Interiores" || t === "int") return "INTERIORES";
        if (t === "Comercial" || t === "com") return "COMERCIAL";
        if (t === "Residencial") return "ARQUITETURA RESIDENCIAL";
        return t;
      })(),
      plano_nome: data.projeto.plano === "Completo" ? "PLANO COMPLETO" : "PLANO EXECUTIVO",
    };

    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      errorLogging: false,
      delimiters: { start: "{", end: "}" },
    });
    try {
      doc.setData(templateData);
      doc.render();
    } catch (renderError: any) {
      const message = renderError?.properties?.errors?.map((e: any) => e.message)?.join(", ") || renderError.message;
      throw new Error(`Erro ao preencher template: ${message}`);
    }

    return doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  } catch (error: any) {
    console.error("Erro ao gerar contrato:", error);
    toast.error(`Erro ao gerar contrato: ${error.message || error}`);
  }
};

export const getContractPreviewHtml = async (data: ContractData) => {
  try {
    const docxBlob = await generateContractDocx(data);
    if (!docxBlob) return null;

    const arrayBuffer = await docxBlob.arrayBuffer();
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: [
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Heading 1'] => h2:fresh",
          "p[style-name='Heading 2'] => h3:fresh",
          "p[style-name='Normal'] => p:fresh",
          "b => strong",
          "i => em",
          "u => u",
          "strike => del",
        ],
      },
    );
    let html = result.value;
    html = html.replace(/<p><\/p>/g, "<br />");

    return `
      <style>
        .contract-preview h1 { font-size: 20pt; font-weight: bold; text-align: center; margin-bottom: 24pt; text-transform: uppercase; font-family: Arial, sans-serif; }
        .contract-preview h2 { font-size: 14pt; font-weight: bold; margin-top: 18pt; margin-bottom: 9pt; border-bottom: 1px solid #000; padding-bottom: 3pt; font-family: Arial, sans-serif; }
        .contract-preview p { margin-bottom: 10pt; text-align: justify; line-height: 1.5; font-size: 11pt; font-family: Arial, sans-serif; }
        .contract-preview strong { font-weight: bold; }
        .contract-preview table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
        .contract-preview td, .contract-preview th { border: 1px solid #000; padding: 6pt; font-size: 10pt; }
      </style>
      <div class="contract-preview">
        ${html}
      </div>
    `;
  } catch (error: any) {
    console.error("Erro ao gerar preview do contrato:", error);
    toast.error(`Erro ao gerar preview: ${error.message || error}`);
    return null;
  }
};

export const generateContractPDF = async (data: ContractData) => {
  try {
    const docxBlob = await generateContractDocx(data);
    if (!docxBlob) return null;

    const arrayBuffer = await docxBlob.arrayBuffer();
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: [
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Heading 1'] => h2:fresh",
          "p[style-name='Heading 2'] => h3:fresh",
          "b => strong",
          "i => em",
        ],
      }
    );

    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 794px;
      background: #ffffff;
      color: #000000;
      font-family: Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      padding: 40px;
      box-sizing: border-box;
      z-index: 99999;
      opacity: 0;
      pointer-events: none;
    `;

    const style = document.createElement('style');
    style.textContent = `
      h1 { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 20px; text-transform: uppercase; }
      h2 { font-size: 13pt; font-weight: bold; margin-top: 16px; margin-bottom: 8px; }
      p { margin-bottom: 8px; text-align: justify; line-height: 1.5; font-size: 11pt; }
      strong { font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0; }
      td, th { border: 1px solid #000; padding: 6px; font-size: 10pt; }
    `;
    container.appendChild(style);

    const content = document.createElement('div');
    content.innerHTML = result.value;
    container.appendChild(content);
    document.body.appendChild(container);

    await new Promise(resolve => setTimeout(resolve, 600));

    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `${data.numero || 'Contrato'} - ${data.cliente.nome}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
      },
      jsPDF: {
        unit: 'mm' as const,
        format: 'a4' as const,
        orientation: 'portrait' as const
      }
    };

    const pdfBlob = await html2pdf().set(opt).from(container).output('blob');
    document.body.removeChild(container);
    return pdfBlob;
  } catch (error: any) {
    console.error('Erro ao gerar PDF:', error);
    toast.error(`Erro ao gerar PDF: ${error.message || error}`);
    return null;
  }
};
