import React, { useState, useEffect } from 'react';
import { CampaignSettings, ConsentSettings, InterviewSettings, ExamineeResult, Employee } from '../types';
import { EmployeeManager } from './EmployeeManager';
import { Radar } from 'react-chartjs-2';
import { Settings, ClipboardList, Users, ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert, Search, X, Lock, Check } from 'lucide-react';

interface AdminPortalProps {
  onNotify: (message: string, type: 'success' | 'error') => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<'wizard' | 'results' | 'employees'>('wizard');
  
  // ==========================================
  // 1. 管理者設定状態 (Wizard)
  // ==========================================
  const [adminStep, setAdminStep] = useState(1);
  
  // キャンペーン設定
  const [campaignName, setCampaignName] = useState('2026年度 春期定期ストレスチェック');
  const [startDate, setStartDate] = useState('2026-05-25T10:00');
  const [endDate, setEndDate] = useState('2026-06-08T18:00');
  const [customNoticeStart, setCustomNoticeStart] = useState('厚生労働省の標準「職業性ストレス簡易調査票（57項目）」に準拠した、あなたのストレス状態を評価する診断です。');
  const [customNoticeHighStress, setCustomNoticeHighStress] = useState('厚生労働省が定める高ストレス判定基準に基づき、ストレスの負荷が高い状態であると評価されました。ご自身の体調を第一に考え、必要に応じて管理者に相談の上、医師による面接指導をお申し込みいただくことをお勧めします。');
  
  // 同意設定
  const [useConsent, setUseConsent] = useState(true);
  const [discloseLabel, setDiscloseLabel] = useState('事業者');
  const [discloseNotice, setDiscloseNotice] = useState('このストレスチェックは、個人情報保護方針に基づき実施されます。あなたの同意がある場合のみ、結果が事業者に共有されます。同意しないことで不利益な扱いを受けることは一切ありません。');
  const [consentTiming, setConsentTiming] = useState<'before' | 'after'>('after');
  
  // 面接設定
  const [displayCondition, setDisplayCondition] = useState<'all' | 'high_stress_only' | 'recommended_only' | 'disabled'>('high_stress_only');
  const [requireDisclosure, setRequireDisclosure] = useState<'required' | 'optional' | 'none'>('required');
  const [receptionDays, setReceptionDays] = useState(30);
  const [notificationEmails, setNotificationEmails] = useState('admin@company.com');

