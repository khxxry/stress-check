import React, { useState, useEffect } from 'react';
import { ExamineePortal } from './components/ExamineePortal';
import { AdminPortal } from './components/AdminPortal';
import { CampaignSettings, ConsentSettings, InterviewSettings, Employee } from './types';
import { Eye, Settings, Bell } from 'lucide-react';

type Mode = 'examinee' | 'admin';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('examinee');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ==========================================
  // 初期データシード (LocalStorage初期化)
  // ==========================================
  useEffect(() => {
    const now = new Date();
    
    // 1. キャンペーン初期設定 (開始: 1時間前, 終了: 14日後 ➜ デフォルトで受検可能に)
    if (!localStorage.getItem('stress_check_campaign')) {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const defaultCampaign: CampaignSettings = {
        campaignName: '2026年度 春期定期ストレスチェック',
        startDate: formatDateToDateTimeLocal(oneHourAgo),
        endDate: formatDateToDateTimeLocal(fourteenDaysLater),
        customNoticeStart: '厚生労働省の標準「職業性ストレス簡易調査票（57項目）」に準拠した、あなたのストレス状態を評価する診断です。',
        customNoticeHighStress: '厚生労働省が定める高ストレス判定基準に基づき、ストレスの負荷が高い状態であると評価されました。ご自身の体調を第一に考え、必要に応じて管理者に相談の上、医師による面接指導をお申し込みいただくことをお勧めします。',
        status: 'active'
      };
      localStorage.setItem('stress_check_campaign', JSON.stringify(defaultCampaign));
    }

    // 2. 結果開示同意初期設定
    if (!localStorage.getItem('stress_check_consent')) {
      const defaultConsent: ConsentSettings = {
        useConsent: true,
        discloseLabel: '事業者',
        discloseNotice: 'このストレスチェックは、個人情報保護方針に基づき実施されます。あなたの同意がある場合のみ、結果が事業者に共有されます。同意しないことで不利益な扱いを受けることは一切ありません。',
        consentTiming: 'after' // 受検完了直後
      };
      localStorage.setItem('stress_check_consent', JSON.stringify(defaultConsent));
    }

    // 3. 医師面接受付初期設定
    if (!localStorage.getItem('stress_check_interview')) {
      const defaultInterview: InterviewSettings = {
        displayCondition: 'high_stress_only',
        requireDisclosure: 'required',
        receptionDays: 30,
        notificationEmails: 'hoken@company.com'
      };
      localStorage.setItem('stress_check_interview', JSON.stringify(defaultInterview));
    }

    // 4. 従業員マスタシードデータ (3名)
    if (!localStorage.getItem('stress_check_employees')) {
      const defaultEmployees: Employee[] = [
        {
          employeeCode: 'EMP001',
          name: '山田 太郎',
          nameKana: 'ヤマダ タロウ',
          gender: 'male',
          email: 'yamada@company.com',
          birthDate: '1985-04-12',
          status: 'active'
        },
        {
          employeeCode: 'EMP002',
          name: '佐藤 花子',
          nameKana: 'サトウ ハナコ',
          gender: 'female',
          email: 'sato@company.com',
          birthDate: '1992-08-23',
          status: 'active'
        },
        {
          employeeCode: 'EMP003',
          name: '鈴木 一郎',
          nameKana: 'スズキ イチロウ',
          gender: 'male',
          email: 'suzuki@company.com',
          birthDate: '1978-11-30',
          status: 'active'
        }
      ];
      localStorage.setItem('stress_check_employees', JSON.stringify(defaultEmployees));
    }
  }, []);

  // 日付を input type="datetime-local" のフォーマットに変換するヘルパー
  const formatDateToDateTimeLocal = (date: Date): string => {
    const tzOffset = date.getTimezoneOffset() * 60000; // offsets in milliseconds
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  // 通知（トースト）を表示する
  const handleNotify = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // トーストがセットされたら4秒後に自動クローズ
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="app-container">
      {/* プレミアムグローバルヘッダー */}
      <div className="app-header">
        <div className="switch-nav">
          <button 
            className={`switch-btn ${mode === 'examinee' ? 'active' : ''}`}
            onClick={() => setMode('examinee')}
          >
            <Eye size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            受検者画面
          </button>
          <button 
            className={`switch-btn ${mode === 'admin' ? 'active' : ''}`}
            onClick={() => setMode('admin')}
          >
            <Settings size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            管理者画面
          </button>
        </div>
      </div>

      {/* 通知トーストコンポーネント */}
      {toast && (
        <div className={`toast-notification ${toast.type} fade-in-toast`}>
          <Bell size={18} style={{ marginRight: '8px' }} />
          <span>{toast.message}</span>
          <button className="toast-close-btn" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {/* メインポートのマウント */}
      {mode === 'examinee' ? (
        <div className="container">
          <ExamineePortal 
            onNotify={handleNotify} 
            onComplete={() => handleNotify('受検者セッションがリセットされました。', 'success')} 
          />
        </div>
      ) : (
        <div className="container">
          <AdminPortal onNotify={handleNotify} />
        </div>
      )}

      {/* グローバル追加スタイル */}
      <style>{`
        .toast-notification {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 10000;
          display: flex;
          align-items: center;
          padding: 12px 20px;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .toast-notification.success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }
        .toast-notification.error {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }
        .toast-close-btn {
          background: transparent;
          border: none;
          color: white;
          font-size: 1.25rem;
          margin-left: 12px;
          cursor: pointer;
          opacity: 0.7;
          line-height: 1;
        }
        .toast-close-btn:hover {
          opacity: 1;
        }
        .fade-in-toast {
          animation: slideInToast 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes slideInToast {
          from { transform: translateY(-20px) scale(0.9); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default App;
