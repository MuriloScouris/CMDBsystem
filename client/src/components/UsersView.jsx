import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Plus, X, Mail, Briefcase, Hash, UserPlus, UserCheck, Trash2 } from 'lucide-react';
import SidePanel from './SidePanel';
import Modal from './Modal';

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [userAssets, setUserAssets] = useState([]);

  // Form state
  const [newUser, setNewUser] = useState({
    name: '',
    registration_number: '',
    email: '',
    department: '',
    status: 'Active'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUserClick = async (user) => {
    try {
      const res = await axios.get(`/api/users/${user.id}`);
      setSelectedUser(res.data.user);
      setUserAssets(res.data.assets);
      setIsPanelOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveUser = async () => {
    try {
      if (!newUser.name || !newUser.registration_number) {
        alert('Nome e Matrícula são obrigatórios.');
        return;
      }
      await axios.post('/api/users', newUser);
      setIsAddModalOpen(false);
      setNewUser({ name: '', registration_number: '', email: '', department: '', status: 'Active' });
      fetchUsers();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao salvar usuário');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (!confirm(`Tem certeza que deseja excluir "${selectedUser.name}"?`)) return;
    
    try {
      await axios.delete(`/api/users/${selectedUser.id}`);
      setIsPanelOpen(false);
      fetchUsers();
      alert('Colaborador excluído com sucesso.');
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao excluir colaborador.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.registration_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="view-section active">
      <div className="header">
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Diretório de Funcionários</h1>
          <p style={{ color: 'var(--text-muted)' }}>Consulte a base de Colaboradores e seus equipamentos.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Buscar por nome, email ou matrícula..." 
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
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={18} />
            Novo Funcionário
          </button>
        </div>
      </div>

      <div className="dash-cards">
        <div className="card">
          <div className="card-header">
            <Users size={20} color="var(--primary)" />
            <span>TOTAL DE COLABORADORES</span>
          </div>
          <div className="card-value">{users.length}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <UserCheck size={20} color="var(--success)" />
            <span>COLABORADORES ATIVOS</span>
          </div>
          <div className="card-value" style={{ color: 'var(--success)' }}>{users.filter(u => u.status === 'Active').length}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <Briefcase size={20} color="var(--warning)" />
            <span>DEPARTAMENTOS</span>
          </div>
          <div className="card-value" style={{ color: 'var(--warning)' }}>{new Set(users.map(u => u.department)).size}</div>
        </div>
        <div className="card">
          <div className="card-header">
            <Mail size={20} color="var(--danger)" />
            <span>CONTATOS VÁLIDOS</span>
          </div>
          <div className="card-value" style={{ color: 'var(--danger)' }}>{users.filter(u => u.email).length}</div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="sortable">Matrícula</th>
              <th className="sortable">Nome do Funcionário</th>
              <th className="sortable">Departamento</th>
              <th className="sortable">Email Corporativo</th>
              <th className="sortable">Status RH</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
                  Nenhum funcionário encontrado.
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.id} onClick={() => handleUserClick(u)}>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{u.registration_number || '-'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.name}</td>
                  <td>{u.department || 'A Definir'}</td>
                  <td>{u.email || '-'}</td>
                  <td>
                    <span className={`tag ${u.status === 'Active' ? 'assigned' : 'terminated'}`}>
                      {u.status === 'Active' ? 'Ativo' : 'Desligado'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SidePanel 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)}
        title={selectedUser?.name || 'Detalhes do Colaborador'}
      >
        {selectedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`tag ${selectedUser.status === 'Active' ? 'assigned' : 'terminated'}`}>
                    {selectedUser.status === 'Active' ? 'Ativo' : 'Desligado'}
                </span>
                <button 
                    onClick={handleDeleteUser}
                    className="btn-primary" 
                    style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', boxShadow: 'none', padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Trash2 size={14} /> Excluir
                </button>
            </div>

            <section>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>Dados Cadastrais</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <DetailItem icon={<Briefcase size={16}/>} label="Departamento" value={selectedUser.department} />
                <DetailItem icon={<Mail size={16}/>} label="E-mail" value={selectedUser.email} />
                <DetailItem icon={<Hash size={16}/>} label="Matrícula" value={selectedUser.registration_number} />
              </div>
            </section>

            <section>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>Equipamentos em Posse</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {userAssets.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum equipamento vinculado.</p>
                ) : (
                  userAssets.map(a => (
                    <div key={a.id} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{a.type}</span><br />
                        <strong style={{ color: 'var(--text-main)' }}>{a.model}</strong>
                      </div>
                      <span className="tag stock">{a.asset_tag}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </SidePanel>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Cadastrar Funcionário"
        footer={
          <>
            <button className="btn-primary" style={{ background: 'transparent', color: 'var(--text-muted)', boxShadow: 'none' }} onClick={() => setIsAddModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSaveUser}>Salvar Cadastro</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                    <label className="form-label">Nome Completo</label>
                    <input type="text" className="form-input" placeholder="Ex: João Silva" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                </div>
                <div className="form-group">
                    <label className="form-label">Matrícula</label>
                    <input type="text" className="form-input" placeholder="Ex: 10293" value={newUser.registration_number} onChange={e => setNewUser({...newUser, registration_number: e.target.value})} />
                </div>
            </div>
            <div className="form-group">
                <label className="form-label">E-mail Corporativo</label>
                <input type="email" className="form-input" placeholder="joao.silva@empresa.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
            </div>
            <div className="form-group">
                <label className="form-label">Departamento</label>
                <input type="text" className="form-input" placeholder="Ex: TI, RH, Financeiro" value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})} />
            </div>
        </div>
      </Modal>
    </div>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px' }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{value || '-'}</div>
    </div>
  );
}
