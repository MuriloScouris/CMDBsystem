import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Laptop,
  Settings,
  Users,
  FileText,
  Trash2,
  LayoutGrid,
  RefreshCw,
  Loader2,
  Plus,
  ChevronRight,
  Eye
} from 'lucide-react';

import HardwareView from './components/HardwareView';
import UsersView from './components/UsersView';
import ModelsView from './components/ModelsView';
import SoftwareView from './components/SoftwareView';
import DeletedAssetsView from './components/DeletedAssetsView';
import ReportsView from './components/ReportsView';
import Modal from './components/Modal';

function App() {
  const [activeView, setActiveView] = useState('hardware');
  const [currentTypeFilter, setCurrentTypeFilter] = useState(null);
  const [jiraQueueCount, setJiraQueueCount] = useState(0);
  const [queueItems, setQueueItems] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [assetTypes, setAssetTypes] = useState([]);
  const [isNewTypeModalOpen, setIsNewTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  useEffect(() => {
    fetchQueue();
    fetchAssetTypes();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await axios.get('/api/jira/queue');
      setJiraQueueCount(res.data.pendingCount || 0);
      setQueueItems(res.data.items || []);
    } catch (e) { /* silent */ }
  };

  const fetchAssetTypes = async () => {
    try {
      const res = await axios.get('/api/asset-types');
      setAssetTypes(res.data);
    } catch (e) { /* silent */ }
  };

  const handleJiraSync = async () => {
    if (isSyncing || jiraQueueCount === 0) return;
    setIsSyncing(true);
    try {
      await axios.post('/api/jira/sync');
      await fetchQueue();
      setIsQueueModalOpen(false);
      alert('Sincronização com Jira Assets concluída!');
    } catch (e) {
      alert('Erro ao sincronizar com Jira');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteFromQueue = async (id) => {
    if (!window.confirm('Deseja realmente remover este item da fila? Ele não será sincronizado com o Jira.')) return;
    try {
      await axios.delete(`/api/jira/queue/${id}`);
      fetchQueue();
    } catch (e) {
      alert('Erro ao remover item da fila');
    }
  };

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;
    try {
      await axios.post('/api/asset-types', { name: newTypeName });
      setNewTypeName('');
      setIsNewTypeModalOpen(false);
      fetchAssetTypes();
    } catch (e) {
      alert('Erro ao criar categoria');
    }
  };

  const handleDeleteType = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja excluir a categoria "${name}"?`)) return;
    try {
      await axios.delete(`/api/asset-types/${id}`);
      if (currentTypeFilter === id) setCurrentTypeFilter(null);
      fetchAssetTypes();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao excluir categoria');
    }
  };

  const navItems = [
    { id: 'hardware', label: 'Inventário Físico', icon: Laptop },
    { id: 'software', label: 'Licenças de Software', icon: LayoutGrid },
    { id: 'users', label: 'Funcionários', icon: Users },
    { id: 'reports', label: 'Relatórios Gerenciais', icon: FileText },
    { id: 'deleted', label: 'Máquinas Excluídas', icon: Trash2 },
    { id: 'models', label: 'Modelos e Padrões', icon: Settings },
  ];

  return (
    <div className="flex w-full h-screen overflow-hidden" style={{ display: 'flex', width: '100%', height: '100vh', background: 'var(--bg-page)' }}>
      {/* Sidebar */}
      <div className="sidebar" style={{ flexShrink: 0, height: '100vh', width: '280px', overflowY: 'auto' }}>
        <div className="logo">
          <span style={{ fontSize: '1.8rem', marginRight: '8px' }}>🚀</span> ITAM CMDB
        </div>
        <div style={{ flexDirection: 'column', display: 'flex', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <React.Fragment key={item.id}>
                <div
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveView(item.id);
                    if (item.id !== 'hardware') setCurrentTypeFilter(null);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </div>

                {/* Submenu for Hardware */}
                {item.id === 'hardware' && (
                  <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '32px', marginBottom: '8px', gap: '2px' }}>
                    <div
                      className={`nav-link-sub ${currentTypeFilter === null && isActive ? 'active' : ''}`}
                      onClick={() => {
                        setActiveView('hardware');
                        setCurrentTypeFilter(null);
                      }}
                    >
                      Ver Todos
                    </div>
                    {assetTypes.map(type => (
                      <div
                        key={type.id}
                        className={`nav-link-sub ${currentTypeFilter === type.id && isActive ? 'active' : ''}`}
                        onClick={() => {
                          setActiveView('hardware');
                          setCurrentTypeFilter(type.id);
                        }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <span>{type.name}</span>
                        <button
                          className="btn-delete-type"
                          onClick={(e) => handleDeleteType(e, type.id, type.name)}
                          style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '0 4px', fontSize: '1.1rem', fontWeight: 'bold' }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      className="nav-link-sub-btn"
                      onClick={() => setIsNewTypeModalOpen(true)}
                      style={{
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                        background: 'transparent',
                        border: '1px dashed rgba(255,255,255,0.3)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={14} />
                      Nova Categoria
                    </button>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.2)', margin: '12px 0' }} />

          <div
            className="nav-link"
            onClick={() => setIsQueueModalOpen(true)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              color: 'white',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0, 159, 223, 0.3)',
              marginTop: '8px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
              <span>Sincronizar Jira</span>
            </div>
            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
              {jiraQueueCount > 0 ? `(${jiraQueueCount})` : '(OK)'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
        {activeView === 'hardware' && <HardwareView key={currentTypeFilter || 'all'} currentTypeFilter={currentTypeFilter} />}
        {activeView === 'users' && <UsersView />}
        {activeView === 'models' && <ModelsView />}
        {activeView === 'software' && <SoftwareView />}
        {activeView === 'deleted' && <DeletedAssetsView />}
        {activeView === 'reports' && <ReportsView />}
      </div>

      {/* New Category Modal */}
      <Modal
        isOpen={isNewTypeModalOpen}
        onClose={() => setIsNewTypeModalOpen(false)}
        title="Nova Categoria"
        footer={
          <>
            <button className="btn-primary" style={{ background: 'transparent', color: 'var(--text-muted)', boxShadow: 'none' }} onClick={() => setIsNewTypeModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleCreateType}>Criar Categoria</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nome da Categoria</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: Smartphone"
            value={newTypeName}
            onChange={e => setNewTypeName(e.target.value)}
          />
        </div>
      </Modal>

      {/* Jira Queue Preview Modal */}
      <Modal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        title="Fila de Sincronização Jira"
        footer={
          <>
            <button className="btn-primary" style={{ background: 'transparent', color: 'var(--text-muted)', boxShadow: 'none' }} onClick={() => setIsQueueModalOpen(false)}>Fechar</button>
            <button className="btn-primary" disabled={isSyncing || queueItems.length === 0} onClick={handleJiraSync}>
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Todos Agora'}
            </button>
          </>
        }
      >
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {queueItems.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Nenhuma atualização pendente.</p>
          ) : (
            <table style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '8px' }}>Equipamento / Movimentação</th>
                  <th style={{ padding: '8px', width: '50px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {queueItems.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: 700, marginBottom: '2px' }}>{item.summary}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                        {item.description.length > 100 ? item.description.substring(0, 100) + '...' : item.description}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteFromQueue(item.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        title="Descartar da fila"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          * Itens nesta lista serão enviados como novos tickets no Jira Assets assim que você confirmar a sincronização.
        </p>
      </Modal>
    </div>
  );
}

export default App;
