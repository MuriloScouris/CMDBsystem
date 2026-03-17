import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, X, Search, Calendar, DollarSign, Key, ShieldCheck } from 'lucide-react';
import Modal from './Modal';

export default function SoftwareView() {
  const [licenses, setLicenses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLicense, setNewLicense] = useState({
    name: '',
    license_key: '',
    monthly_cost: '',
    expiry_date: ''
  });

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    try {
      const res = await axios.get('/api/licenses');
      setLicenses(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveLicense = async () => {
    try {
      if (!newLicense.name) {
        alert('O nome do software é obrigatório.');
        return;
      }
      await axios.post('/api/licenses', newLicense);
      setIsModalOpen(false);
      setNewLicense({ name: '', license_key: '', monthly_cost: '', expiry_date: '' });
      fetchLicenses();
    } catch (e) {
      alert('Erro ao salvar licença');
    }
  };

  const filteredLicenses = licenses.filter(l => 
    l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.license_key?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="view-section active">
      <div className="header">
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Licenças de Software</h1>
          <p style={{ color: 'var(--text-muted)' }}>Controle de softwares corporativos e assinaturas Cloud.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Buscar Software ou Chave..." 
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
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} />
            Cadastrar Licença
          </button>
        </div>
      </div>

      <div className="dash-cards">
        <div className="card">
          <div className="card-header">
            <ShieldCheck size={20} color="var(--primary)" />
            <span>TOTAL DE LICENÇAS</span>
          </div>
          <div className="card-value">{licenses.length}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <Plus size={20} color="var(--success)" />
            <span>SOFTWARES ÚNICOS</span>
          </div>
          <div className="card-value" style={{ color: 'var(--success)' }}>{new Set(licenses.map(l => l.name)).size}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <DollarSign size={20} color="var(--warning)" />
            <span>CUSTO MENSAL ESTIMADO</span>
          </div>
          <div className="card-value" style={{ color: 'var(--warning)', fontSize: '1.2rem' }}>
            R$ {licenses.reduce((acc, l) => acc + (parseFloat(l.monthly_cost) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <Calendar size={20} color="var(--danger)" />
            <span>EXPIRANDO EM BREVE</span>
          </div>
          <div className="card-value" style={{ color: 'var(--danger)' }}>
            {licenses.filter(l => l.expiry_date && (new Date(l.expiry_date) - new Date()) / (1000 * 60 * 60 * 24) < 30).length}
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="sortable">Nome do Software</th>
              <th className="sortable">Chave da Licença</th>
              <th className="sortable">Custo Mensal</th>
              <th className="sortable">Vencimento</th>
            </tr>
          </thead>
          <tbody>
            {filteredLicenses.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
                  Nenhuma licença cadastrada.
                </td>
              </tr>
            ) : (
              filteredLicenses.map(license => (
                <tr key={license.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} color="var(--primary)" />
                    {license.name}
                  </td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {license.license_key || 'N/A'}
                  </td>
                  <td>
                    {license.monthly_cost ? `R$ ${parseFloat(license.monthly_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td>
                    {license.expiry_date ? new Date(license.expiry_date).toLocaleDateString('pt-BR') : '-'}
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
        title="Cadastrar Licença"
        footer={
          <>
            <button className="btn-primary" style={{ background: 'transparent', color: 'var(--text-muted)', boxShadow: 'none' }} onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSaveLicense}>Salvar Licença</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Nome do Software / Serviço</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Adobe, Office 365..." 
                value={newLicense.name}
                onChange={e => setNewLicense({...newLicense, name: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Chave de Ativação / Serial</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ex: XXXX-XXXX-XXXX" 
              value={newLicense.license_key}
              onChange={e => setNewLicense({...newLicense, license_key: e.target.value})}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Custo Mensal (R$)</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="0.00" 
                value={newLicense.monthly_cost}
                onChange={e => setNewLicense({...newLicense, monthly_cost: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Data de Expiração</label>
              <input 
                type="date" 
                className="form-input" 
                value={newLicense.expiry_date}
                onChange={e => setNewLicense({...newLicense, expiry_date: e.target.value})}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
