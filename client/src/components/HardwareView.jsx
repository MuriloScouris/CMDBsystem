import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus, X, Database, Cpu, MemoryStick, HardDrive,
  Trash2, Edit2, Monitor, RefreshCw, AlertTriangle,
  Undo, History as HistoryIcon, MessageSquare, Clock, CheckSquare,
  ChevronUp, ChevronDown, ChevronsUpDown
} from 'lucide-react';
import SidePanel from './SidePanel';
import Modal from './Modal';

export default function HardwareView({ currentTypeFilter }) {
  const [stats, setStats] = useState({ total: 0, in_stock: 0, maintenance: 0, lost: 0 });
  const [assets, setAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('specs');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  // Data
  const [assetTypes, setAssetTypes] = useState([]);
  const [standardModels, setStandardModels] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);

  // Forms
  const [deleteJustification, setDeleteJustification] = useState('');
  const [newAsset, setNewAsset] = useState({ type_id: '', asset_tag: '', manufacturer: '', model_id: '', status: 'In_Stock', user_id: '' });
  const [editAsset, setEditAsset] = useState({ manufacturer: '', model_id: '', custom_attributes: {} });
  const [transferData, setTransferData] = useState({ status: 'Assigned', user_id: '', ticket: '', justification: '' });
  const [maintData, setMaintData] = useState({ type: 'Hardware Failure', ticket: '', description: '' });
  const [returnData, setReturnData] = useState({ justification: '' });
  const [resolveData, setResolveData] = useState({ logId: null, notes: '', newStatus: 'In_Stock' });
  const [sortConfig, setSortConfig] = useState({ key: 'asset_tag', direction: 'asc' });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchStats(), fetchAssets(), fetchFormData()]);
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [currentTypeFilter]);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/stats', { params: { typeId: currentTypeFilter } });
      setStats(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchAssets = async () => {
    try {
      const res = await axios.get('/api/assets');
      setAssets(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchFormData = async () => {
    try {
      const [typesRes, modelsRes, usersRes] = await Promise.all([
        axios.get('/api/asset-types'),
        axios.get('/api/models'),
        axios.get('/api/users')
      ]);
      setAssetTypes(typesRes.data || []);
      setStandardModels(modelsRes.data || []);
      if (Array.isArray(usersRes.data)) {
        setUsers(usersRes.data.filter(u => u.status === 'Active'));
      } else {
        setUsers([]);
      }
    } catch (e) { 
      console.error(e);
      setAssetTypes([]);
      setStandardModels([]);
      setUsers([]);
    }
  };

  const handleAssetClick = async (asset) => {
    setSelectedAsset(asset);
    setIsPanelOpen(true);
    setActiveTab('specs');
    try {
      const res = await axios.get(`/api/assets/${asset.id}`);
      setSelectedAsset(res.data.asset);
      setHistory(res.data.history || []);
      setMaintenanceLogs(res.data.maintenance || []);
    } catch (e) { console.error(e); }
  };

  const handleSaveNewAsset = async () => {
    try {
      if (!newAsset.type_id || !newAsset.asset_tag || !newAsset.model_id) return alert('Campos obrigatórios faltando');
      const model = standardModels.find(m => m.id == newAsset.model_id);
      const payload = {
        ...newAsset,
        model: model.name,
        custom_attributes: { cpu: model.cpu, ram: model.ram, storage: model.storage, inches: model.inches }
      };
      await axios.post('/api/assets', payload);
      setIsAddModalOpen(false);
      setNewAsset({ type_id: '', asset_tag: '', manufacturer: '', model_id: '', status: 'In_Stock', user_id: '' });
      fetchAssets(); fetchStats();
    } catch (e) { alert('Erro ao salvar'); }
  };

  const handleSaveEdit = async () => {
    try {
      const model = standardModels.find(m => m.id == editAsset.model_id);
      await axios.put(`/api/assets/${selectedAsset.id}/specs`, {
        manufacturer: editAsset.manufacturer,
        model: model ? model.name : '',
        custom_attributes: editAsset.custom_attributes
      });
      setIsEditModalOpen(false);
      const res = await axios.get(`/api/assets/${selectedAsset.id}`);
      setSelectedAsset(res.data.asset);
      fetchAssets();
    } catch (e) { alert('Erro ao atualizar'); }
  };

  const handleDeleteAsset = async () => {
    if (!deleteJustification.trim()) return alert('Justificativa obrigatória');
    try {
      await axios.delete(`/api/assets/${selectedAsset.id}`, { data: { justification: deleteJustification } });
      setIsDeleteModalOpen(false); setIsPanelOpen(false);
      fetchAssets(); fetchStats();
    } catch (e) { alert('Erro ao excluir'); }
  };

  const handleTransfer = async () => {
    if (!transferData.justification.trim()) return alert('Justificativa obrigatória');
    if (transferData.status === 'Assigned' && !transferData.user_id) return alert('Selecione um usuário');
    try {
      await axios.post(`/api/assets/${selectedAsset.id}/transfer`, {
        new_user_id: transferData.user_id,
        new_status: transferData.status,
        ticket_number: transferData.ticket,
        justification: transferData.justification
      });
      setIsTransferModalOpen(false);
      handleAssetClick(selectedAsset);
      fetchAssets(); fetchStats();
    } catch (e) { alert('Erro ao transferir'); }
  };

  const handleMaintenance = async () => {
    if (!maintData.description.trim()) return alert('Descrição obrigatória');
    try {
      await axios.post(`/api/assets/${selectedAsset.id}/maintenance`, {
        issue_type: maintData.type,
        description: maintData.description,
        ticket_number: maintData.ticket
      });
      setIsMaintenanceModalOpen(false);
      handleAssetClick(selectedAsset);
      fetchAssets(); fetchStats();
    } catch (e) { alert('Erro ao abrir chamado'); }
  };

  const handleReturn = async () => {
    if (!returnData.justification.trim()) return alert('Justificativa obrigatória');
    try {
      await axios.post(`/api/assets/${selectedAsset.id}/return`, {
        justification: returnData.justification
      });
      setIsReturnModalOpen(false);
      handleAssetClick(selectedAsset);
      fetchAssets(); fetchStats();
    } catch (e) { alert('Erro ao devolver'); }
  };

  const handleResolveMaintenance = async () => {
    if (!resolveData.notes.trim()) return alert('Notas de resolução obrigatórias');
    try {
      await axios.put(`/api/maintenance/${resolveData.logId}/resolve`, {
        resolution_notes: resolveData.notes,
        new_asset_status: resolveData.newStatus,
        new_user_id: resolveData.newUserId
      });
      setIsResolveModalOpen(false);
      handleAssetClick(selectedAsset);
      fetchAssets(); fetchStats();
    } catch (e) { alert('Erro ao resolver chamado'); }
  };

  const translatedStatus = (s) => {
    switch (s) {
      case 'In_Stock': return 'Guardado: Almoxarifado T.I';
      case 'Assigned': return 'Em Uso: Colaborador';
      case 'Maintenance': return 'Em Manutenção';
      case 'Lost': return 'Extraviado / Perdido';
      default: return s;
    }
  };

  const filteredAssets = assets.filter(a => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || (
      a.asset_tag?.toLowerCase().includes(search) ||
      a.model?.toLowerCase().includes(search) ||
      a.current_user?.toLowerCase().includes(search)
    );
    // Explicit string conversion to avoid 1 != "1" issues
    const matchesFilter = !currentTypeFilter || String(a.type_id) === String(currentTypeFilter);
    return matchesSearch && matchesFilter;
  });

  const sortedAssets = [...filteredAssets].sort((a, b) => {
    let aValue, bValue;

    if (sortConfig.key.includes('.')) {
      const parts = sortConfig.key.split('.');
      aValue = a[parts[0]]?.[parts[1]] || '';
      bValue = b[parts[0]]?.[parts[1]] || '';
    } else {
      aValue = a[sortConfig.key] || '';
      bValue = b[sortConfig.key] || '';
    }

    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const manufacturers = Array.from(new Set(standardModels.map(m => m.manufacturer))).sort();
  const isMonitorType = (typeId) => assetTypes.find(t => String(t.id) === String(typeId))?.name?.toLowerCase().includes('monitor');

  if (isLoading && assets.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <RefreshCw className="animate-spin" size={48} color="var(--primary)" />
        <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Carregando dados do inventário...</p>
      </div>
    );
  }

  return (
    <div className="view-section active">
      <div className="header">
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
            {currentTypeFilter ? assetTypes.find(t => String(t.id) === String(currentTypeFilter))?.name : 'Equipamentos e Ativos'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie notebooks, desktops e periféricos da empresa.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="search-bar">
            <input type="text" placeholder="Buscar Patrimônio, Usuário..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            {searchTerm && <button className="search-clear" onClick={() => setSearchTerm('')}><X size={14} /></button>}
          </div>
          <button className="btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Cadastrar Máquina
          </button>
        </div>
      </div>

      <div className="dash-cards">
        <StatCard title="Total de Equipamentos" value={stats.total} />
        <StatCard title="Em Estoque (Prontos)" value={stats.in_stock} color="#22c55e" />
        <StatCard title="Na Assistência" value={stats.maintenance} color="#f59e0b" />
        <StatCard title="Extraviados" value={stats.lost} color="#ef4444" />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => requestSort('asset_tag')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Patrimônio {sortConfig.key === 'asset_tag' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />}
                </div>
              </th>
              <th onClick={() => requestSort('model')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Modelo {sortConfig.key === 'model' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />}
                </div>
              </th>
              <th onClick={() => requestSort('current_user')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Usuário Atual {sortConfig.key === 'current_user' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />}
                </div>
              </th>
              {!currentTypeFilter || !isMonitorType(currentTypeFilter) ? (
                <>
                  <th onClick={() => requestSort('custom_attributes.cpu')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Processador {sortConfig.key === 'custom_attributes.cpu' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />}
                    </div>
                  </th>
                  <th onClick={() => requestSort('custom_attributes.ram')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Memória {sortConfig.key === 'custom_attributes.ram' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />}
                    </div>
                  </th>
                  <th onClick={() => requestSort('custom_attributes.storage')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Armazenamento {sortConfig.key === 'custom_attributes.storage' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />}
                    </div>
                  </th>
                </>
              ) : null}
              <th onClick={() => requestSort('status')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAssets.map(asset => (
              <tr key={asset.id} onClick={() => handleAssetClick(asset)}>
                <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{asset.asset_tag}</td>
                <td>{asset.model}</td>
                <td>{asset.current_user || <i>Estoque</i>}</td>
                {!isMonitorType(asset.type_id) ? (
                  <>
                    <td>{asset.custom_attributes?.cpu || '-'}</td>
                    <td>{asset.custom_attributes?.ram || '-'}</td>
                    <td>{asset.custom_attributes?.storage || '-'}</td>
                  </>
                ) : (
                  (!currentTypeFilter || !isMonitorType(currentTypeFilter)) && (
                    <><td></td><td></td><td></td></>
                  )
                )}
                <td><StatusTag status={asset.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SidePanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)}
        title={
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
              {selectedAsset?.type}
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
              {selectedAsset?.asset_tag}
            </div>
            <div>
              <span className="tag-status-legacy">
                {translatedStatus(selectedAsset?.status)}
              </span>
            </div>
          </div>
        }
      >
        <div style={{ margin: '0 -24px' }}>
          <div className="panel-tabs-legacy">
            <div className={`tab-legacy ${activeTab === 'specs' ? 'active' : ''}`} onClick={() => setActiveTab('specs')}>Detalhes Físicos</div>
            <div className={`tab-legacy ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              Histórico de Usuários ({history.length})
            </div>
            <div className={`tab-legacy ${activeTab === 'maint' ? 'active' : ''}`} onClick={() => setActiveTab('maint')}>
              Ocorrências de T.I ({maintenanceLogs.length})
            </div>
          </div>
        </div>

        {activeTab === 'specs' && selectedAsset && (
          <div style={{ padding: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 className="section-title-legacy">Especificações da Máquina</h3>
              <button className="btn-edit-specs-legacy" onClick={() => {
                setEditAsset({
                  manufacturer: selectedAsset.manufacturer || '',
                  model_id: selectedAsset.model_id || '',
                  custom_attributes: selectedAsset.custom_attributes || {}
                });
                setIsEditModalOpen(true);
              }}>
                <Edit2 size={16} /> <span>Editar</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '48px' }}>
              <DetailItemLegacy label="Modelo" value={selectedAsset.model} />
              {!isMonitorType(selectedAsset.type_id) ? (
                <>
                  <DetailItemLegacy label="Processador" value={selectedAsset.custom_attributes?.cpu} />
                  <DetailItemLegacy label="Memória" value={selectedAsset.custom_attributes?.ram} />
                  <DetailItemLegacy label="Armazenamento" value={selectedAsset.custom_attributes?.storage} />
                </>
              ) : (
                <DetailItemLegacy label="Tamanho (Polegadas)" value={selectedAsset.custom_attributes?.inches} />
              )}
            </div>

            <h3 className="section-title-legacy" style={{ marginBottom: '20px' }}>Ações Administrativas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button className="btn-action-big-legacy btn-blue" onClick={() => setIsTransferModalOpen(true)}>
                <RefreshCw size={20} /> Movimentação / Trocar Usuário
              </button>
              <button className="btn-action-big-legacy btn-orange" onClick={() => setIsMaintenanceModalOpen(true)}>
                <AlertTriangle size={20} /> Abrir Chamado de Manutenção
              </button>
              {selectedAsset.status === 'Assigned' && (
                <button className="btn-action-big-legacy btn-gray" onClick={() => setIsReturnModalOpen(true)}>
                  <Undo size={20} /> Devolver máquina para Estoque
                </button>
              )}
              <button className="btn-action-big-legacy btn-red" onClick={() => setIsDeleteModalOpen(true)}>
                <Trash2 size={20} /> Excluir Máquina do Inventário
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="timeline-legacy">
            {history.length === 0 ? <p className="empty-state">Nenhum histórico encontrado.</p> :
              history.map((h, i) => (
                <div key={i} className="timeline-item-legacy">
                  <div className="marker" />
                  <div className="content">
                    <div className="date">{new Date(h.assigned_at || h.change_date).toLocaleDateString('pt-BR')}</div>
                    <div className="desc">Posse de <strong>{h.user_name || 'Estoque'}</strong> - {h.department || 'TI/Estoque'}</div>
                    <div className="sub-details" style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                      Setor: {h.department || 'Geral'} | Resp.: {h.assigned_by || 'Admin TI / Sistema'}
                      {h.returned_at && (
                        <div style={{ marginTop: '2px' }}>
                          Devolvido em: {new Date(h.returned_at).toLocaleDateString('pt-BR')}
                          {h.notes && ` - Vistoria: ${h.notes}`}
                        </div>
                      )}
                    </div>
                    {h.justification && (
                      <div className="justification-box-legacy">
                        <div className="label">MOTIVO / JUSTIFICATIVA:</div>
                        <div className="text">{h.justification}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {activeTab === 'maint' && (
          <div className="maint-list-legacy">
            {maintenanceLogs.length === 0 ? <p className="empty-state">Nenhum chamado registrado.</p> :
              maintenanceLogs.map((m, i) => (
                <div key={i} className={`maint-card-legacy ${!m.resolved_date ? 'pending' : ''}`}>
                  <div className="header">
                    <div className="info">
                      <div className="date">{new Date(m.reported_date || m.created_at).toLocaleDateString('pt-BR')}</div>
                      <div className="type">{m.issue_type}</div>
                    </div>
                    {!m.resolved_date && (
                      <button className="btn-resolve-legacy" onClick={() => {
                        // Find the most recent user from history (who isn't "Estoque")
                        const lastUserInHistory = history.find(h => h.user_id !== null);
                        setResolveData({
                          logId: m.id,
                          notes: '',
                          newStatus: lastUserInHistory ? 'Assigned' : 'In_Stock',
                          newUserId: lastUserInHistory ? lastUserInHistory.user_id : null,
                          lastUserName: lastUserInHistory ? lastUserInHistory.user_name : null
                        });
                        setIsResolveModalOpen(true);
                      }}>
                        <i style={{ display: 'flex' }}><CheckSquare size={14} /></i> &nbsp;Resolver
                      </button>
                    )}
                  </div>
                  <p className="description">{m.description}</p>
                  <div className="status-indicator">
                    Status Ticket: <span className={!m.resolved_date ? 'pending' : 'resolved'}>
                      {!m.resolved_date ? 'Aguardando Solução' : 'Resolvido'}
                    </span>
                  </div>
                  {m.resolved_date && (
                    <div className="resolution-notes">
                      <strong>Resolução:</strong> {m.resolution_notes}
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}
      </SidePanel>

      {/* RENDER MODALS... (no changes needed to the logic of modals) */}
      <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Movimentação / Troca">
        <div className="form-group"><label className="form-label">Novo Status</label><select className="form-input" value={transferData.status} onChange={e => setTransferData({ ...transferData, status: e.target.value })}><option value="In_Stock">No Estoque</option><option value="Assigned">Entregue a Usuário</option><option value="Lost">Extraviado</option></select></div>
        <div className="form-group"><label className="form-label">Novo Proprietário</label><select className="form-input" disabled={transferData.status !== 'Assigned'} value={transferData.user_id} onChange={e => setTransferData({ ...transferData, user_id: e.target.value })}><option value="">-- Estoque --</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Justificativa</label><textarea className="form-input" rows="3" value={transferData.justification} onChange={e => setTransferData({ ...transferData, justification: e.target.value })} /></div>
        <button className="btn-primary" style={{ width: '100%', marginTop: '16px' }} onClick={handleTransfer}>Confirmar Transferência</button>
      </Modal>

      <Modal isOpen={isMaintenanceModalOpen} onClose={() => setIsMaintenanceModalOpen(false)} title="Abrir Chamado">
        <div className="form-group"><label className="form-label">Descrição do Problema</label><textarea className="form-input" rows="4" value={maintData.description} onChange={e => setMaintData({ ...maintData, description: e.target.value })} /></div>
        <button className="btn-primary" style={{ width: '100%', marginTop: '16px', background: '#f59e0b' }} onClick={handleMaintenance}>Enviar p/ Assistência</button>
      </Modal>

      <Modal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} title="Devolver ao Estoque">
        <div className="form-group"><label className="form-label">Justificativa da Devolução</label><textarea className="form-input" rows="4" value={returnData.justification} onChange={e => setReturnData({ ...returnData, justification: e.target.value })} /></div>
        <button className="btn-primary" style={{ width: '100%', marginTop: '16px', background: '#64748b' }} onClick={handleReturn}>Confirmar Devolução</button>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Especificações" footer={<><button className="btn-primary" style={{ background: 'transparent', color: '#64748b', boxShadow: 'none' }} onClick={() => setIsEditModalOpen(false)}>Cancelar</button><button className="btn-primary" onClick={handleSaveEdit}>Salvar</button></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group"><label className="form-label">Fabricante</label><select className="form-input" value={editAsset.manufacturer} onChange={e => setEditAsset({ ...editAsset, manufacturer: e.target.value, model_id: '' })}><option value="">Selecione...</option>{manufacturers.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Modelo</label><select className="form-input" value={editAsset.model_id} onChange={e => {
            const model = standardModels.find(m => m.id == e.target.value);
            setEditAsset({ ...editAsset, model_id: e.target.value, custom_attributes: model ? { cpu: model.cpu, ram: model.ram, storage: model.storage, inches: model.inches } : {} });
          }}><option value="">Selecione...</option>{standardModels.filter(m => m.type_id == selectedAsset?.type_id && (!editAsset.manufacturer || m.manufacturer === editAsset.manufacturer)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
        </div>
        {!isMonitorType(selectedAsset?.type_id) ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label className="form-label">CPU</label><input type="text" className="form-input" value={editAsset.custom_attributes?.cpu || ''} onChange={e => setEditAsset({ ...editAsset, custom_attributes: { ...editAsset.custom_attributes, cpu: e.target.value } })} /></div>
            <div className="form-group"><label className="form-label">RAM</label><input type="text" className="form-input" value={editAsset.custom_attributes?.ram || ''} onChange={e => setEditAsset({ ...editAsset, custom_attributes: { ...editAsset.custom_attributes, ram: e.target.value } })} /></div>
          </div>
        ) : (<div className="form-group"><label className="form-label">Polegadas</label><input type="text" className="form-input" value={editAsset.custom_attributes?.inches || ''} onChange={e => setEditAsset({ ...editAsset, custom_attributes: { ...editAsset.custom_attributes, inches: e.target.value } })} /></div>)}
      </Modal>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Novo Equipamento" footer={<><button className="btn-primary" style={{ background: 'transparent', color: '#64748b', boxShadow: 'none' }} onClick={() => setIsAddModalOpen(false)}>Cancelar</button><button className="btn-primary" onClick={handleSaveNewAsset}>Salvar</button></>}>
        <div className="form-group"><label className="form-label">Categoria</label><select className="form-input" value={newAsset.type_id} onChange={e => setNewAsset({ ...newAsset, type_id: e.target.value, manufacturer: '', model_id: '' })}><option value="">Selecione...</option>{assetTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Patrimônio</label><input type="text" className="form-input" value={newAsset.asset_tag} onChange={e => setNewAsset({ ...newAsset, asset_tag: e.target.value })} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group"><label className="form-label">Fabricante</label><select className="form-input" value={newAsset.manufacturer} disabled={!newAsset.type_id} onChange={e => setNewAsset({ ...newAsset, manufacturer: e.target.value, model_id: '' })}><option value="">Selecione...</option>{manufacturers.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Modelo</label><select className="form-input" value={newAsset.model_id} disabled={!newAsset.manufacturer} onChange={e => setNewAsset({ ...newAsset, model_id: e.target.value })}><option value="">Selecione...</option>{standardModels.filter(m => m.type_id == newAsset.type_id && (!newAsset.manufacturer || m.manufacturer === newAsset.manufacturer)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
        </div>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Excluir Ativo" footer={<><button className="btn-primary" style={{ background: 'transparent', color: '#64748b', boxShadow: 'none' }} onClick={() => setIsDeleteModalOpen(false)}>Cancelar</button><button className="btn-primary" style={{ background: '#ef4444' }} onClick={handleDeleteAsset}>Confirmar</button></>}>
        <p style={{ marginBottom: '20px' }}>Excluir <strong>{selectedAsset?.asset_tag}</strong>?</p>
        <div className="form-group"><label className="form-label">Motivo</label><textarea className="form-input" value={deleteJustification} onChange={e => setDeleteJustification(e.target.value)} /></div>
      </Modal>

      <Modal isOpen={isResolveModalOpen} onClose={() => setIsResolveModalOpen(false)} title="Resolver Ocorrência" footer={<><button className="btn-primary" style={{ background: 'transparent', color: '#64748b', boxShadow: 'none' }} onClick={() => setIsResolveModalOpen(false)}>Cancelar</button><button className="btn-primary" onClick={handleResolveMaintenance}>Salvar Resolução</button></>}>
        <div className="form-group"><label className="form-label">Notas de Resolução / O que foi feito?</label><textarea className="form-input" rows="4" value={resolveData.notes} onChange={e => setResolveData({ ...resolveData, notes: e.target.value })} /></div>
        <div className="form-group">
          <label className="form-label">Status Final / Destino da Máquina</label>
          <select className="form-input" value={resolveData.newStatus} onChange={e => {
            const val = e.target.value;
            setResolveData({
              ...resolveData,
              newStatus: val,
              newUserId: val === 'Assigned' ? resolveData.newUserId : null
            });
          }}>
            <option value="In_Stock">Pronta (Voltar para o Estoque)</option>
            {resolveData.lastUserName && (
              <option value="Assigned">Pronta (Devolver ao Usuário: {resolveData.lastUserName})</option>
            )}
            <option value="Lost">Sucateada / Perda Total</option>
          </select>
        </div>
      </Modal>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-value" style={{ color: color }}>{value}</div>
    </div>
  );
}

function StatusTag({ status }) {
  const t = (s) => {
    if (s === 'In_Stock' || s === 'Em estoque' || s === 'Em Estoque') return 'Em Estoque';
    if (s === 'Assigned' || s === 'Em Uso') return 'Em Uso';
    if (s === 'Maintenance' || s === 'Manutenção' || s === 'Em Manutencao') return 'Manutenção';
    if (s === 'Lost' || s === 'Perdido' || s === 'Furtado' || s === 'Extraviado') return 'Extraviado';
    return s;
  };
  const c = (s) => {
    if (s === 'In_Stock' || s === 'Em estoque' || s === 'Em Estoque') return 'tag stock';
    if (s === 'Assigned' || s === 'Em Uso') return 'tag assigned';
    if (s === 'Maintenance' || s === 'Manutenção' || s === 'Em Manutencao') return 'tag maint';
    if (s === 'Lost' || s === 'Perdido' || s === 'Furtado' || s === 'Extraviado') return 'tag broken';
    return 'tag default';
  };
  return <span className={c(status)}>{t(status)}</span>;
}

function DetailItemLegacy({ label, value }) {
  return (
    <div>
      <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>{label}</div>
      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.2rem' }}>{value || 'N/A'}</div>
    </div>
  );
}