  // ==========================================
  // 2. 受検結果一覧状態
  // ==========================================
  const [results, setResults] = useState<ExamineeResult[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [resultSearchTerm, setResultSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState<ExamineeResult | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // 設定のロード
  useEffect(() => {
    const storedCampaign = localStorage.getItem('stress_check_campaign');
    if (storedCampaign) {
      const camp: CampaignSettings = JSON.parse(storedCampaign);
      setCampaignName(camp.campaignName);
      setStartDate(camp.startDate);
      setEndDate(camp.endDate);
      setCustomNoticeStart(camp.customNoticeStart);
      setCustomNoticeHighStress(camp.customNoticeHighStress);
    }
    
    const storedConsent = localStorage.getItem('stress_check_consent');
    if (storedConsent) {
      const cons: ConsentSettings = JSON.parse(storedConsent);
      setUseConsent(cons.useConsent);
      setDiscloseLabel(cons.discloseLabel);
      setDiscloseNotice(cons.discloseNotice);
      setConsentTiming(cons.consentTiming);
    }

    const storedInterview = localStorage.getItem('stress_check_interview');
    if (storedInterview) {
      const intv: InterviewSettings = JSON.parse(storedInterview);
      setDisplayCondition(intv.displayCondition);
      setRequireDisclosure(intv.requireDisclosure);
      setReceptionDays(intv.receptionDays);
      setNotificationEmails(intv.notificationEmails);
    }

    // 結果と従業員のロード
    loadResultsAndEmployees();
  }, []);

  const loadResultsAndEmployees = () => {
    const storedResults = localStorage.getItem('stress_check_results');
    if (storedResults) {
      setResults(JSON.parse(storedResults));
    }
    const storedEmployees = localStorage.getItem('stress_check_employees');
    if (storedEmployees) {
      setEmployees(JSON.parse(storedEmployees));
    }
  };

  // タブ切り替え時にリフレッシュ
  useEffect(() => {
    if (activeTab === 'results') {
      loadResultsAndEmployees();
    }
  }, [activeTab]);

  // 設定の保存 (LocalStorage永続化 ＆ キャンペーンアクティベート)
  const handleSaveSettings = () => {
    // 期間のバリデーション
    if (!campaignName.trim()) {
      onNotify('実施キャンペーン名を入力してください。', 'error');
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      onNotify('終了日時は開始日時より後に設定してください。', 'error');
      return;
    }
    if (discloseLabel.length > 10) {
      onNotify('事業者の呼称は10文字以内で設定してください。', 'error');
      return;
    }
    if (customNoticeStart.length > 400 || discloseNotice.length > 400 || customNoticeHighStress.length > 400) {
      onNotify('案内文、注意書きは400文字以内で入力してください。', 'error');
      return;
    }

    // 各LocalStorageキーに保存
    const campaign: CampaignSettings = {
      campaignName: campaignName.trim(),
      startDate,
      endDate,
      customNoticeStart: customNoticeStart.trim(),
      customNoticeHighStress: customNoticeHighStress.trim(),
      status: 'active'
    };
    localStorage.setItem('stress_check_campaign', JSON.stringify(campaign));

    const consent: ConsentSettings = {
      useConsent,
      discloseLabel: discloseLabel.trim(),
      discloseNotice: discloseNotice.trim(),
      consentTiming
    };
    localStorage.setItem('stress_check_consent', JSON.stringify(consent));

    const interview: InterviewSettings = {
      displayCondition,
      requireDisclosure,
      receptionDays,
      notificationEmails: notificationEmails.trim()
    };
    localStorage.setItem('stress_check_interview', JSON.stringify(interview));

    onNotify('設定がLocalStorageに保存され、キャンペーンが有効化されました！', 'success');
    setAdminStep(1); // 最初のステップに戻す
  };

  // 受検詳細モーダルを開く
  const handleViewResultDetails = (result: ExamineeResult) => {
    const emp = employees.find(e => e.employeeCode === result.employeeCode) || null;
    setSelectedResult(result);
    setSelectedEmployee(emp);
  };

  // ==========================================
  // 受検状況の集計計算
  // ==========================================
  const totalEmployees = employees.filter(e => e.status === 'active').length;
  const completedCount = results.length;
  const completionRate = totalEmployees > 0 ? Math.round((completedCount / totalEmployees) * 100) : 0;
  const highStressCount = results.filter(r => r.isHighStress).length;
  const interviewRequestCount = results.filter(r => r.requestInterview).length;

  // フィルタリング後の受検結果
  const filteredResults = results.filter(res => {
    const emp = employees.find(e => e.employeeCode === res.employeeCode);
    const name = emp ? emp.name : 'ゲスト';
    const email = emp ? emp.email : '';
    const query = resultSearchTerm.toLowerCase();
    
    return (
      res.employeeCode.toLowerCase().includes(query) ||
      name.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query)
    );
  });

  return (
    <div className="admin-portal-container fade-in">
      {/* 管理者用インナータブナビゲーション */}
      <div className="admin-tabs mb-6">
        <button 
          className={`tab-btn ${activeTab === 'wizard' ? 'active' : ''}`}
          onClick={() => setActiveTab('wizard')}
        >
          <Settings size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          実施セットアップ
        </button>
        <button 
          className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          <ClipboardList size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          受検結果トラッキング
          {results.length > 0 && <span className="tab-badge">{results.length}</span>}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => setActiveTab('employees')}
        >
          <Users size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          従業員マスタ管理
        </button>
      </div>

      {/* ==========================================
          タブ1: 実施セットアップ (Wizard)
          ========================================== */}
      {activeTab === 'wizard' && (
        <div className="card admin-placeholder fade-in" style={{ maxWidth: '700px' }}>
          <div className="admin-header flex justify-between items-center">
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>ストレスチェック 実施管理設定</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>キャンペーン期間、同意文書、医師面接連携を詳細に構成します。</p>
            </div>
            <span className="badge-admin">セットアップ</span>
          </div>

          {/* ウィザードインジケータ */}
          <div className="wizard-steps mb-6">
            <div className={`wizard-step ${adminStep === 1 ? 'active' : ''}`}>
              <span className="wizard-step-num">1</span> 期間設定
            </div>
            <div className={`wizard-step ${adminStep === 2 ? 'active' : ''}`}>
              <span className="wizard-step-num">2</span> 対象者確認
            </div>
            <div className={`wizard-step ${adminStep === 3 ? 'active' : ''}`}>
              <span className="wizard-step-num">3</span> 開示同意
            </div>
            <div className={`wizard-step ${adminStep === 4 ? 'active' : ''}`}>
              <span className="wizard-step-num">4</span> 医師面接
            </div>
            <div className={`wizard-step ${adminStep === 5 ? 'active' : ''}`}>
              <span className="wizard-step-num">5</span> 最終確認
            </div>
          </div>

          {/* 各ステップのコンテンツ */}
          <div className="admin-step-content" style={{ minHeight: '320px' }}>
            {/* ステップ1: 期間設定 */}
            {adminStep === 1 && (
              <div className="admin-card fade-in">
                <h3 className="mb-4 text-primary" style={{ fontSize: '1.1rem', fontWeight: 700 }}>ステップ1: キャンペーン及び実施期間設定</h3>
                
                <div className="form-group">
                  <label className="form-label">実施キャンペーン名 <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="例: 2026年度 春期定期ストレスチェック"
                  />
                </div>
                
                <div className="flex gap-4 flex-col sm:flex-row">
                  <div className="form-group w-full">
                    <label className="form-label">開始日時 <span style={{ color: 'red' }}>*</span></label>
                    <input 
                      type="datetime-local" 
                      className="form-control" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group w-full">
                    <label className="form-label">終了日時 <span style={{ color: 'red' }}>*</span></label>
                    <input 
                      type="datetime-local" 
                      className="form-control" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">受検開始案内の説明文面 (400文字以内)</label>
                  <textarea 
                    className="form-control" 
                    rows={3} 
                    value={customNoticeStart}
                    onChange={(e) => setCustomNoticeStart(e.target.value)}
                    placeholder="受検者が最初に目にする説明文です。"
                  />
                  <div className="text-right text-muted" style={{ fontSize: '0.75rem' }}>{customNoticeStart.length}/400 文字</div>
                </div>

                <div className="form-group">
                  <label className="form-label">高ストレス判定時の案内・相談文面 (400文字以内)</label>
                  <textarea 
                    className="form-control" 
                    rows={3} 
                    value={customNoticeHighStress}
                    onChange={(e) => setCustomNoticeHighStress(e.target.value)}
                    placeholder="高ストレス者にのみ結果画面で表示される相談窓口やアドバイス文です。"
                  />
                  <div className="text-right text-muted" style={{ fontSize: '0.75rem' }}>{customNoticeHighStress.length}/400 文字</div>
                </div>

                <p className="text-muted mt-2" style={{ fontSize: '0.78rem', color: '#b45309' }}>
                  ※設定した期間外は、受検者画面が自動でロックアウトされ受検できなくなります。
                </p>
              </div>
            )}

            {/* ステップ2: 対象者確認 */}
            {adminStep === 2 && (
              <div className="admin-card fade-in">
                <h3 className="mb-4 text-primary" style={{ fontSize: '1.1rem', fontWeight: 700 }}>ステップ2: 受検対象者マスタ確認</h3>
                
                <div className="feature-info mb-4" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>👥 現在の有効受検対象者数: <span className="text-primary" style={{ fontSize: '1.1rem' }}>{totalEmployees} 名</span></p>
                  <p className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>受検対象者は「従業員マスタ管理」タブで登録された、ステータスが「有効」の全社員です。</p>
                </div>

                {/* CSVアップロードプレースホルダー (Phase 3用ワイヤー) */}
                <div className="csv-upload-mock text-center" style={{ border: '2px dashed #cbd5e1', padding: '2.5rem 1rem', borderRadius: '8px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>対象者CSVの一括スマートインポート (Phase 3実装予定)</div>
                  <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>CSV/Excelのドラッグ＆ドロップとエラー行の画面上エディタ修正</p>
                  <button className="btn btn-outline" disabled style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>CSVインポート機能を使用する</button>
                </div>

                <div className="feature-info mt-4" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
                    💡 <strong>受検対象の追加・編集について:</strong><br />
                    対象者の個別の追加や変更は、上の<strong>「従業員マスタ管理」</strong>タブからいつでも簡単に行えます。
                  </p>
                </div>
              </div>
            )}

            {/* ステップ3: 開示同意設定 */}
            {adminStep === 3 && (
              <div className="admin-card fade-in">
                <h3 className="mb-4 text-primary" style={{ fontSize: '1.1rem', fontWeight: 700 }}>ステップ3: 事業者への結果開示・同意フォーム構成</h3>
                
                <div className="form-group">
                  <label className="form-label" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={useConsent} 
                      onChange={(e) => setUseConsent(e.target.checked)}
                      style={{ width: '18px', height: '18px', marginRight: '8px' }} 
                    />
                    結果開示同意フォームを収集する
                  </label>
                  <p className="text-muted" style={{ fontSize: '0.78rem', marginLeft: '26px' }}>
                    ※無効にすると、結果開示の確認を行わず、受検結果の企業側閲覧を制限（または一括制限）します。安全な法運用のために<strong>「使用する」を推奨</strong>します。
                  </p>
                </div>

                {useConsent && (
                  <div className="consent-sub-fields fade-in mt-4 pl-4" style={{ borderLeft: '3px solid var(--primary-light)' }}>
                    <div className="form-group">
                      <label className="form-label">「事業者」の呼称カスタマイズ (10文字以内)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={discloseLabel}
                        onChange={(e) => setDiscloseLabel(e.target.value)}
                        placeholder="例: 〇〇株式会社, 会社"
                        maxLength={10}
                      />
                      <p className="text-muted" style={{ fontSize: '0.75rem' }}>※規約文章内の「事業者」がこの名称に差し替わります。</p>
                    </div>

                    <div className="form-group">
                      <label className="form-label">開示に関する規約・説明文面 (400文字以内)</label>
                      <textarea 
                        className="form-control" 
                        rows={3} 
                        value={discloseNotice}
                        onChange={(e) => setDiscloseNotice(e.target.value)}
                      />
                      <div className="text-right text-muted" style={{ fontSize: '0.75rem' }}>{discloseNotice.length}/400 文字</div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">同意を求めるタイミング</label>
                      <div className="flex gap-4">
                        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
                          <input 
                            type="radio" 
                            name="timing" 
                            checked={consentTiming === 'before'} 
                            onChange={() => setConsentTiming('before')}
                            style={{ marginRight: '6px' }}
                          />
                          受検開始前
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
                          <input 
                            type="radio" 
                            name="timing" 
                            checked={consentTiming === 'after'} 
                            onChange={() => setConsentTiming('after')}
                            style={{ marginRight: '6px' }}
                          />
                          受検完了直後 (推奨)
                        </label>
                      </div>
                      <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                        ※「受検完了直後」を選択すると、受検者は自分の結果が出る直前に、不同意による不利益が生じない規約に合意するか選択します。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ステップ4: 医師面接設定 */}
            {adminStep === 4 && (
              <div className="admin-card fade-in">
                <h3 className="mb-4 text-primary" style={{ fontSize: '1.1rem', fontWeight: 700 }}>ステップ4: 医師面接指導の受付フォーム設定</h3>
                
                <div className="form-group">
                  <label className="form-label">医師面接申請フォームの表示条件</label>
                  <select 
                    className="form-control"
                    value={displayCondition}
                    onChange={(e) => setDisplayCondition(e.target.value as any)}
                  >
                    <option value="high_stress_only">高ストレス判定者にのみ表示 (推奨)</option>
                    <option value="all">全員に表示</option>
                    <option value="recommended_only">面接勧奨者（管理者が個別判定）にのみ表示</option>
                    <option value="disabled">使用しない</option>
                  </select>
                </div>

                {displayCondition !== 'disabled' && (
                  <div className="interview-sub-fields fade-in mt-4 pl-4" style={{ borderLeft: '3px solid var(--primary-light)' }}>
                    <div className="form-group">
                      <label className="form-label">事業者への個人結果開示の取得方針</label>
                      <select 
                        className="form-control"
                        value={requireDisclosure}
                        onChange={(e) => setRequireDisclosure(e.target.value as any)}
                      >
                        <option value="required">面接申し込み時に事業者への結果開示同意を「必須」とする</option>
                        <option value="optional">開示同意は「任意」とする</option>
                        <option value="none">開示同意は不要（別管理）とする</option>
                      </select>
                      <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                        ※医師面接を申し込むと、自動的に「事業者への結果開示同意」もセットで必要とする運用が法的に推奨されます。
                      </p>
                    </div>

                    <div className="form-group">
                      <label className="form-label">面接申込の受付期間 (実施期間終了日の翌日からの日数)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={receptionDays}
                        onChange={(e) => setReceptionDays(parseInt(e.target.value) || 0)}
                        style={{ width: '120px' }}
                        min={0}
                        max={199}
                      />
                      <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '8px' }}>日後まで受付</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">面接申請発生時の自動通知メール（カンマ区切り、最大5件）</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={notificationEmails}
                        onChange={(e) => setNotificationEmails(e.target.value)}
                        placeholder="例: hoken@company.com, admin@company.com"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ステップ5: 最終確認 */}
            {adminStep === 5 && (
              <div className="admin-card fade-in">
                <h3 className="mb-4 text-primary" style={{ fontSize: '1.1rem', fontWeight: 700 }}>ステップ5: 設定情報の最終確認</h3>
                
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem' }}>📝 キャンペーン・実施設計</h4>
                  <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 0', fontWeight: 600, width: '150px' }}>キャンペーン名</td>
                        <td style={{ padding: '8px 0' }}>{campaignName}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 0', fontWeight: 600 }}>実施期間</td>
                        <td style={{ padding: '8px 0', color: '#1e3a8a', fontWeight: 600 }}>
                          {startDate.replace('T', ' ')} 〜 {endDate.replace('T', ' ')}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 0', fontWeight: 600 }}>開示同意フォーム</td>
                        <td style={{ padding: '8px 0' }}>
                          {useConsent ? `使用する (呼称: ${discloseLabel}、タイミング: ${consentTiming === 'before' ? '開始前' : '完了直後'})` : '使用しない'}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 0', fontWeight: 600 }}>医師面接受付</td>
                        <td style={{ padding: '8px 0' }}>
                          {displayCondition === 'disabled' 
                            ? '使用しない' 
                            : `表示対象: ${displayCondition === 'high_stress_only' ? '高ストレス者のみ' : displayCondition === 'all' ? '全員' : '面接勧奨者のみ'} (結果開示: ${requireDisclosure === 'required' ? '必須' : '任意'})`}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 0', fontWeight: 600 }}>面接申込受付期間</td>
                        <td style={{ padding: '8px 0' }}>キャンペーン終了の {receptionDays} 日後まで</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="text-center mt-6 mb-2">
                  <button className="btn btn-primary w-full" onClick={handleSaveSettings} style={{ padding: '1rem' }}>
                    <CheckCircle2 size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    設定を保存してキャンペーンを有効化
                  </button>
                  <p className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>※有効化すると設定がLocalStorageに保存され、受検者用ログイン画面へただちに反映されます。</p>
                </div>
              </div>
            )}
          </div>

          {/* ウィザードの下部ナビゲーション */}
          <div className="flex justify-between mt-6 pb-2" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <button 
              className="btn btn-outline"
              disabled={adminStep === 1}
              onClick={() => setAdminStep(adminStep - 1)}
            >
              <ArrowLeft size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> 戻る
            </button>
            
            <button 
              className="btn btn-primary"
              onClick={() => {
                if (adminStep < 5) {
                  setAdminStep(adminStep + 1);
                } else {
                  handleSaveSettings();
                }
              }}
            >
              {adminStep === 5 ? '有効化して完了' : '次へ進む'} <ArrowRight size={16} style={{ marginLeft: '6px', verticalAlign: 'middle' }} />
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          タブ2: 受検結果トラッキング
          ========================================== */}
      {activeTab === 'results' && (
        <div className="card fade-in" style={{ maxWidth: '800px' }}>
          <div className="admin-header mb-6">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>受検結果トラッキング ＆ 分析</h2>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>受検対象従業員の進捗状況および集計結果をリアルタイムで追跡します。</p>
          </div>

          {/* クイック統計パネル */}
          <div className="stats-grid mb-6">
            <div className="stat-card">
              <span className="stat-label">対象従業員数</span>
              <span className="stat-val">{totalEmployees}名</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">受検完了数</span>
              <span className="stat-val text-primary">{completedCount}名</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">受検完了率</span>
              <span className="stat-val" style={{ color: '#16a34a' }}>{completionRate}%</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">高ストレス該当者</span>
              <span className="stat-val" style={{ color: highStressCount > 0 ? '#ea580c' : '#16a34a' }}>
                {highStressCount}名
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">面接指導希望数</span>
              <span className="stat-val" style={{ color: '#2563eb' }}>{interviewRequestCount}件</span>
            </div>
          </div>

          {/* 受検者検索 */}
          <div className="search-box mb-4" style={{ position: 'relative' }}>
            <Search size={18} className="text-muted" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="社員番号、氏名で結果を検索..."
              value={resultSearchTerm}
              onChange={(e) => setResultSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>

          {/* 結果一覧テーブル */}
          <div className="table-responsive" style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>社員番号</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>氏名</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>受検日</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>事業者開示同意</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>高ストレス判定</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>医師面接希望</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>詳細</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      受検結果レコードがありません。
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((res) => {
                    const emp = employees.find(e => e.employeeCode === res.employeeCode);
                    const name = emp ? emp.name : 'ゲスト受検者';
                    
                    return (
                      <tr key={res.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row">
                        <td style={{ padding: '12px 16px', fontWeight: 600, fontFamily: 'monospace' }}>{res.employeeCode}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>{name}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                          {res.completedAt.split('T')[0]}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`consent-badge ${res.consentDisclose ? 'agreed' : 'disagreed'}`}>
                            {res.consentDisclose ? '同意あり' : '同意なし（非開示）'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {!res.consentDisclose ? (
                            <span className="masked-indicator">
                              <Lock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> 非公開
                            </span>
                          ) : (
                            <span className={`highstress-badge ${res.isHighStress ? 'yes' : 'no'}`}>
                              {res.isHighStress ? '高ストレス' : '健康状態良好'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`interview-badge ${res.requestInterview ? 'yes' : 'no'}`}>
                            {res.requestInterview ? '希望する' : '希望しない'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => handleViewResultDetails(res)}>
                            閲覧
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          タブ3: 従業員マスタ管理 (CRUD)
          ========================================== */}
      {activeTab === 'employees' && (
        <div className="card" style={{ maxWidth: '800px' }}>
          <EmployeeManager onNotify={onNotify} />
        </div>
      )}

      {/* ==========================================
          詳細表示モーダル（個人受検結果の閲覧とマスキング）
          ========================================== */}
      {selectedResult && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '640px', padding: '2rem', background: 'white' }}>
            <div className="flex justify-between items-center pb-2 mb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                ストレスチェック受検詳細結果
              </h3>
              <button className="icon-btn" onClick={() => setSelectedResult(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>
              {/* 受検者基本情報 */}
              <div className="result-summary mb-4" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--primary)' }}>👤 受検者基本プロファイル</h4>
                <div className="grid grid-cols-2 gap-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '0.85rem' }}>
                  <div><strong>社員番号:</strong> {selectedResult.employeeCode}</div>
                  <div><strong>氏名:</strong> {selectedEmployee ? selectedEmployee.name : 'ゲスト受検者'}</div>
                  <div><strong>性別:</strong> {selectedEmployee ? (selectedEmployee.gender === 'male' ? '男性' : '女性') : '不明'}</div>
                  <div><strong>受検完了日時:</strong> {selectedResult.completedAt.replace('T', ' ').substring(0, 16)}</div>
                </div>
              </div>

              {/* 同意状態とスコア表示 (開示不同意の場合は詳細をマスキング) */}
              <div className="mb-4">
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px' }}>📊 診断結果スコア</h4>
                
                {!selectedResult.consentDisclose ? (
                  // =================== マスキング状態 (非開示) ===================
                  <div className="alert-badge warning flex-col" style={{ padding: '1.5rem', borderRadius: '8px', width: '100%', alignItems: 'center', textAlign: 'center' }}>
                    <ShieldAlert size={36} className="mb-2" style={{ color: '#ea580c' }} />
                    <strong style={{ fontSize: '1rem', color: '#9a3412', marginBottom: '8px' }}>個人情報の非開示保護が有効です</strong>
                    <p style={{ fontSize: '0.8rem', color: '#a16207', lineHeight: '1.5' }}>
                      この受検者は、結果の<strong>「{discloseLabel}への開示に同意しない」</strong>を選択しました。<br />
                      厚生労働省の法的基準に基づき、本人の明示的な同意がないため、詳細な回答データ、18尺度スコア、および高ストレス該当の合否はマスキングされ閲覧できません。
                    </p>
                    
                    {/* マスク表現 */}
                    <div className="masked-data-mock mt-4" style={{ width: '100%', border: '1px dashed #cbd5e1', padding: '10px', background: 'rgba(255,255,255,0.5)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div>仕事のストレス要因: *** / 5段階</div>
                      <div>心身のストレス反応: *** / 5段階</div>
                      <div>周囲のサポート関係: *** / 5段階</div>
                      <div style={{ fontWeight: 700, marginTop: '4px' }}>総合判定: [ 🔒 個人情報保護により非表示 ]</div>
                    </div>
                  </div>
                ) : (
                  // =================== 開示同意あり (詳細スコア閲覧可能) ===================
                  <div className="fade-in">
                    <div className="alert-badge success mb-4" style={{ borderRadius: '6px', fontSize: '0.8rem' }}>
                      <Check size={16} style={{ marginRight: '6px' }} />
                      <span>本受検者は {discloseLabel} への結果開示に「同意」しています。</span>
                    </div>

                    <div className="stats-grid mb-4">
                      <div className="stat-card" style={{ padding: '10px' }}>
                        <span className="stat-label" style={{ fontSize: '0.7rem' }}>ストレス反応スコア</span>
                        <span className="stat-val" style={{ fontSize: '1.25rem' }}>{selectedResult.totalReactionScore}</span>
                        <span className="stat-label" style={{ fontSize: '0.65rem' }}>(低いほど良好)</span>
                      </div>
                      <div className="stat-card" style={{ padding: '10px' }}>
                        <span className="stat-label" style={{ fontSize: '0.7rem' }}>ストレス要因＆サポート</span>
                        <span className="stat-val" style={{ fontSize: '1.25rem' }}>{selectedResult.totalStressorSupportScore}</span>
                        <span className="stat-label" style={{ fontSize: '0.65rem' }}>(低いほど良好)</span>
                      </div>
                      <div className="stat-card" style={{ padding: '10px' }}>
                        <span className="stat-label" style={{ fontSize: '0.7rem' }}>総合判定</span>
                        <span className="stat-val" style={{ fontSize: '1.1rem', color: selectedResult.isHighStress ? '#ea580c' : '#16a34a', fontWeight: 700 }}>
                          {selectedResult.isHighStress ? '高ストレス' : '通常範囲内'}
                        </span>
                      </div>
                    </div>

                    {/* レーダーチャートの表示 */}
                    <div style={{ maxWidth: '320px', margin: '0 auto 1.5rem' }}>
                      <Radar 
                        data={{
                          labels: ['仕事の量', '仕事の質', '仕事の裁量度', '職場の対人関係', '活気', 'イライラ感', '疲労感', '不安感', '抑うつ感', '身体愁訴', '上司のサポート', '同僚のサポート', '満足度'],
                          datasets: [
                            {
                              label: 'スコア（5段階、高いほど良好）',
                              data: [
                                selectedResult.subscales.jobQuantity,
                                selectedResult.subscales.jobQuality,
                                selectedResult.subscales.jobControl,
                                selectedResult.subscales.interpersonal,
                                selectedResult.subscales.vigor,
                                selectedResult.subscales.irritation,
                                selectedResult.subscales.fatigue,
                                selectedResult.subscales.anxiety,
                                selectedResult.subscales.depression,
                                selectedResult.subscales.somatic,
                                selectedResult.subscales.supervisorSupport,
                                selectedResult.subscales.colleagueSupport,
                                selectedResult.subscales.satisfaction,
                              ],
                              backgroundColor: 'rgba(30, 64, 175, 0.15)',
                              borderColor: 'rgb(30, 64, 175)',
                              pointBackgroundColor: 'rgb(30, 64, 175)',
                              pointBorderColor: '#fff',
                              borderWidth: 2,
                            }
                          ]
                        }}
                        options={{
                          scales: {
                            r: {
                              min: 0,
                              max: 5,
                              ticks: { stepSize: 1, display: false },
                              pointLabels: { font: { size: 9, weight: 'bold' } }
                            }
                          },
                          plugins: { legend: { display: false } }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 医師面接希望の申請フォーム回答データ */}
              <div className="mb-2" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px' }}>🩺 医師面接指導の希望状況</h4>
                
                <div style={{ padding: '12px', borderRadius: '6px', background: selectedResult.requestInterview ? '#eff6ff' : '#f8fafc', border: selectedResult.requestInterview ? '1px solid #bfdbfe' : '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: selectedResult.requestInterview ? '#1e40af' : '#475569', marginBottom: '8px' }}>
                    希望ステータス: {selectedResult.requestInterview ? '面接指導を希望する (要面談)' : '希望しない'}
                  </div>

                  {selectedResult.requestInterview && selectedResult.interviewDetails && (
                    <div style={{ fontSize: '0.85rem', lineHeight: '1.6' }} className="fade-in">
                      <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', marginBottom: '6px' }}>
                        <strong>📞 連絡先電話番号:</strong> {selectedResult.interviewDetails.phone}<br />
                        <strong>✉️ 連絡先メール:</strong> {selectedResult.interviewDetails.email}
                      </div>
                      <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', marginBottom: '6px' }}>
                        <strong>📅 面談希望日時スロット（第1〜第3希望）:</strong>
                        <ol style={{ paddingLeft: '20px', marginTop: '2px' }}>
                          <li>{selectedResult.interviewDetails.preferredSlots[0] || '未入力'}</li>
                          <li>{selectedResult.interviewDetails.preferredSlots[1] || '未入力'}</li>
                          <li>{selectedResult.interviewDetails.preferredSlots[2] || '未入力'}</li>
                        </ol>
                      </div>
                      <div>
                        <strong>💬 事前相談コメント / 産業医への相談内容:</strong>
                        <p style={{ background: 'white', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                          {selectedResult.interviewDetails.comments || '特になし'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4 pt-2" style={{ borderTop: '1px solid #e2e8f0' }}>
              <button className="btn btn-outline" onClick={() => setSelectedResult(null)}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-portal-container {
          width: 100%;
        }
        .admin-tabs {
          display: flex;
          border-bottom: 2px solid #e2e8f0;
          gap: 0.5rem;
          width: 100%;
        }
        .tab-btn {
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-muted);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
        }
        .tab-btn:hover {
          color: var(--primary);
        }
        .tab-btn.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }
        .tab-badge {
          background: var(--primary-light);
          color: white;
          font-size: 0.7rem;
          padding: 1px 6px;
          border-radius: 9999px;
          margin-left: 6px;
          font-weight: 700;
        }
        .badge-admin {
          background: #eff6ff;
          color: var(--primary);
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #bfdbfe;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 1rem;
          width: 100%;
        }
        .stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .stat-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 4px;
          text-align: center;
        }
        .stat-val {
          font-size: 1.5rem;
          font-weight: 800;
        }
        .consent-badge {
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-block;
          font-weight: 600;
        }
        .consent-badge.agreed {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #dcfce7;
        }
        .consent-badge.disagreed {
          background: #fff1f2;
          color: #e11d48;
          border: 1px solid #ffe4e6;
        }
        .masked-indicator {
          font-size: 0.75rem;
          color: #d97706;
          background: #fffbeb;
          border: 1px solid #fef3c7;
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          font-weight: 600;
        }
        .highstress-badge {
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-block;
          font-weight: 600;
        }
        .highstress-badge.yes {
          background: #fff7ed;
          color: #ea580c;
          border: 1px solid #ffedd5;
        }
        .highstress-badge.no {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #dcfce7;
        }
        .interview-badge {
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-block;
          font-weight: 600;
        }
        .interview-badge.yes {
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #dbeafe;
        }
        .interview-badge.no {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
        }
        
        /* モーダルオーバーレイ */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }
        .modal-content {
          animation: modalFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          border: 1px solid #cbd5e1;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
