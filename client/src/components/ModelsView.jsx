import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Plus, X, Search, Edit2, Trash2, Cpu, MemoryStick, HardDrive, Monitor, Database } from 'lucide-react';
import Modal from './Modal';

export default function ModelsView() {
  const [models, setModels] = useState([]);
  const [types, setTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [modelForm, setModelForm] = useState({
    type_id: '',
    manufacturer: '',
    name: '',
    cpu: '',
    ram: '',
    storage: '',
    inches: ''
  });

  useEffect(() => {
    fetchModels();
    fetchTypes();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await axios.get('/api/models');
      setModels(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTypes = async () => {
    try {
      const res = await axios.get('/api/asset-types');
      setTypes(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setModelForm({ type_id: '', manufacturer: '', name: '', cpu: '', ram: '', storage: '', inches: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (model) => {
    setEditingId(model.id);
    setModelForm({
      type_id: model.type_id || '',
      manufacturer: model.manufacturer || '',
      name: model.name || '',
      cpu: model.cpu || '',
      ram: model.ram || '',
      storage: model.storage || '',
      inches: model.inches || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveModel = async () => {
    try {
      if (!modelForm.type_id || !modelForm.manufacturer || !modelForm.name) {
        alert('Preencha os campos obrigatórios (Categoria, Fabricante e Nome).');
        return;
      }

      if (editingId) {
        await axios.put(`/api/models/${editingId}`, modelForm);
      } else {
        await axios.post('/api/models', modelForm);
      }
      
      setIsModalOpen(false);
      fetchModels();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao salvar modelo padrão');
    }
  };

  const handleDeleteModel = async (id, name) => {
    if (!window.confirm(`Tem certeza que deseja excluir o modelo "${name}" do catálogo?`)) return;
    try {
      await axios.delete(`/api/models/${id}`);
      fetchModels();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao excluir modelo');
    }
  };

  const filteredModels = models.filter(m => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.type_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedType = types.find(t => t.id == modelForm.type_id)?.name?.toLowerCase() || '';

  return (
    <div className="view-section active">
      <div className="header">
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Modelos Padrões (Catálogo)</h1>
          <p style={{ color: 'var(--text-muted)' }}>Padronize fabricantes, processadores, e dados técnicos de hardware.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Buscar Fabricante ou Modelo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="search-clear" 
                style={{ display: 'flex' }}
                onClick={() => setSearchTerm('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={handleOpenAdd}
          >
            <Plus size={18} />
            Novo Modelo
          </button>
        </div>
      </div>

      <div className="dash-cards">
        <div className="card">
          <div className="card-header">
            <Settings size={20} color="var(--primary)" />
            <span>MODELOS CADASTRADOS</span>
          </div>
          <div className="card-value">{models.length}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <Database size={20} color="var(--success)" />
            <span>FABRICANTES</span>
          </div>
          <div className="card-value" style={{ color: 'var(--success)' }}>{new Set(models.map(m => m.manufacturer)).size}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <Cpu size={20} color="var(--warning)" />
            <span>CATEGORIAS ATIVAS</span>
          </div>
          <div className="card-value" style={{ color: 'var(--warning)' }}>{new Set(models.map(m => m.type_name)).size}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <HardDrive size={20} color="var(--danger)" />
            <span>SPECS DEFINIDAS</span>
          </div>
          <div className="card-value" style={{ color: 'var(--danger)' }}>{models.filter(m => m.cpu || m.ram || m.storage).length}</div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="sortable">Categoria</th>
              <th className="sortable">Fabricante</th>
              <th className="sortable">Nome do Modelo</th>
              <th>Especificações Técnicas</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredModels.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
                  Nenhum modelo cadastrado.
                </td>
              </tr>
            ) : (
              filteredModels.map(m => (
                <tr key={m.id}>
                  <td>
                    <span className="tag stock" style={{ textTransform: 'uppercase' }}>{m.type_name}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{m.manufacturer}</td>
                  <td>{m.name}</td>
                  <td>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {m.type_name?.toLowerCase().includes('monitor') ? (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Monitor size={14} /> {m.inches || '-'}"
                         </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="CPU"><Cpu size={14} /> {m.cpu || '-'}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="RAM"><MemoryStick size={14} /> {m.ram || '-'}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Storage"><HardDrive size={14} /> {m.storage || '-'}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                       <button 
                          className="btn-primary" 
                          style={{ padding: '6px', background: 'white', color: 'var(--text-muted)', border: '1px solid var(--border)', boxShadow: 'none' }}
                          onClick={() => handleOpenEdit(m)}
                       >
                         <Edit2 size={14} />
                       </button>
                       <button 
                          className="btn-primary" 
                          style={{ padding: '6px', background: 'white', color: 'var(--danger)', border: '1px solid var(--border)', boxShadow: 'none' }}
                          onClick={() => handleDeleteModel(m.id, m.name)}
                       >
                         <Trash2 size={14} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Modelo Padrão" : "Cadastrar Modelo Padrão"}
        footer={
          <>
            <button className="btn-primary" style={{ background: 'transparent', color: 'var(--text-muted)', boxShadow: 'none' }} onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSaveModel}>{editingId ? "Salvar Alterações" : "Criar Modelo"}</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
           <div className="form-group">
                <label className="form-label">Categoria do Modelo</label>
                <select 
                  className="form-input" 
                  value={modelForm.type_id}
                  onChange={e => setModelForm({...modelForm, type_id: e.target.value})}
                >
                    <option value="">Selecione...</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                    <label className="form-label">Fabricante</label>
                    <input type="text" className="form-input" placeholder="Ex: Dell, Apple" value={modelForm.manufacturer} onChange={e => setModelForm({...modelForm, manufacturer: e.target.value})} />
                </div>
                <div className="form-group">
                    <label className="form-label">Nome do Modelo</label>
                    <input type="text" className="form-input" placeholder="Ex: Latitude 5430" value={modelForm.name} onChange={e => setModelForm({...modelForm, name: e.target.value})} />
                </div>
            </div>

            {selectedType.includes('monitor') ? (
              <div className="form-group">
                  <label className="form-label">Tamanho (Polegadas)</label>
                  <input type="text" className="form-input" placeholder="Ex: 24" value={modelForm.inches} onChange={e => setModelForm({...modelForm, inches: e.target.value})} />
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                        <label className="form-label">Processador (CPU)</label>
                        <input type="text" className="form-input" placeholder="Ex: Core i5" value={modelForm.cpu} onChange={e => setModelForm({...modelForm, cpu: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Memória RAM</label>
                        <input type="text" className="form-input" placeholder="Ex: 16GB" value={modelForm.ram} onChange={e => setModelForm({...modelForm, ram: e.target.value})} />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Armazenamento</label>
                    <input type="text" className="form-input" placeholder="Ex: 512GB SSD" value={modelForm.storage} onChange={e => setModelForm({...modelForm, storage: e.target.value})} />
                </div>
              </>
            )}
        </div>
      </Modal>
    </div>
  );
}
