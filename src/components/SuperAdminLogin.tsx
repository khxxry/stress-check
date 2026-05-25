import React, { useState } from 'react';
import { ShieldAlert, Lock, User, AlertCircle, ArrowLeft } from 'lucide-react';

interface SuperAdminLoginProps {
  onNotify: (message: string, type: 'success' | 'error') => void;
  onSuccess: () => void;
  onCancel: () => void;
}

export const SuperAdminLogin: React.FC<SuperAdminLoginProps> = ({ onNotify, onSuccess, onCancel }) => {
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!adminId.trim()) {
      setError('システム管理者IDを入力してください。');
      return;
    }
    if (!adminPassword) {
      setError('パスワードを入力してください。');
      return;
    }

    // セキュリティ認証チェック（デモ用認証情報）
    if (adminId.trim() === 'admin' && adminPassword === 'adminpassword') {
      onSuccess();
    } else {
      setError('管理者IDまたはパスワードが正しくありません。');
      onNotify('ログインに失敗しました。', 'error');
    }
  };

  return (
    <div className="super-admin-login-wrapper fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: '60vh', padding: '1rem' }}>
      <div className="card super-admin-login-card" style={{ maxWidth: '440px', padding: '2.5rem', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' }}>
        
        <div className="text-center mb-6">
          <div className="logo-badge mb-3" style={{ background: 'rgba(99, 102, 241, 0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <ShieldAlert size={32} style={{ color: '#818cf8' }} />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.05em' }}>システム管理者 認証</h2>
          <p style={{ fontSize: '0.82rem', marginTop: '4px', color: '#94a3b8' }}>SaaSプラットフォーム 統括管理ポータル</p>
        </div>

        {error && (
          <div className="alert-badge error mb-4" style={{ borderRadius: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '0.85rem' }}>
              <User size={14} style={{ color: '#94a3b8' }} />
              管理者ID
            </label>
            <input 
              type="text" 
              className="form-control admin-input" 
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              placeholder="admin"
              style={{ background: '#1e293b', border: '1.5px solid #475569', color: '#f8fafc' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '0.85rem' }}>
              <Lock size={14} style={{ color: '#94a3b8' }} />
              パスワード
            </label>
            <input 
              type="password" 
              className="form-control admin-input" 
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="••••••••"
              style={{ background: '#1e293b', border: '1.5px solid #475569', color: '#f8fafc' }}
            />
          </div>

          <button type="submit" className="btn btn-primary w-full mt-2" style={{ padding: '0.85rem', borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', boxShadow: '0 4px 6px rgba(99, 102, 241, 0.25)' }}>
            安全な管理者ログイン
          </button>
        </form>

        <div className="demo-guide-box mt-4 p-3" style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155', borderRadius: '6px', fontSize: '0.78rem', color: '#94a3b8' }}>
          <div style={{ fontWeight: 700, color: '#818cf8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🔒 デモ検証用サインイン情報:</span>
          </div>
          <div>ID: <strong style={{ color: '#f1f5f9', fontFamily: 'monospace' }}>admin</strong></div>
          <div>パスワード: <strong style={{ color: '#f1f5f9', fontFamily: 'monospace' }}>adminpassword</strong></div>
        </div>

        <button 
          onClick={onCancel}
          className="btn btn-outline w-full mt-4"
          style={{ padding: '0.7rem', fontSize: '0.82rem', borderRadius: '8px', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} />
          受検者ポータルに戻る
        </button>

      </div>

      <style>{`
        .admin-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25) !important;
        }
        .super-admin-login-card {
          animation: adminCardGlow 4s infinite alternate;
        }
        @keyframes adminCardGlow {
          from { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 0 2px rgba(99, 102, 241, 0.1); }
          to { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 0 15px rgba(99, 102, 241, 0.25); }
        }
      `}</style>
    </div>
  );
};
