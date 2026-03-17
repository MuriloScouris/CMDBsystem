import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, RotateCcw, X, Search, Calendar, FileWarning } from 'lucide-react';

export default function DeletedAssetsView() {
  const [deletedAssets, setDeletedAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDeletedAssets();
  }, []);

  const fetchDeletedAssets = async () => {
    try {
      const res = await axios.get('/api/assets/deleted');
      setDeletedAssets(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestore = async (id, tag) => {
    if (!confirm(`Deseja realmente restaurar o patrimônio ${tag} para o estoque?`)) return;
    try {
      await axios.post(`/api/assets/${id}/restore`);
      fetchDeletedAssets();
      alert('Equipamento restaurado com sucesso.');
    } catch (e) {
      alert('Erro ao restaurar equipamento');
    }
  };

  const filteredAssets = deletedAssets.filter(a => 
    a.asset_tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.justification?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="view-section active">
      <div className="header">
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Máquinas Excluídas</h1>
          <p style={{ color: 'var(--text-muted)' }}>Registro de equipamentos descartados, vendidos ou doados.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Buscar Patrimônio ou Motivo..." 
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
        </div>
      </div>

      <div className="dash-cards">
        <div className="card">
          <div className="card-header">
            <Trash2 size={20} color="var(--danger)" />
            <span>EQUIPAMENTOS EXCLUÍDOS</span>
          </div>
          <div className="card-value">{deletedAssets.length}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <FileWarning size={20} color="var(--warning)" />
            <span>AGUARDANDO DESCARTES</span>
          </div>
          <div className="card-value" style={{ color: 'var(--warning)' }}>0</div>
        </div>
        <div className="card">
          <div className="card-header">
            <RotateCcw size={20} color="var(--success)" />
            <span>RESTAURÁVEIS</span>
          </div>
          <div className="card-value" style={{ color: 'var(--success)' }}>{deletedAssets.length}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <Calendar size={20} color="var(--primary)" />
            <span>ÚLTIMA EXCLUSÃO</span>
          </div>
          <div className="card-value" style={{ color: 'var(--primary)', fontSize: '1rem' }}>
            {deletedAssets.length > 0 ? new Date(Math.max(...deletedAssets.map(a => new Date(a.deleted_at)))).toLocaleDateString('pt-BR') : '-'}
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="sortable">Patrimônio</th>
              <th className="sortable">Fabricante e Modelo</th>
              <th className="sortable">Data da Exclusão</th>
              <th>Motivo / Justificativa</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
                  Nenhuma máquina excluída encontrada no histórico.
                </td>
              </tr>
            ) : (
              filteredAssets.map(asset => (
                <tr key={asset.id}>
                  <td style={{ fontWeight: 600, color: 'var(--danger)' }}>{asset.asset_tag}</td>
                  <td>{asset.manufacturer} {asset.model}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                      <Calendar size={14} color="var(--text-muted)" />
                      {asset.deleted_at ? new Date(asset.deleted_at).toLocaleDateString('pt-BR') : '-'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem', maxWidth: '300px' }}>
                      <FileWarning size={14} style={{ marginTop: '2px', flexShrink: 0 }} color="var(--warning)" />
                      <span>{asset.justification || '-'}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn-primary" 
                      style={{ 
                        background: '#16a34a', 
                        color: 'white', 
                        padding: '6px 12px', 
                        fontSize: '0.75rem', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        boxShadow: '0 4px 6px rgba(22, 163, 74, 0.2)'
                      }}
                      onClick={() => handleRestore(asset.id, asset.asset_tag)}
                    >
                      <RotateCcw size={14} />
                      Restaurar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
