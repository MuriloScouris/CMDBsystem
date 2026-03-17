import React from 'react';
import { X } from 'lucide-react';

export default function SidePanel({ isOpen, onClose, title, children }) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="modal-overlay open" 
          style={{ background: 'rgba(0,0,0,0.3)', zIndex: 100 }} 
          onClick={onClose} 
        />
      )}
      
      {/* Panel */}
      <div className={`detail-panel ${isOpen ? 'open' : ''}`} style={{ zIndex: 101 }}>
        <div className="panel-header" style={{ position: 'relative', display: 'block', padding: '32px 24px 24px' }}>
          <button 
            className="close-btn" 
            onClick={onClose} 
            style={{ position: 'absolute', top: '24px', right: '24px' }}
          >
            <X size={24} />
          </button>
          <div className="panel-header-content">
            {title}
          </div>
        </div>
        <div className="panel-body">
          {children}
        </div>
      </div>
    </>
  );
}
