import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Download, User, Briefcase, ChevronRight, Map, Laptop, Users } from 'lucide-react';

export default function ReportsView() {
  const [reportsData, setReportsData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await axios.get('/api/reports/users-assets');
      setReportsData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredData = reportsData.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="view-section active">
      <div className="header">
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Relatórios Gerenciais e Auditoria</h1>
          <p style={{ color: 'var(--text-muted)' }}>Matriz relacional e visão consolidada de posses.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Buscar por Colaborador ou Setor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="dash-cards">
        <div className="card">
          <div className="card-header">
            <FileText size={20} color="var(--primary)" />
            <span>COLABORADORES NA MATRIZ</span>
          </div>
          <div className="card-value">{reportsData.length}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <Laptop size={20} color="var(--success)" />
            <span>ATIVOS ACAUTELADOS</span>
          </div>
          <div className="card-value" style={{ color: 'var(--success)' }}>
            {reportsData.reduce((acc, u) => acc + (u.assets?.length || 0), 0)}
          </div>
        </div>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/api/reports/inventory-export'}>
          <div className="card-header">
            <Download size={20} color="var(--warning)" />
            <span>EXPORTAR BASE (XLSX)</span>
          </div>
          <div className="card-value" style={{ color: 'var(--warning)', fontSize: '1rem' }}>Clique p/ download</div>
        </div>
        <div className="card">
          <div className="card-header">
            <User size={20} color="var(--danger)" />
            <span>TERMOS PENDENTES</span>
          </div>
          <div className="card-value" style={{ color: 'var(--danger)' }}>0</div>
        </div>
      </div>


      <h3 style={{ margin: '16px 0 16px', fontSize: '1.1rem', fontWeight: 600 }}>Matriz: Colaboradores vs. Equipamentos em Posse</h3>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="sortable">Colaborador</th>
              <th className="sortable">Departamento</th>
              <th>Equipamentos Acautelados</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
                  Carregando Matriz Relacional...
                </td>
              </tr>
            ) : (
              filteredData.map(user => (
                <tr key={user.id}>
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email || '-'}</div>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Briefcase size={14} color="var(--text-muted)" />
                      {user.department || 'A Definir'}
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {user.assets && user.assets.length > 0 ? (
                        user.assets.map(a => (
                          <div key={a.tag} style={{ fontSize: '0.85rem' }}>
                            <span className="tag stock" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{a.type}</span> 
                            <strong style={{ marginLeft: '8px' }}>{a.tag}</strong> - <span style={{ color: 'var(--text-muted)' }}>{a.model}</span>
                          </div>
                        ))
                      ) : (
                        <i style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum equipamento logado</i>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                       <button 
                        className="btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'white', color: 'var(--text-main)', border: '1px solid var(--border)', boxShadow: 'none' }}
                        onClick={() => window.location.href = `/api/reports/generate-term/${user.id}`}
                       >
                         📄 Termo
                       </button>
                    </div>
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
