import React, { useState, useEffect } from 'react';
import { ExamineePortal } from './components/ExamineePortal';
import { AdminPortal } from './components/AdminPortal';
import { CampaignSettings, ConsentSettings, InterviewSettings, Employee, ExamineeResult } from './types';
import { calculateScoring, Gender } from './utils/scoring';
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

    // 4. 従業員マスタシードデータ (16名 - 組織分析用に拡張)
    if (!localStorage.getItem('stress_check_employees')) {
      const defaultEmployees: Employee[] = [
        // 技術開発部: 12名
        { employeeCode: 'EMP001', name: '山田 太郎', nameKana: 'ヤマダ タロウ', gender: 'male', email: 'yamada@company.com', birthDate: '1985-04-12', status: 'active', department: '技術開発部' },
        { employeeCode: 'EMP002', name: '佐藤 花子', nameKana: 'サトウ ハナコ', gender: 'female', email: 'sato@company.com', birthDate: '1992-08-23', status: 'active', department: '技術開発部' },
        { employeeCode: 'EMP003', name: '鈴木 一郎', nameKana: 'スズキ イチロウ', gender: 'male', email: 'suzuki@company.com', birthDate: '1978-11-30', status: 'active', department: '技術開発部' },
        { employeeCode: 'EMP004', name: '高橋 健二', nameKana: 'タカハシ ケンジ', gender: 'male', email: 'takahashi@company.com', birthDate: '1989-05-15', status: 'active', department: '技術開発部' },
        { employeeCode: 'EMP005', name: '田中 裕子', nameKana: 'タナカ ユウコ', gender: 'female', email: 'tanaka@company.com', birthDate: '1995-12-04', status: 'active', department: '技術開発部' },
        { employeeCode: 'EMP006', name: '伊藤 茂', nameKana: 'イトウ シゲル', gender: 'male', email: 'ito@company.com', birthDate: '1972-07-18', status: 'active', department: '技術開発部' },
        { employeeCode: 'EMP007', name: '渡辺 恵', nameKana: 'ワタナベ メグミ', gender: 'female', email: 'watanabe@company.com', birthDate: '1988-02-09', status: 'active', department: '技術開発部' },
        { employeeCode: 'EMP008', name: '中村 淳', nameKana: 'ナカムラ ジュン', gender: 'male', email: 'nakamura@company.com', birthDate: '1981-09-27', status: 'active', department: '技術開発部' },
        { employeeCode: 'EMP009', name: '小林 礼子', nameKana: 'コバヤシ レイコ', gender: 'female', email: 'kobayashi@company.com', birthDate: '1994-06-14', status: 'active', department: '技術開発部' },
        { employeeCode: 'EMP010', name: '加藤 誠', nameKana: 'カトウ マコト', gender: 'male', email: 'kato@company.com', birthDate: '1980-03-31', status: 'active', department: '技術開発部' },
        { employeeCode: 'EMP011', name: '吉田 明美', nameKana: 'ヨシダ アケミ', gender: 'female', email: 'yoshida@company.com', birthDate: '1987-11-20', status: 'active', department: '技術開発部' },
        { employeeCode: 'EMP012', name: '佐々木 弘', nameKana: 'ササキ ヒロシ', gender: 'male', email: 'sasaki@company.com', birthDate: '1975-10-05', status: 'active', department: '技術開発部' },

        // グローバル営業部: 4名
        { employeeCode: 'EMP013', name: '林 直樹', nameKana: 'ハヤシ ナオキ', gender: 'male', email: 'hayashi@company.com', birthDate: '1983-01-22', status: 'active', department: 'グローバル営業部' },
        { employeeCode: 'EMP014', name: '清水 まどか', nameKana: 'シミズ マドカ', gender: 'female', email: 'shimizu@company.com', birthDate: '1991-04-17', status: 'active', department: 'グローバル営業部' },
        { employeeCode: 'EMP015', name: '山崎 拓也', nameKana: 'ヤマザキ タクヤ', gender: 'male', email: 'yamazaki@company.com', birthDate: '1986-09-08', status: 'active', department: 'グローバル営業部' },
        { employeeCode: 'EMP016', name: '森 佳代子', nameKana: 'モリ カヨコ', gender: 'female', email: 'mori@company.com', birthDate: '1993-11-12', status: 'active', department: 'グローバル営業部' }
      ];
      localStorage.setItem('stress_check_employees', JSON.stringify(defaultEmployees));
    }

    // 5. 受検結果ログのシード生成 (プログラムによる一括シード計算)
    if (!localStorage.getItem('stress_check_results')) {
      const seedResults: ExamineeResult[] = [];

      // A. 技術開発部: 10名受検完了 (匿名性保護 10名基準を突破)
      for (let i = 1; i <= 10; i++) {
        const empCode = `EMP${String(i).padStart(3, '0')}`;
        const isFemale = i === 2 || i === 5 || i === 7 || i === 9;
        const gender: Gender = isFemale ? 'female' : 'male';
        
        // ダミー回答の生成 (i <= 3 は高ストレス、それ以外は低ストレス)
        const dummyAnswers: Record<number, number> = {};
        for (let q = 1; q <= 57; q++) {
          const isStressy = i <= 3;
          if (isStressy) {
            dummyAnswers[q] = q % 3 === 0 ? 1 : 4; // 高ストレス
          } else {
            dummyAnswers[q] = q % 3 === 0 ? 4 : 1; // 低ストレス
          }
        }

        const score = calculateScoring(dummyAnswers, gender);
        seedResults.push({
          id: `${empCode}-seed`,
          employeeCode: empCode,
          campaignName: '2026年度 春期定期ストレスチェック',
          answers: dummyAnswers,
          subscales: score.subscales,
          totalReactionScore: score.totalReactionScore,
          totalStressorSupportScore: score.totalStressorSupportScore,
          isHighStress: score.isHighStress,
          consentDisclose: i !== 5, // EMP005 は開示「不同意」➜ マスキング検証用
          requestInterview: i === 1, // EMP001 は医師面接を希望
          interviewDetails: i === 1 ? {
            phone: '090-1234-5678',
            email: 'yamada@company.com',
            preferredSlots: ['6月1日 午前10時', '6月2日 午後14時', '6月3日 終日可'],
            comments: '最近新しいシステム開発で残業が増え、疲労が溜まっています。'
          } : undefined,
          completedAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      // B. グローバル営業部: 3名受検完了 (匿名性保護 10名基準未満 ➜ ロック検証用)
      for (let i = 13; i <= 15; i++) {
        const empCode = `EMP${String(i).padStart(3, '0')}`;
        const gender: Gender = i === 14 ? 'female' : 'male';
        
        const dummyAnswers: Record<number, number> = {};
        for (let q = 1; q <= 57; q++) {
          dummyAnswers[q] = q % 3 === 0 ? 3 : 2; // 中ストレス度
        }

        const score = calculateScoring(dummyAnswers, gender);
        seedResults.push({
          id: `${empCode}-seed`,
          employeeCode: empCode,
          campaignName: '2026年度 春期定期ストレスチェック',
          answers: dummyAnswers,
          subscales: score.subscales,
          totalReactionScore: score.totalReactionScore,
          totalStressorSupportScore: score.totalStressorSupportScore,
          isHighStress: score.isHighStress,
          consentDisclose: true,
          requestInterview: false,
          completedAt: new Date(now.getTime() - (i - 10) * 24 * 60 * 60 * 1000).toISOString()
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
