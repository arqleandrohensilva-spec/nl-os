
/**
 * Simple utility to convert numbers to Portuguese words (extenso)
 * Implementation for a basic currency extension (Real/Reais)
 */

const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const dezena1 = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const centenas = ["", "cem", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function escreverGrupo(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  
  let result = "";
  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;
  
  if (c > 0) {
    result += (c === 1 && (d > 0 || u > 0) ? "cento" : centenas[c]);
  }
  
  if (d > 0) {
    if (result !== "") result += " e ";
    if (d === 1) {
      result += dezena1[u];
      return result;
    } else {
      result += dezenas[d];
    }
  }
  
  if (u > 0) {
    if (result !== "") result += " e ";
    result += unidades[u];
  }
  
  return result;
}

export function valorPorExtenso(valor: number): string {
  if (valor === 0) return "zero reais";
  
  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);
  
  let partes: string[] = [];
  
  if (inteiro > 0) {
    const milhoes = Math.floor(inteiro / 1000000);
    const mil = Math.floor((inteiro % 1000000) / 1000);
    const centenasResto = inteiro % 1000;
    
    if (milhoes > 0) {
      partes.push(escreverGrupo(milhoes) + (milhoes === 1 ? " milhão" : " milhões"));
    }
    
    if (mil > 0) {
      partes.push(escreverGrupo(mil) + " mil");
    }
    
    if (centenasResto > 0) {
      partes.push(escreverGrupo(centenasResto));
    }
    
    const textoReais = inteiro === 1 ? " real" : " reais";
    partes[partes.length - 1] += textoReais;
  }
  
  let result = partes.join(", ").replace(/, ([^,]*)$/, " e $1");
  
  if (centavos > 0) {
    const textoCentavos = centavos === 1 ? " centavo" : " centavos";
    if (result !== "") result += " e ";
    result += escreverGrupo(centavos) + textoCentavos;
  }
  
  return result;
}
