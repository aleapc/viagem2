const domingo = (ano, mes, ordem) => {
  const primeiro = new Date(ano, mes, 1);
  return new Date(ano, mes, 1 + ((7 - primeiro.getDay()) % 7) + (ordem - 1) * 7);
};
const iso = (d) => d.toISOString().slice(0, 10);
const janela = (data) => { const a = new Date(data); a.setDate(a.getDate() - 1); const b = new Date(data); b.setDate(b.getDate() + 1); return [iso(a), iso(b)]; };

export function proximasOcasioes(agora = new Date()) {
  const ano = agora.getFullYear();
  const eventos = [];
  for (const y of [ano, ano + 1]) eventos.push(
    ['Dia das Mães', domingo(y, 4, 2)], ['Dia dos Pais', domingo(y, 7, 2)],
    ['Dia dos Namorados', new Date(y, 5, 12)], ['Natal', new Date(y, 11, 25)], ['Réveillon', new Date(y, 11, 31)]
  );
  return eventos.filter(([,d]) => d >= new Date(agora.toDateString())).sort((a,b)=>a[1]-b[1]).slice(0,3).map(([nome,data])=>({nome,data:iso(data),janela:janela(data),dias:Math.ceil((data-agora)/86400000)}));
}
