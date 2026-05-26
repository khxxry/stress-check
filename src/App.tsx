import React, { useState, useEffect } from 'react';
import { ExamineePortal } from './components/ExamineePortal';
import { AdminPortal } from './components/AdminPortal';
import { SuperAdminPortal } from './components/SuperAdminPortal';
import { SuperAdminLogin } from './components/SuperAdminLogin';
import { Corporation, CorporateUser, CampaignSettings, ConsentSettings, InterviewSettings, Employee, ExamineeResult } from './types';
import { calculateScoring, Gender } from './utils/scoring';
import { Eye, Settings, Bell, ShieldAlert } from 'lucide-react';

type Mode = 'examinee' | 'admin' | 'super_admin';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('examinee');
  const [isSuperAdminAuthenticated, setIsSuperAdminAuthenticated] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ==========================================
  // 初期データシード (SaaS型マルチテナント初期化)
  // ==========================================
  useEffect(() => {
    const now = new Date();
    
    // 1. 企業マスタ (Corporations) のシード
    if (!localStorage.getItem('stress_check_corporations')) {
      const defaultCorps: Corporation[] = [
        {
          corporationId: 'CORP001',
          name: '株式会社テクノロジーラボ',
          plan: 'premium',
          status: 'active',
          createdAt: '2026-04-01'
        },
        {
          corporationId: 'CORP002',
          name: 'グローバル営業本部株式会社',
          plan: 'basic',
          status: 'active',
          createdAt: '2026-04-15'
        }
      ];
      localStorage.setItem('stress_check_corporations', JSON.stringify(defaultCorps));
    }

    // 2. 企業管理者 (Corporate Users) のシード
    if (!localStorage.getItem('stress_check_corporate_users')) {
      const defaultUsers: CorporateUser[] = [
        {
          userId: 'USER001',
          corporationId: 'CORP001',
          name: '佐藤HR管理者',
          email: 'sato@example.com',
          role: 'admin',
          status: 'active'
        },
        {
          userId: 'USER002',
          corporationId: 'CORP002',
          name: '鈴木営業管理者',
          email: 'suzuki@example.com',
          role: 'admin',
          status: 'active'
        }
      ];
      localStorage.setItem('stress_check_corporate_users', JSON.stringify(defaultUsers));
    }

    // 3. テナント別のストレスチェック設定のシード
    // CORP001用
    if (!localStorage.getItem('stress_check_campaign_CORP001')) {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const defaultCampaign: CampaignSettings = {
        campaignName: '令和8年度 春期定期ストレスチェック',
        startDate: formatDateToDateTimeLocal(oneHourAgo),
        endDate: formatDateToDateTimeLocal(fourteenDaysLater),
        customNoticeStart: '日頃のストレス状況を把握し、健康的なワークライフを送るためのチェックです。正直にお答えください（所要時間約5分）。',
        customNoticeHighStress: '判定の結果、ストレス反応が高い状態であることがわかりました。自身の心身の健康のため、医師面接等のセルフケアをご検討ください。',
        status: 'active'
      };
      localStorage.setItem('stress_check_campaign_CORP001', JSON.stringify(defaultCampaign));
      
      const defaultConsent: ConsentSettings = {
        useConsent: true,
        discloseLabel: 'テクノロジーラボ',
        discloseNotice: '本ストレスチェックの結果は、労働安全衛生法に基づき、あなたの同意がある場合に限り事業者に開示されます。同意された場合、結果は職場環境の改善や必要に応じた産業医面談等の健康管理のために利用されます。',
        consentTiming: 'after'
      };
      localStorage.setItem('stress_check_consent_CORP001', JSON.stringify(defaultConsent));

      const defaultInterview: InterviewSettings = {
        displayCondition: 'high_stress_only',
        requireDisclosure: 'required',
        receptionDays: 14,
        notificationEmails: 'sato@example.com'
      };
      localStorage.setItem('stress_check_interview_CORP001', JSON.stringify(defaultInterview));
    }

    // CORP002用
    if (!localStorage.getItem('stress_check_campaign_CORP002')) {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const defaultCampaign: CampaignSettings = {
        campaignName: 'グローバル営業 メンタルケア調査',
        startDate: formatDateToDateTimeLocal(oneHourAgo),
        endDate: formatDateToDateTimeLocal(fourteenDaysLater),
        customNoticeStart: '営業職特有の労働負荷状況を捉え、安全かつ良好な業務姿勢を維持するための適性評価です。ご協力ください。',
        customNoticeHighStress: '判定スコアに負荷の偏りが見受けられました。速やかに産業医面談などのカウンセリングを実施することをお勧めします。',
        status: 'active'
      };
      localStorage.setItem('stress_check_campaign_CORP002', JSON.stringify(defaultCampaign));
      
      const defaultConsent: ConsentSettings = {
        useConsent: true,
        discloseLabel: 'グローバル営業本部',
        discloseNotice: '本ストレスチェックの結果は、労働安全衛生法に基づき、あなたの同意がある場合に限り事業者に開示されます。',
        consentTiming: 'before' // 開始前の同意
      };
      localStorage.setItem('stress_check_consent_CORP002', JSON.stringify(defaultConsent));

      const defaultInterview: InterviewSettings = {
        displayCondition: 'all', // 全員に面談ボタン表示
        requireDisclosure: 'required',
        receptionDays: 30,
        notificationEmails: 'suzuki@example.com'
      };
      localStorage.setItem('stress_check_interview_CORP002', JSON.stringify(defaultInterview));
    }

    // 4. 従業員マスタシードデータ (54名 for CORP001, 4名 for CORP002)
    if (!localStorage.getItem('stress_check_employees')) {
      const defaultEmployees: Employee[] = [
        // テクノロジーラボ (CORP001) 所属: 12名
        { corporationId: 'CORP001', employeeCode: 'EMP001', name: '山田 太郎', nameKana: 'ヤマダ タロウ', gender: 'male', email: 'yamada@company.com', birthDate: '1985-04-12', status: 'active', department: '技術開発部' },
        { corporationId: 'CORP001', employeeCode: 'EMP002', name: '佐藤 花子', nameKana: 'サトウ ハナコ', gender: 'female', email: 'sato@company.com', birthDate: '1992-08-23', status: 'active', department: '技術開発部' },
        { corporationId: 'CORP001', employeeCode: 'EMP003', name: '鈴木 一郎', nameKana: 'スズキ イチロウ', gender: 'male', email: 'suzuki@company.com', birthDate: '1978-11-30', status: 'active', department: '技術開発部' },
        { corporationId: 'CORP001', employeeCode: 'EMP004', name: '高橋 健二', nameKana: 'タカハシ ケンジ', gender: 'male', email: 'takahashi@company.com', birthDate: '1989-05-15', status: 'active', department: '技術開発部' },
        { corporationId: 'CORP001', employeeCode: 'EMP005', name: '田中 裕子', nameKana: 'タナカ ユウコ', gender: 'female', email: 'tanaka@company.com', birthDate: '1995-12-04', status: 'active', department: '技術開発部' },
        { corporationId: 'CORP001', employeeCode: 'EMP006', name: '伊藤 茂', nameKana: 'イトウ シゲル', gender: 'male', email: 'ito@company.com', birthDate: '1972-07-18', status: 'active', department: '技術開発部' },
        { corporationId: 'CORP001', employeeCode: 'EMP007', name: '渡辺 恵', nameKana: 'ワタナベ メグミ', gender: 'female', email: 'watanabe@company.com', birthDate: '1988-02-09', status: 'active', department: '技術開発部' },
        { corporationId: 'CORP001', employeeCode: 'EMP008', name: '中村 淳', nameKana: 'ナカムラ ジュン', gender: 'male', email: 'nakamura@company.com', birthDate: '1981-09-27', status: 'active', department: '技術開発部' },
        { corporationId: 'CORP001', employeeCode: 'EMP009', name: '小林 礼子', nameKana: 'コバヤシ レイコ', gender: 'female', email: 'kobayashi@company.com', birthDate: '1994-06-14', status: 'active', department: '技術開発部' },
        { corporationId: 'CORP001', employeeCode: 'EMP010', name: '加藤 誠', nameKana: 'カトウ マコト', gender: 'male', email: 'kato@company.com', birthDate: '1980-03-31', status: 'active', department: '技術開発部' },
        { corporationId: 'CORP001', employeeCode: 'EMP011', name: '吉田 明美', nameKana: 'ヨシダ アケミ', gender: 'female', email: 'yoshida@company.com', birthDate: '1987-11-20', status: 'active', department: '技術開発部' },
        { corporationId: 'CORP001', employeeCode: 'EMP012', name: '佐々木 弘', nameKana: 'ササキ ヒロシ', gender: 'male', email: 'sasaki@company.com', birthDate: '1975-10-05', status: 'active', department: '技術開発部' }
      ];

      // 残りの42名を動的に追加して合計54名にする
      const firstNames = ['健一', '洋子', '和也', '真由美', '隆', '直美', '博之', '恵子', '修', 'さくら', '大輔', '美紀'];
      const lastNames = ['高橋', '渡辺', '佐藤', '田中', '山田', '中村', '小林', '加藤', '吉田', '佐々木', '山口', '松本'];
      const depts = ['技術開発部', '人事総務部', '企画マーケティング部', 'グローバル営業部'];

      for (let i = 13; i <= 54; i++) {
        const empCode = `EMP${String(i).padStart(3, '0')}`;
        const lastName = lastNames[i % lastNames.length];
        const firstName = firstNames[i % firstNames.length];
        const name = `${lastName} ${firstName}`;
        const nameKana = 'テスト シャイン';
        const gender = i % 2 === 0 ? 'female' : 'male';
        const department = depts[i % depts.length];
        const email = `test${i}@company.com`;
        const birthDate = `19${80 + (i % 20)}-01-01`;

        defaultEmployees.push({
          corporationId: 'CORP001',
          employeeCode: empCode,
          name,
          nameKana,
          gender,
          email,
          birthDate,
          status: 'active',
          department
        });
      }

      // グローバル営業本部 (CORP002) 所属: 4名 (EMP055〜EMP058)
      defaultEmployees.push(
        { corporationId: 'CORP002', employeeCode: 'EMP055', name: '林 直樹', nameKana: 'ハヤシ ナオキ', gender: 'male', email: 'hayashi@company.com', birthDate: '1983-01-22', status: 'active', department: 'グローバル営業部' },
        { corporationId: 'CORP002', employeeCode: 'EMP056', name: '清水 まどか', nameKana: 'シミズ マドカ', gender: 'female', email: 'shimizu@company.com', birthDate: '1991-04-17', status: 'active', department: 'グローバル営業部' },
        { corporationId: 'CORP002', employeeCode: 'EMP057', name: '山崎 拓也', nameKana: 'ヤマザキ タクヤ', gender: 'male', email: 'yamazaki@company.com', birthDate: '1986-09-08', status: 'active', department: 'グローバル営業部' },
        { corporationId: 'CORP002', employeeCode: 'EMP058', name: '森 佳代子', nameKana: 'モリ カヨコ', gender: 'female', email: 'mori@company.com', birthDate: '1993-11-12', status: 'active', department: 'グローバル営業部' }
      );

      localStorage.setItem('stress_check_employees', JSON.stringify(defaultEmployees));
    }

    // 5. 受検結果ログのシード生成 (企業ID付き)
    if (!localStorage.getItem('stress_check_results')) {
      const seedResults: ExamineeResult[] = [];

      // A. テナント1 (CORP001): 51名受検完了 (54名中)
      for (let i = 1; i <= 51; i++) {
        const empCode = `EMP${String(i).padStart(3, '0')}`;
        const isFemale = i % 2 === 0;
        const gender: Gender = isFemale ? 'female' : 'male';
        
        const dummyAnswers: Record<number, number> = {};
        for (let q = 1; q <= 57; q++) {
          const isHigh = i % 4 === 0; // 4の倍数の従業員は高ストレスにする
          if (isHigh) {
            dummyAnswers[q] = q % 3 === 0 ? 1 : 4;
          } else {
            dummyAnswers[q] = q % 3 === 0 ? 4 : 1;
          }
        }

        const score = calculateScoring(dummyAnswers, gender);
        seedResults.push({
          id: `${empCode}-CORP001-seed`,
          corporationId: 'CORP001',
          employeeCode: empCode,
          campaignName: '令和8年度 春期定期ストレスチェック',
          answers: dummyAnswers,
          subscales: score.subscales,
          totalReactionScore: score.totalReactionScore,
          totalStressorSupportScore: score.totalStressorSupportScore,
          isHighStress: score.isHighStress,
          consentDisclose: i % 8 !== 0, // 8の倍数は開示「不同意」
          requestInterview: i % 12 === 0, // 12の倍数は医師面接を希望
          interviewDetails: i % 12 === 0 ? {
            phone: '090-9999-8888',
            email: `test${i}@company.com`,
            preferredSlots: ['6月1日 午前10時', '6月2日 午後14時'],
            comments: '産業医面談を希望します。疲労が抜けない状態が続いています。'
          } : undefined,
          completedAt: new Date(now.getTime() - i * 12 * 60 * 60 * 1000).toISOString()
        });
      }

      // B. テナント2 (CORP002): 3名受検完了
      for (let i = 55; i <= 57; i++) {
        const empCode = `EMP${String(i).padStart(3, '0')}`;
        const gender: Gender = i === 56 ? 'female' : 'male';
        
        const dummyAnswers: Record<number, number> = {};
        for (let q = 1; q <= 57; q++) {
          dummyAnswers[q] = q % 3 === 0 ? 3 : 2;
        }

        const score = calculateScoring(dummyAnswers, gender);
        seedResults.push({
          id: `${empCode}-CORP002-seed`,
          corporationId: 'CORP002',
          employeeCode: empCode,
          campaignName: 'グローバル営業 メンタルケア調査',
          answers: dummyAnswers,
          subscales: score.subscales,
          totalReactionScore: score.totalReactionScore,
          totalStressorSupportScore: score.totalStressorSupportScore,
          isHighStress: score.isHighStress,
          consentDisclose: true,
          requestInterview: false,
          completedAt: new Date(now.getTime() - (i - 50) * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      localStorage.setItem('stress_check_results', JSON.stringify(seedResults));
    }
  }, []);

  // 日付を input type="datetime-local" のフォーマットに変換するヘルパー
  const formatDateToDateTimeLocal = (date: Date): string => {
    const tzOffset = date.getTimezoneOffset() * 60000;
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

  const handleSuperAdminLoginSuccess = () => {
    setIsSuperAdminAuthenticated(true);
    handleNotify('システム管理者として認証されました。', 'success');
  };

  const handleSuperAdminLogout = () => {
    setIsSuperAdminAuthenticated(false);
    setMode('examinee');
    handleNotify('システム管理者ポータルからログアウトしました。', 'success');
  };

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
            企業管理者画面
          </button>
          {isSuperAdminAuthenticated && (
            <button 
              className={`switch-btn ${mode === 'super_admin' ? 'active' : ''}`}
              onClick={() => setMode('super_admin')}
            >
              <ShieldAlert size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              システム管理者画面
            </button>
          )}
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
      ) : mode === 'admin' ? (
        <div className="container">
          <AdminPortal onNotify={handleNotify} />
        </div>
      ) : (
        <div className="container">
          {isSuperAdminAuthenticated ? (
            <SuperAdminPortal onNotify={handleNotify} onLogout={handleSuperAdminLogout} />
          ) : (
            <SuperAdminLogin 
              onNotify={handleNotify} 
              onSuccess={handleSuperAdminLoginSuccess} 
              onCancel={() => setMode('examinee')} 
            />
          )}
        </div>
      )}

      {/* プレミアムフッター（システム管理者用エントリ） */}
      <div className="app-footer" style={{ marginTop: '4rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', borderTop: '1px solid rgba(226, 232, 240, 0.4)', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          <span>© 2026 Stress Check SaaS. All Rights Reserved.</span>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <button
            onClick={() => {
              setMode('super_admin');
            }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
          >
            <ShieldAlert size={12} />
            システム管理者用ログイン
          </button>
        </div>
      </div>

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
