import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Search } from 'lucide-react';
import { toast } from "sonner";
import Sidebar from '@/components/Sidebar';

const ProjetoDocumentos = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projeto, setProjeto] = useState<any>(null);
  const [arquivos, setArquivos] = useState<any[]>([]);
  const [pastaAtual, setPastaAtual] = useState('');
  const [breadcrumb, setBreadcrumb] = useState<{nome: string, path: string}[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState('');
  const [itemSelecionado, setItemSelecionado] = useState<any>(null);
  const [modalMover, setModalMover] = useState(false);
  const [destinoMover, setDestinoMover] = useState<string>('');
  const [pastasDestino, setPastasDestino] = useState<any[]>([]);
  const [carregandoPastas, setCarregandoPastas] = useState(false);
  const [caminhoNavegacaoMover, setCaminhoNavegacaoMover] = useState<string>('');
  const [breadcrumbMover, setBreadcrumbMover] = useState<{nome: string, path: string}[]>([]);

  const tipoNome = projeto?.tipo?.includes('Interiores') ? 'Arquitetura + Interiores' 
    : projeto?.tipo?.includes('Comercial') ? 'Comercial' 
    : 'Arquitetura + Interiores';
  const pastaBase = `/NL Arquitetos/07 - Projetos NL OS/01 - Clientes/${projeto?.nome_cliente} - ${tipoNome}`;
  const pastaDocumentos = `${pastaBase}/08 - Documentos`;

  const atalhos = [
    { label: 'Briefing', path: `${pastaDocumentos}/01 - Briefing`, icon: '📝' },
    { label: 'Proposta e Contrato', path: `${pastaDocumentos}/02 - Proposta e Contrato`, icon: '📋' },
    { label: 'Atas e Reuniões', path: `${pastaDocumentos}/04 - Atas e Reunioes`, icon: '📅' },
    { label: 'Decisões e Aprovações', path: `${pastaDocumentos}/05 - Decisoes e Aprovacoes`, icon: '✅' },
  ];

  const listarArquivos = async (caminho: string) => {
    setCarregando(true);
    try {
      const { data, error } = await supabase.functions.invoke('dropbox-proxy', {
        body: { action: 'list_folder', path: caminho }
      });
      if (error) throw error;
      const arquivosOrdenados = (data?.entries || []).sort((a: any, b: any) => 
        a.name.localeCompare(b.name)
      );
      setArquivos(arquivosOrdenados);
      setPastaAtual(caminho);
    } catch (err: any) {
      console.error('Erro ao listar arquivos:', err);
      toast.error("Erro ao carregar arquivos do Dropbox");
    } finally {
      setCarregando(false);
    }
  };
  
  const listarPastasDestino = async (caminho: string) => {
    setCarregandoPastas(true);
    try {
      const { data, error } = await supabase.functions.invoke('dropbox-proxy', {
        body: { action: 'list_folder', path: caminho }
      });
      if (error) throw error;
      const apenasPastas = (data?.entries || []).filter((item: any) => 
        item['.tag'] === 'folder' && item.path_lower !== itemSelecionado?.path_lower
      ).sort((a: any, b: any) => a.name.localeCompare(b.name));
      
      setPastasDestino(apenasPastas);
      setCaminhoNavegacaoMover(caminho);
    } catch (err: any) {
      console.error('Erro ao listar pastas:', err);
      toast.error("Erro ao carregar pastas");
    } finally {
      setCarregandoPastas(false);
    }
  };

  const moverArquivo = async () => {
    if (!itemSelecionado || !destinoMover) return;
    
    setCarregando(true);
    try {
      const nomeFinal = itemSelecionado.name;
      const novoCaminho = `${destinoMover}/${nomeFinal}`;
      
      const { error } = await supabase.functions.invoke('dropbox-proxy', {
        body: { 
          action: 'move', 
          from_path: itemSelecionado.path_display, 
          to_path: novoCaminho 
        }
      });
      
      if (error) throw error;
      
      toast.success(`${itemSelecionado['.tag'] === 'folder' ? 'Pasta' : 'Arquivo'} movido com sucesso!`);
      setModalMover(false);
      setItemSelecionado(null);
      listarArquivos(pastaAtual);
    } catch (err: any) {
      console.error('Erro ao mover:', err);
      toast.error("Erro ao mover item");
    } finally {
      setCarregando(false);
    }
  };

  const arquivosFiltrados = arquivos.filter(item => 
    item.name.toLowerCase().includes(busca.toLowerCase())
  );

  const realcarTexto = (texto: string, destaque: string) => {
    if (!destaque.trim()) return texto;
    const partes = texto.split(new RegExp(`(${destaque})`, 'gi'));
    return (
      <>
        {partes.map((parte, i) => 
          parte.toLowerCase() === destaque.toLowerCase() ? (
            <span key={i} className="bg-[#8B7355]/30 text-[#8B7355] font-bold">{parte}</span>
          ) : (
            parte
          )
        )}
      </>
    );
  };

  useEffect(() => {
    const fetchProjeto = async () => {
      const { data } = await supabase.from('projetos').select('nome_cliente, tipo').eq('id', id).single();
      if (data) {
        setProjeto(data);
        const tipoNomeLocal = data.tipo?.includes('Interiores') ? 'Arquitetura + Interiores' 
          : data.tipo?.includes('Comercial') ? 'Comercial' 
          : 'Arquitetura + Interiores';
        const inicial = `/NL Arquitetos/07 - Projetos NL OS/01 - Clientes/${data.nome_cliente} - ${tipoNomeLocal}`;
        setBreadcrumb([{ nome: 'Documentos', path: inicial }]);
        listarArquivos(inicial);
      }
    };
    if (id) fetchProjeto();
  }, [id]);

  return (
    <div className="flex min-h-screen bg-[#0d0d0d]">
      <Sidebar user="Equipe NL" />
      <main className="flex-1 p-8 md:p-12 text-[#ccc]">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* HEADER */}
          <header className="flex flex-col gap-4">
            <button 
              onClick={() => navigate(`/projetos/detalhe/${id}`)}
              className="flex items-center gap-2 text-[#8B7355] font-mono text-[9px] uppercase tracking-widest hover:opacity-80 transition-opacity w-fit"
            >
              <ArrowLeft size={12} /> VOLTAR
            </button>
            <div>
              <h1 className="text-[22px] font-['Georgia'] text-white">{projeto?.nome_cliente}</h1>
              <p className="text-[#8B7355] font-['Courier_New'] text-[10px] uppercase tracking-[0.2em] mt-1">DOCUMENTOS DO PROJETO</p>
            </div>
          </header>

          {/* ATALHOS RÁPIDOS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {atalhos.map(atalho => (
              <div 
                key={atalho.label}
                onClick={() => {
                  setBreadcrumb([{ nome: 'Documentos', path: pastaDocumentos }, { nome: atalho.label, path: atalho.path }]);
                  listarArquivos(atalho.path);
                }}
                className="bg-[#141414] border border-white/5 p-5 cursor-pointer hover:border-[#8B7355]/30 transition-all group"
              >
                <span className="text-xl mb-3 block">{atalho.icon}</span>
                <p className="text-[10px] font-mono uppercase tracking-wider text-white/70 group-hover:text-[#8B7355]">{atalho.label}</p>
              </div>
            ))}
          </div>

          {/* BARRA DE BUSCA */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555]" size={14} />
            <input 
              type="text"
              placeholder="BUSCAR PASTA OU ARQUIVO..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-[#141414] border border-white/5 p-4 pl-12 text-[10px] font-mono uppercase tracking-widest text-white focus:outline-none focus:border-[#8B7355]/50 transition-colors"
            />
          </div>

          {/* EXPLORADOR */}
          <div className="bg-[#141414] border border-white/5 rounded-sm overflow-hidden">
            {/* Breadcrumb */}
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {breadcrumb.map((item, i) => (
                  <span key={i} className="flex items-center">
                    <button 
                      onClick={() => {
                        const newBreadcrumb = breadcrumb.slice(0, i + 1);
                        setBreadcrumb(newBreadcrumb);
                        listarArquivos(item.path);
                      }} 
                      style={{ color: '#8B7355', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Courier New', fontSize: '9px', textTransform: 'uppercase' }}
                    >
                      {item.nome}
                    </button>
                    {i < breadcrumb.length - 1 && <span style={{ color: '#333', margin: '0 4px' }}>›</span>}
                  </span>
                ))}
              </div>

              {/* UPLOAD */}
              <div>
                <input
                  type="file"
                  id="upload-input"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const base64 = (ev.target?.result as string).split(',')[1];
                      const { error } = await supabase.functions.invoke('dropbox-proxy', {
                        body: { action: 'upload', path: `${pastaAtual}/${file.name}`, content: base64 }
                      });
                      if (error) {
                        toast.error(`Erro ao enviar ${file.name}`);
                      } else {
                        toast.success(`${file.name} enviado!`);
                        listarArquivos(pastaAtual);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <button
                  onClick={() => document.getElementById('upload-input')?.click()}
                  style={{ fontFamily: 'Courier New', fontSize: '9px', color: '#8B7355', background: 'none', border: '1px solid rgba(139,115,85,0.3)', padding: '8px 16px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '3px' }}
                >
                  + UPLOAD NESTA PASTA
                </button>
              </div>
            </div>

            {/* Lista de Arquivos */}
            <div className="min-h-[400px]">
              {carregando ? (
                <div className="flex items-center justify-center h-[400px] text-[10px] font-mono text-[#555] uppercase tracking-widest">
                  Carregando arquivos...
                </div>
              ) : arquivosFiltrados.length === 0 ? (
                <div className="flex items-center justify-center h-[400px] text-[10px] font-mono text-[#444] uppercase tracking-widest">
                  {busca ? 'Nenhum resultado encontrado' : 'Pasta vazia'}
                </div>
              ) : (
                arquivosFiltrados.map(item => (
                  <div
                    key={item.path_lower}
                    onClick={() => {
                      if (item['.tag'] === 'folder') {
                        listarArquivos(item.path_display);
                        setBreadcrumb(prev => [...prev, { nome: item.name, path: item.path_display }]);
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                    className="hover:bg-white/[0.02] transition-colors group/row"
                  >
                    <span style={{ fontSize: '16px' }}>{item['.tag'] === 'folder' ? '📁' : '📄'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Arial', fontSize: '13px', color: '#ccc' }}>
                        {realcarTexto(item.name, busca)}
                      </div>
                      {item.size && <div style={{ fontFamily: 'Arial', fontSize: '10px', color: '#555' }}>{(item.size / 1024).toFixed(0)} KB</div>}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemSelecionado(item);
                          setDestinoMover('');
                          const base = `/NL Arquitetos/07 - Projetos NL OS/01 - Clientes/${projeto?.nome_cliente} - ${tipoNome}`;
                          setCaminhoNavegacaoMover(base);
                          setBreadcrumbMover([{ nome: 'RAIZ DO CLIENTE', path: base }]);
                          listarPastasDestino(base);
                          setModalMover(true);
                        }}
                        style={{ fontFamily: 'Courier New', fontSize: '8px', color: '#8B7355', background: 'none', border: '1px solid rgba(139,115,85,0.3)', padding: '4px 10px', cursor: 'pointer', borderRadius: '3px' }}
                        className="hover:bg-[#8B7355] hover:text-white transition-all"
                      >
                        MOVER
                      </button>
                      {item['.tag'] === 'file' && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const { data } = await supabase.functions.invoke('dropbox-proxy', {
                              body: { action: 'get_temporary_link', path: item.path_display }
                            });
                            if (data?.link) window.open(data.link, '_blank');
                          }}
                          style={{ fontFamily: 'Courier New', fontSize: '8px', color: '#8B7355', background: 'none', border: '1px solid rgba(139,115,85,0.3)', padding: '4px 10px', cursor: 'pointer', borderRadius: '3px' }}
                          className="hover:bg-[#8B7355] hover:text-white transition-all"
                        >
                          ↓ BAIXAR
                        </button>
                      )}
                    </div>
                    {item['.tag'] === 'folder' && <span style={{ color: '#555', fontSize: '12px' }}>→</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* MODAL MOVER */}
        {modalMover && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#141414] border border-white/10 w-full max-w-lg shadow-2xl rounded-sm">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div>
                  <h2 className="text-[12px] font-mono text-white uppercase tracking-[0.2em]">MOVER ITEM</h2>
                  <p className="text-[9px] font-mono text-[#8B7355] mt-1 uppercase tracking-wider truncate max-w-[300px]">
                    {itemSelecionado?.name}
                  </p>
                </div>
                <button 
                  onClick={() => setModalMover(false)}
                  className="text-[#555] hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
                  {breadcrumbMover.map((item, i) => (
                    <span key={i} className="flex items-center shrink-0">
                      <button 
                        onClick={() => {
                          const newB = breadcrumbMover.slice(0, i + 1);
                          setBreadcrumbMover(newB);
                          listarPastasDestino(item.path);
                          setDestinoMover('');
                        }}
                        className="text-[9px] font-mono text-[#8B7355] uppercase hover:text-white transition-colors"
                      >
                        {item.nome}
                      </button>
                      {i < breadcrumbMover.length - 1 && <span className="text-[#333] mx-1">›</span>}
                    </span>
                  ))}
                </div>

                <div className="bg-black/20 border border-white/5 max-h-[250px] overflow-y-auto">
                  {carregandoPastas ? (
                    <div className="p-8 text-center text-[9px] font-mono text-[#555] uppercase tracking-widest">Carregando...</div>
                  ) : pastasDestino.length === 0 ? (
                    <div className="p-8 text-center text-[9px] font-mono text-[#444] uppercase tracking-widest">Nenhuma subpasta encontrada</div>
                  ) : (
                    pastasDestino.map(pasta => (
                      <div 
                        key={pasta.path_lower}
                        className={`flex items-center gap-3 p-3 cursor-pointer border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors ${destinoMover === pasta.path_display ? 'bg-[#8B7355]/10 border-l-2 border-l-[#8B7355]' : ''}`}
                        onClick={() => setDestinoMover(pasta.path_display)}
                        onDoubleClick={() => {
                          setBreadcrumbMover(prev => [...prev, { nome: pasta.name, path: pasta.path_display }]);
                          listarPastasDestino(pasta.path_display);
                          setDestinoMover('');
                        }}
                      >
                        <span className="text-sm">📁</span>
                        <span className="text-[11px] font-sans text-white/80">{pasta.name}</span>
                        {destinoMover === pasta.path_display && <span className="ml-auto text-[#8B7355] text-[10px]">✓</span>}
                      </div>
                    ))
                  )}
                </div>

                <p className="text-[8px] font-mono text-[#555] uppercase tracking-wider italic">
                  * Dê um duplo clique na pasta para navegar dentro dela.
                </p>
              </div>

              <div className="p-6 border-t border-white/5 flex gap-3 justify-end bg-white/[0.01]">
                <button 
                  onClick={() => setModalMover(false)}
                  className="px-6 py-2 border border-white/5 text-[9px] font-mono text-[#777] uppercase tracking-widest hover:bg-white/5 transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  disabled={!destinoMover || carregando}
                  onClick={moverArquivo}
                  className={`px-8 py-2 text-[9px] font-mono text-white uppercase tracking-widest transition-all ${!destinoMover || carregando ? 'opacity-30 cursor-not-allowed border border-white/5' : 'bg-[#8B7355] hover:bg-[#A68B6A]'}`}
                >
                  {carregando ? 'MOVENDO...' : 'MOVER PARA CÁ'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProjetoDocumentos;
