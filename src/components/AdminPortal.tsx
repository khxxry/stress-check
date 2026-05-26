import React, { useState, useEffect } from 'react';
import { CorporateUser, CampaignSettings, ConsentSettings, InterviewSettings, ExamineeResult, Employee } from '../types';
import { EmployeeManager } from './EmployeeManager';
import { Radar, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title
} from 'chart.js';
import { Settings, ClipboardList, Users, ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert, Search, X, Lock, Check, AlertCircle, RefreshCw, Mail, Download, BarChart2, Building2, PlusCircle } from 'lucide-react';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title
);

interface AdminPortalProps {
  onNotify: (message: string, type: 'success' | 'error') => void;
}

interface CampaignHistoryItem {
  campaignName: string;
  startDate: string;
  endDate: string;
  customNoticeStart: string;
  customNoticeHighStress: string;
  useConsent: boolean;
  discloseLabel: string;
  discloseNotice: string;
  consentTiming: 'before' | 'after';
  displayCondition: 'all' | 'high_stress_only' | 'recommended_only' | 'disabled';
  requireDisclosure: 'required' | 'optional' | 'none';
  receptionDays: number;
  notificationEmails: string;
  status: 'preparing' | 'active' | 'finished';
}


export const AdminPortal: React.FC<AdminPortalProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<'wizard' | 'results' | 'employees'>('wizard');
  const [resultsSubTab, setResultsSubTab] = useState<'list' | 'dashboard' | 'history'>('list');
  const [selectedCampaignName, setSelectedCampaignName] = useState<string>('');
  const [campaignHistory, setCampaignHistory] = useState<CampaignHistoryItem[]>([]);
  const [isCampaignDetailsOpen, setIsCampaignDetailsOpen] = useState<boolean>(false);
  const [isDevConsoleOpen, setIsDevConsoleOpen] = useState<boolean>(false);
  
  // ==========================================
  // 0. テナント・企業管理者コンテキスト
  // ==========================================
  const [corporateUsers, setCorporateUsers] = useState<CorporateUser[]>([]);
  const [activeUser, setActiveUser] = useState<CorporateUser | null>(null);

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

  // 実施セットアップウィザードモードの制御
  const [isWizardMode, setIsWizardMode] = useState<boolean>(false);

  // ==========================================
  // 2. 受検結果一覧状態
  // ==========================================
  const [results, setResults] = useState<ExamineeResult[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [resultSearchTerm, setResultSearchTerm] = useState('');
  const [resultsCurrentPage, setResultsCurrentPage] = useState(1);
  const [resultsItemsPerPage, setResultsItemsPerPage] = useState(20);

  // 検索条件やユーザーが切り替わったときにページ数を1にリセット
  useEffect(() => {
    setResultsCurrentPage(1);
  }, [resultSearchTerm, activeUser]);

  const [selectedResult, setSelectedResult] = useState<ExamineeResult | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);



  // ==========================================
  // 4. 組織分析ダッシュボード状態
  // ==========================================
  const [selectedDept, setSelectedDept] = useState<string>('');

  // ==========================================
  // 5. 催促メールシミュレーター状態
  // ==========================================
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [reminderTargetCount, setReminderTargetCount] = useState(0);
  const [isReminding, setIsReminding] = useState(false);
  const [reminderProgress, setReminderProgress] = useState(0);
  const [reminderCurrentName, setReminderCurrentName] = useState('');

  // ログイン認証用の入力状態
  const [loginCorpId, setLoginCorpId] = useState('');
  const [loginUserId, setLoginUserId] = useState('');
  const [loginError, setLoginError] = useState('');

  // 1. 初回マウント時に企業管理者リストをロード（初期ログイン状態は null / 未ログイン）
  useEffect(() => {
    const storedUsers = localStorage.getItem('stress_check_corporate_users');
    let usersList: CorporateUser[] = [];
    if (storedUsers) {
      usersList = JSON.parse(storedUsers);
      setCorporateUsers(usersList);
    }
  }, []);

  // 企業管理者ログイン処理
  const handleCorporateLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginCorpId.trim()) {
      setLoginError('企業コードを入力してください。');
      return;
    }
    if (!loginUserId.trim()) {
      setLoginError('ユーザーIDを入力してください。');
      return;
    }

    const corpCode = loginCorpId.trim().toUpperCase();
    const uId = loginUserId.trim();

    // 1. 企業存在チェック
    const storedCorps = localStorage.getItem('stress_check_corporations');
    const corps = storedCorps ? JSON.parse(storedCorps) : [];
    const foundCorp = corps.find((c: any) => c.corporationId === corpCode);

    if (!foundCorp) {
      setLoginError('入力された企業コードが見つかりません。');
      return;
    }

    if (foundCorp.status === 'suspended') {
      setLoginError('この企業の契約は現在一時停止されています。システム管理者にお問い合わせください。');
      return;
    }

    // 2. ユーザー存在チェック
    const storedUsers = localStorage.getItem('stress_check_corporate_users');
    const users = storedUsers ? JSON.parse(storedUsers) : [];
    const foundUser = users.find((u: any) => u.corporationId === corpCode && u.userId === uId);

    if (!foundUser) {
      setLoginError('ユーザーIDが見つかりません。または所属企業が一致しません。');
      return;
    }

    if (foundUser.status === 'inactive') {
      setLoginError('このユーザーアカウントは現在無効化されています。');
      return;
    }

    // ログイン成功
    setActiveUser(foundUser);
    onNotify(`${foundCorp.name}の${foundUser.name}様としてログインしました。`, 'success');
  };

  // デモ用かんたんログインバイパス
  const handleDemoLogin = (corpCode: string, uId: string) => {
    setLoginError('');
    
    const storedCorps = localStorage.getItem('stress_check_corporations');
    const corps = storedCorps ? JSON.parse(storedCorps) : [];
    const foundCorp = corps.find((c: any) => c.corporationId === corpCode);

    const storedUsers = localStorage.getItem('stress_check_corporate_users');
    const users = storedUsers ? JSON.parse(storedUsers) : [];
    const foundUser = users.find((u: any) => u.corporationId === corpCode && u.userId === uId);

    if (foundCorp && foundUser) {
      setActiveUser(foundUser);
      onNotify(`${foundCorp.name}の${foundUser.name}様としてログインしました（デモ）。`, 'success');
    } else {
      setLoginError('デモデータの初期化に問題があります。システム管理者ポータルで企業・管理者を登録してください。');
    }
  };

  // ログアウト処理
  const handleCorporateLogout = () => {
    setActiveUser(null);
    setLoginCorpId('');
    setLoginUserId('');
    setLoginError('');
    onNotify('ログアウトしました。', 'success');
  };

  // 2. アクティブユーザー（テナント）が切り替わったときに設定とデータをリロード
  useEffect(() => {
    if (!activeUser) return;
    const corpId = activeUser.corporationId;

    // A. 設定のロード
    const storedCampaign = localStorage.getItem(`stress_check_campaign_${corpId}`);
    if (storedCampaign) {
      const camp: CampaignSettings = JSON.parse(storedCampaign);
      setCampaignName(camp.campaignName);
      setStartDate(camp.startDate);
      setEndDate(camp.endDate);
      setCustomNoticeStart(camp.customNoticeStart);
      setCustomNoticeHighStress(camp.customNoticeHighStress);
    } else {
      setCampaignName('2026年度 春期定期ストレスチェック');
      setStartDate('2026-05-25T10:00');
      setEndDate('2026-06-08T18:00');
      setCustomNoticeStart('厚生労働省の標準「職業性ストレス簡易調査票（57項目）」に準拠した、あなたのストレス状態を評価する診断です。');
      setCustomNoticeHighStress('厚生労働省が定める高ストレス判定基準に基づき、ストレスの負荷が高い状態であると評価されました。ご自身の体調を第一に考え、必要に応じて管理者に相談の上、医師による面接指導をお申し込みいただくことをお勧めします。');
    }
    
    const storedConsent = localStorage.getItem(`stress_check_consent_${corpId}`);
    if (storedConsent) {
      const cons: ConsentSettings = JSON.parse(storedConsent);
      setUseConsent(cons.useConsent);
      setDiscloseLabel(cons.discloseLabel);
      setDiscloseNotice(cons.discloseNotice);
      setConsentTiming(cons.consentTiming);
    } else {
      setUseConsent(true);
      setDiscloseLabel('事業者');
      setDiscloseNotice('このストレスチェックは、個人情報保護方針に基づき実施されます。あなたの同意がある場合のみ、結果が事業者に共有されます。同意しないことで不利益な扱いを受けることは一切ありません。');
      setConsentTiming('after');
    }

    const storedInterview = localStorage.getItem(`stress_check_interview_${corpId}`);
    if (storedInterview) {
      const intv: InterviewSettings = JSON.parse(storedInterview);
      setDisplayCondition(intv.displayCondition);
      setRequireDisclosure(intv.requireDisclosure);
      setReceptionDays(intv.receptionDays);
      setNotificationEmails(intv.notificationEmails);
    } else {
      setDisplayCondition('high_stress_only');
      setRequireDisclosure('required');
      setReceptionDays(30);
      setNotificationEmails('admin@company.com');
    }

    // B. テナント分離された従業員・結果データのフィルタリングロード
    loadResultsAndEmployees(corpId);

    // C. 過去キャンペーン履歴のシードとロード
    const historyKey = `stress_check_campaign_history_${corpId}`;
    let history: CampaignHistoryItem[] = [];
    const storedHistory = localStorage.getItem(historyKey);
    if (storedHistory) {
      history = JSON.parse(storedHistory);
    } else {
      let currentCamp: CampaignSettings;
      if (storedCampaign) {
        currentCamp = JSON.parse(storedCampaign);
      } else {
        currentCamp = {
          campaignName: corpId === 'CORP002' ? 'グローバル営業 メンタルケア調査' : '令和8年度 春期定期ストレスチェック',
          startDate: '2026-05-26T09:31',
          endDate: '2026-06-09T10:31',
          customNoticeStart: corpId === 'CORP002' ? '営業職特有の労働負荷状況を捉え、安全かつ良好な業務姿勢を維持するための適性評価です。ご協力ください。' : '日頃のストレス状況を把握し、健康的なワークライフを送るためのチェックです。正直にお答えください（所要時間約5分）。',
          customNoticeHighStress: corpId === 'CORP002' ? '判定スコアに負荷の偏りが見受けられました。速やかに産業医面談などのカウンセリングを実施することをお勧めします。' : '判定の結果、ストレス反応が高い状態であることがわかりました。自身の心身の健康のため、医師面接等のセルフケアをご検討ください。',
          status: 'active'
        };
      }
      
      const currentConsent: ConsentSettings = storedConsent ? JSON.parse(storedConsent) : {
        useConsent: true,
        discloseLabel: corpId === 'CORP002' ? 'グローバル営業本部' : 'テクノロジーラボ',
        discloseNotice: corpId === 'CORP002' ? '本ストレスチェックの結果は、労働安全衛生法に基づき、あなたの同意がある場合に限り事業者に開示されます。' : '本ストレスチェックの結果は、労働安全衛生法に基づき、あなたの同意がある場合に限り事業者に開示されます。同意された場合、結果は職場環境の改善や必要に応じた産業医面談等の健康管理のために利用されます。',
        consentTiming: corpId === 'CORP002' ? 'before' : 'after'
      };

      const currentInterview: InterviewSettings = storedInterview ? JSON.parse(storedInterview) : {
        displayCondition: 'high_stress_only',
        requireDisclosure: 'required',
        receptionDays: corpId === 'CORP002' ? 30 : 14,
        notificationEmails: corpId === 'CORP002' ? 'admin@example.com' : 'sato@example.com'
      };

      history.push({
        campaignName: currentCamp.campaignName,
        startDate: currentCamp.startDate,
        endDate: currentCamp.endDate,
        customNoticeStart: currentCamp.customNoticeStart,
        customNoticeHighStress: currentCamp.customNoticeHighStress,
        useConsent: currentConsent.useConsent,
        discloseLabel: currentConsent.discloseLabel,
        discloseNotice: currentConsent.discloseNotice,
        consentTiming: currentConsent.consentTiming,
        displayCondition: currentInterview.displayCondition,
        requireDisclosure: currentInterview.requireDisclosure,
        receptionDays: currentInterview.receptionDays,
        notificationEmails: currentInterview.notificationEmails,
        status: 'active'
      });

      if (corpId === 'CORP001') {
        history.push({
          campaignName: '令和7年度 秋期定期ストレスチェック',
          startDate: '2025-10-15T09:00',
          endDate: '2025-10-30T18:00',
          customNoticeStart: '日頃のストレス状況を把握し、健康的なワークライフを送るための令和7年度秋期定期ストレスチェックです。',
          customNoticeHighStress: '判定の結果、ストレス反応が高い状態であることがわかりました。自身の心身の健康のため、医師面接等のセルフケアをご検討ください。',
          useConsent: true,
          discloseLabel: 'テクノロジーラボ',
          discloseNotice: '本ストレスチェックの結果は、労働安全衛生法に基づき、あなたの同意がある場合に限り事業者に開示されます。',
          consentTiming: 'after',
          displayCondition: 'high_stress_only',
          requireDisclosure: 'required',
          receptionDays: 30,
          notificationEmails: 'sato@example.com',
          status: 'finished'
        });

        history.push({
          campaignName: '令和7年度 春期定期ストレスチェック',
          startDate: '2025-05-12T09:00',
          endDate: '2025-05-26T18:00',
          customNoticeStart: '日頃のストレス状況を把握し、健康的なワークライフを送るための令和7年度春期定期ストレスチェックです。',
          customNoticeHighStress: '判定の結果、ストレス反応が高い状態であることがわかりました。自身の心身の健康のため、医師面接等のセルフケアをご検討ください。',
          useConsent: true,
          discloseLabel: 'テクノロジーラボ',
          discloseNotice: '本ストレスチェックの結果は、労働安全衛生法に基づき、あなたの同意がある場合に限り事業者に開示されます。',
          consentTiming: 'after',
          displayCondition: 'high_stress_only',
          requireDisclosure: 'required',
          receptionDays: 30,
          notificationEmails: 'sato@example.com',
          status: 'finished'
        });
      } else if (corpId === 'CORP002') {
        history.push({
          campaignName: '令和7年度 秋期定期ストレスチェック',
          startDate: '2025-10-15T09:00',
          endDate: '2025-10-30T18:00',
          customNoticeStart: '営業職特有の労働負荷状況を捉え、安全かつ良好な業務姿勢を維持するための適性評価です。',
          customNoticeHighStress: '判定スコアに負荷の偏りが見受けられました。速やかに産業医面談などのカウンセリングを実施することをお勧めします。',
          useConsent: true,
          discloseLabel: 'グローバル営業本部',
          discloseNotice: '本ストレスチェックの結果は、労働安全衛生法に基づき、あなたの同意がある場合に限り事業者に開示されます。',
          consentTiming: 'before',
          displayCondition: 'high_stress_only',
          requireDisclosure: 'required',
          receptionDays: 30,
          notificationEmails: 'admin@example.com',
          status: 'finished'
        });
      }
      
      localStorage.setItem(historyKey, JSON.stringify(history));
    }
    
    setCampaignHistory(history);
    const activeCamp = history.find(c => c.status === 'active') || history[0];
    setSelectedCampaignName(activeCamp ? activeCamp.campaignName : '');
  }, [activeUser]);

  const loadResultsAndEmployees = (corpId: string) => {
    const storedEmployees = localStorage.getItem('stress_check_employees');
    if (storedEmployees) {
      const allEmps: Employee[] = JSON.parse(storedEmployees);
      const filteredEmps = allEmps.filter(e => e.corporationId === corpId);
      setEmployees(filteredEmps);
    } else {
      setEmployees([]);
    }

    const storedResults = localStorage.getItem('stress_check_results');
    if (storedResults) {
      const allResults: ExamineeResult[] = JSON.parse(storedResults);
      const filteredResults = allResults.filter(r => r.corporationId === corpId);
      setResults(filteredResults);
    } else {
      setResults([]);
    }
  };

  // タブ切り替え時にリフレッシュ
  useEffect(() => {
    if (activeTab === 'results' && activeUser) {
      loadResultsAndEmployees(activeUser.corporationId);
    }
  }, [activeTab, activeUser]);

  // 設定の保存
  const handleSaveSettings = () => {
    if (!activeUser) return;
    const corpId = activeUser.corporationId;

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

    const campaign: CampaignSettings = {
      campaignName: campaignName.trim(),
      startDate,
      endDate,
      customNoticeStart: customNoticeStart.trim(),
      customNoticeHighStress: customNoticeHighStress.trim(),
      status: 'active'
    };
    localStorage.setItem(`stress_check_campaign_${corpId}`, JSON.stringify(campaign));

    const consent: ConsentSettings = {
      useConsent,
      discloseLabel: discloseLabel.trim(),
      discloseNotice: discloseNotice.trim(),
      consentTiming
    };
    localStorage.setItem(`stress_check_consent_${corpId}`, JSON.stringify(consent));

    const interview: InterviewSettings = {
      displayCondition,
      requireDisclosure,
      receptionDays,
      notificationEmails: notificationEmails.trim()
    };
    localStorage.setItem(`stress_check_interview_${corpId}`, JSON.stringify(interview));

    // 過去履歴のactive項目も更新
    const historyKey = `stress_check_campaign_history_${corpId}`;
    const storedHistory = localStorage.getItem(historyKey);
    if (storedHistory) {
      let hist: CampaignHistoryItem[] = JSON.parse(storedHistory);
      let activeIndex = hist.findIndex(c => c.status === 'active');
      const updatedActiveItem: CampaignHistoryItem = {
        campaignName: campaignName.trim(),
        startDate,
        endDate,
        customNoticeStart: customNoticeStart.trim(),
        customNoticeHighStress: customNoticeHighStress.trim(),
        useConsent,
        discloseLabel: discloseLabel.trim(),
        discloseNotice: discloseNotice.trim(),
        consentTiming,
        displayCondition,
        requireDisclosure,
        receptionDays,
        notificationEmails: notificationEmails.trim(),
        status: 'active'
      };

      if (activeIndex !== -1) {
        hist[activeIndex] = updatedActiveItem;
      } else {
        hist.unshift(updatedActiveItem);
      }
      localStorage.setItem(historyKey, JSON.stringify(hist));
      setCampaignHistory(hist);
      
      if (selectedCampaignName === '' || selectedCampaignName === (hist[activeIndex]?.campaignName || '')) {
        setSelectedCampaignName(campaignName.trim());
      }
    }

    onNotify('設定がLocalStorageに保存され、キャンペーンが有効化されました！', 'success');
    setSelectedCampaignName(campaignName.trim()); // 新規作成されたキャンペーンを自動選択する
    setAdminStep(1); 
    setIsWizardMode(false); // ウィザードモードを終了する
  };

  // ==========================================
  // 健康経営調査用データCSV出力機能
  // ==========================================
  const handleExportMETICSV = () => {
    // 選択された回号でフィルタリングされた受検結果
    const campaignResults = results.filter(r => r.campaignName === selectedCampaignName);

    // 統計計算
    const totalActive = employees.filter(e => e.status === 'active').length;
    const completed = campaignResults.length;
    const rate = totalActive > 0 ? ((completed / totalActive) * 100).toFixed(1) : '0';

    // 性別受検率
    const activeMale = employees.filter(e => e.status === 'active' && e.gender === 'male').length;
    const completedMale = campaignResults.filter(r => {
      const emp = employees.find(e => e.employeeCode === r.employeeCode);
      return emp?.gender === 'male';
    }).length;
    const maleRate = activeMale > 0 ? ((completedMale / activeMale) * 100).toFixed(1) : '0';

    const activeFemale = employees.filter(e => e.status === 'active' && e.gender === 'female').length;
    const completedFemale = campaignResults.filter(r => {
      const emp = employees.find(e => e.employeeCode === r.employeeCode);
      return emp?.gender === 'female';
    }).length;
    const femaleRate = activeFemale > 0 ? ((completedFemale / activeFemale) * 100).toFixed(1) : '0';

    // 年代計算用
    const ageBrackets: Record<string, number> = { '20代以下': 0, '30代': 0, '40代': 0, '50代': 0, '60代以上': 0 };
    campaignResults.forEach(res => {
      const emp = employees.find(e => e.employeeCode === res.employeeCode);
      if (emp && emp.birthDate) {
        const age = new Date().getFullYear() - new Date(emp.birthDate).getFullYear();
        if (age < 30) ageBrackets['20代以下']++;
        else if (age < 40) ageBrackets['30代']++;
        else if (age < 50) ageBrackets['40代']++;
        else if (age < 60) ageBrackets['50代']++;
        else ageBrackets['60代以上']++;
      }
    });

    const highStressRate = completed > 0 ? ((highStressCount / completed) * 100).toFixed(1) : '0';

    // CSV文字列構築
    let csvContent = '\uFEFF'; // Excel文字化け防止 of BOM
    csvContent += '健康経営度調査提出用 統計データ出力レポート\n';
    csvContent += `キャンペーン名,${selectedCampaignName}\n`;
    csvContent += `抽出日付,${new Date().toLocaleDateString()}\n\n`;
    
    csvContent += '■ 基礎統計項目\n';
    csvContent += `常時使用する従業員数（アクティブ） (人),${totalActive}\n`;
    csvContent += `ストレスチェック受検者数 (人),${completed}\n`;
    csvContent += `全体受検率 (%),${rate}\n`;
    csvContent += `男性受検率 (%),${maleRate}\n`;
    csvContent += `女性受検率 (%),${femaleRate}\n`;
    csvContent += `高ストレス該当割合 (%),${highStressRate}\n\n`;

    csvContent += '■ 年代別受検分布 (完了数)\n';
    for (const [bracket, count] of Object.entries(ageBrackets)) {
      csvContent += `${bracket},${count} 人\n`;
    }
    
    // CSVダウンロードトリガー
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `meti_health_survey_${campaignName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify('健康経営度調査統計CSVファイルをダウンロードしました。', 'success');
  };

  // ==========================================
  // 未受検者催促シミュレーター
  // ==========================================
  const getNonParticipants = () => {
    return employees.filter(emp => {
      if (emp.status !== 'active') return false;
      const completed = results.some(res => res.employeeCode === emp.employeeCode);
      return !completed;
    });
  };

  const handleOpenReminder = () => {
    const targets = getNonParticipants();
    setReminderTargetCount(targets.length);
    if (targets.length === 0) {
      onNotify('未受検の従業員は存在しません。全員の受検が完了しています。', 'success');
      return;
    }
    setIsReminderOpen(true);
  };

  const handleStartReminderSimulation = () => {
    const targets = getNonParticipants();
    if (targets.length === 0) return;

    setIsReminding(true);
    setReminderProgress(0);

    let idx = 0;
    const sendNext = () => {
      if (idx < targets.length) {
        setReminderCurrentName(targets[idx].name);
        setReminderProgress(Math.round(((idx + 1) / targets.length) * 100));
        idx++;
        setTimeout(sendNext, 1200); // 1.2秒おきに送信をアニメーション
      } else {
        // 送信終了
        setTimeout(() => {
          setIsReminding(false);
          setIsReminderOpen(false);
          onNotify(`${targets.length} 名の未受検者へ催促メールを配信しました（シミュレーション完了）。`, 'success');
        }, 800);
      }
    };

    sendNext();
  };

  // ==========================================
  // 組織分析ダッシュボード
  // ==========================================

  // 部署リスト
  const departments = Array.from(new Set(employees.filter(e => e.status === 'active').map(e => e.department || '一般')));

  // 部署別統計算出
  const getDeptStats = (deptName: string) => {
    const deptEmployees = employees.filter(e => e.status === 'active' && e.department === deptName);
    const campaignResults = results.filter(r => r.campaignName === selectedCampaignName);
    const deptResults = campaignResults.filter(r => {
      const emp = employees.find(e => e.employeeCode === r.employeeCode);
      return emp && emp.department === deptName;
    });

    const completed = deptResults.length;
    const active = deptEmployees.length;
    const rate = active > 0 ? Math.round((completed / active) * 100) : 0;
    const highStress = deptResults.filter(r => r.isHighStress).length;
    
    // 平均スコア算出
    let avgStressor = 0;
    let avgReaction = 0;
    let avgSupport = 0;
    
    if (completed > 0) {
      // 10名以上の開示合意された結果平均
      const disclosedResults = deptResults.filter(r => r.consentDisclose);
      if (disclosedResults.length > 0) {
        // ストレス要因平均 (jobQuantity, jobQuality, jobControl, interpersonal, satisfaction, environment)
        const totalStressor = disclosedResults.reduce((sum, res) => {
          return sum + (
            res.subscales.jobQuantity +
            res.subscales.jobQuality +
            res.subscales.jobControl +
            res.subscales.interpersonal +
            res.subscales.satisfaction
          ) / 5;
        }, 0);
        avgStressor = parseFloat((totalStressor / disclosedResults.length).toFixed(1));

        // ストレス反応平均 (vigor, irritation, fatigue, anxiety, depression, somatic)
        const totalReaction = disclosedResults.reduce((sum, res) => {
          return sum + (
            res.subscales.vigor +
            res.subscales.irritation +
            res.subscales.fatigue +
            res.subscales.anxiety +
            res.subscales.depression +
            res.subscales.somatic
          ) / 6;
        }, 0);
        avgReaction = parseFloat((totalReaction / disclosedResults.length).toFixed(1));

        // サポート平均
        const totalSupport = disclosedResults.reduce((sum, res) => {
          return sum + (res.subscales.supervisorSupport + res.subscales.colleagueSupport) / 2;
        }, 0);
        avgSupport = parseFloat((totalSupport / disclosedResults.length).toFixed(1));
      }
    }

    return {
      completed,
      active,
      rate,
      highStress,
      avgStressor, // 高いほど良い (5段階)
      avgReaction,  // 高いほど良い (5段階)
      avgSupport   // 高いほど良い (5段階)
    };
  };

  // 受検詳細モーダルを開く
  const handleViewResultDetails = (result: ExamineeResult) => {
    const emp = employees.find(e => e.employeeCode === result.employeeCode) || null;
    setSelectedResult(result);
    setSelectedEmployee(emp);
  };

  // 選択された回号でフィルタリングされた受検結果
  const campaignFilteredResults = results.filter(r => r.campaignName === selectedCampaignName);

  // 選択された回号における対象者数（過去の回号では結果データの母数や適当な対象者数、現在の回号では現在のアクティブ従業員数）
  const getCampaignTotalEmployees = () => {
    if (selectedCampaignName === '令和7年度 秋期定期ストレスチェック') {
      return activeUser?.corporationId === 'CORP002' ? 4 : 50;
    }
    if (selectedCampaignName === '令和7年度 春期定期ストレスチェック') {
      return 48;
    }
    return employees.filter(e => e.status === 'active').length;
  };

  const totalEmployees = getCampaignTotalEmployees();
  const completedCount = campaignFilteredResults.length;
  const completionRate = totalEmployees > 0 ? Math.round((completedCount / totalEmployees) * 100) : 0;
  const highStressCount = campaignFilteredResults.filter(r => r.isHighStress).length;
  const interviewRequestCount = campaignFilteredResults.filter(r => r.requestInterview).length;

  const filteredResults = campaignFilteredResults.filter(res => {
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

  const resultsTotalPages = Math.ceil(filteredResults.length / resultsItemsPerPage);
  const paginatedResults = filteredResults.slice(
    (resultsCurrentPage - 1) * resultsItemsPerPage,
    resultsCurrentPage * resultsItemsPerPage
  );

  const selectedCampaignSettings = campaignHistory.find(c => c.campaignName === selectedCampaignName) || {
    campaignName: campaignName,
    startDate: startDate,
    endDate: endDate,
    customNoticeStart: customNoticeStart,
    customNoticeHighStress: customNoticeHighStress,
    useConsent: useConsent,
    discloseLabel: discloseLabel,
    discloseNotice: discloseNotice,
    consentTiming: consentTiming,
    displayCondition: displayCondition,
    requireDisclosure: requireDisclosure,
    receptionDays: receptionDays,
    notificationEmails: notificationEmails,
    status: 'active' as const
  };

  const displayStartDate = selectedCampaignSettings.startDate;
  const displayEndDate = selectedCampaignSettings.endDate;
  const displayCustomNoticeStart = selectedCampaignSettings.customNoticeStart;
  const displayCustomNoticeHighStress = selectedCampaignSettings.customNoticeHighStress;
  const displayUseConsent = selectedCampaignSettings.useConsent;
  const displayDiscloseLabel = selectedCampaignSettings.discloseLabel;
  const displayDiscloseNotice = selectedCampaignSettings.discloseNotice;
  const displayConsentTiming = selectedCampaignSettings.consentTiming;
  const displayConditionVal = selectedCampaignSettings.displayCondition;
  const displayRequireDisclosure = selectedCampaignSettings.requireDisclosure;
  const displayReceptionDays = selectedCampaignSettings.receptionDays;
  const displayNotificationEmails = selectedCampaignSettings.notificationEmails;

  if (activeUser === null) {
    return (
      <div className="admin-login-container fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: '60vh', padding: '1rem' }}>
        <div className="card login-card" style={{ maxWidth: '480px', padding: '2.5rem', background: 'var(--card-bg)', border: '1px solid rgba(255, 255, 255, 0.4)' }}>
          <div className="text-center mb-6">
            <div className="logo-badge mb-3" style={{ background: '#eff6ff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%' }}>
              <Building2 size={32} className="text-primary" style={{ color: 'var(--primary)' }} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>企業管理者ログイン</h2>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>ストレスチェック制度 管理者専用ポータル</p>
          </div>

          {loginError && (
            <div className="alert-badge error mb-4" style={{ borderRadius: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleCorporateLogin}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={14} className="text-muted" />
                企業コード
              </label>
              <input 
                type="text" 
                className="form-control" 
                value={loginCorpId}
                onChange={(e) => setLoginCorpId(e.target.value)}
                placeholder="例: CORP001"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} className="text-muted" />
                ユーザーID
              </label>
              <input 
                type="password" 
                className="form-control" 
                value={loginUserId}
                onChange={(e) => setLoginUserId(e.target.value)}
                placeholder="例: USER001"
              />
            </div>

            <button type="submit" className="btn btn-primary w-full mt-2" style={{ padding: '0.85rem', borderRadius: '8px' }}>
              安全なログイン
            </button>
          </form>

          <div className="divider-text" style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ height: '1px', background: '#cbd5e1', flex: 1 }}></span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>またはデモアカウントで検証</span>
            <span style={{ height: '1px', background: '#cbd5e1', flex: 1 }}></span>
          </div>

          <div className="demo-login-box" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button 
              type="button" 
              onClick={() => handleDemoLogin('CORP001', 'USER001')} 
              className="btn btn-outline w-full demo-login-btn"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bfdbfe', background: '#f0f9ff' }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e40af' }}>佐藤HR管理者としてログイン</span>
              <span style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 500 }}>テクノロジーラボ (CORP001) / 10名受検完了</span>
            </button>

            <button 
              type="button" 
              onClick={() => handleDemoLogin('CORP002', 'USER002')} 
              className="btn btn-outline w-full demo-login-btn"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fed7aa', background: '#fff7ed' }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#c2410c' }}>鈴木営業管理者としてログイン</span>
              <span style={{ fontSize: '0.7rem', color: '#fb923c', fontWeight: 500 }}>グローバル営業本部 (CORP002) / 3名受検完了</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal-container fade-in">
      {/* 開発・デモ検証用コンテキストスイッチャー */}
      {/* 開発・デモ検証用コンテキストスイッチャー */}
      <details 
        className="dev-tool-accordion mb-6" 
        style={{ width: '100%' }}
        open={isDevConsoleOpen}
        onToggle={(e) => setIsDevConsoleOpen(e.currentTarget.open)}
      >
        <summary className="dev-tool-summary cursor-pointer p-3 rounded-lg border flex items-center justify-between text-xs font-bold text-gray-500" style={{ background: '#f8fafc', borderColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', listStyle: 'none' }}>
          <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>🔧</span>
            <span>【デモ・動作検証用】テナント擬似切り替えツール</span>
          </div>
          <span className="toggle-indicator text-xs font-normal" style={{ color: 'var(--primary)' }}>
            {isDevConsoleOpen ? '詳細を閉じる ▴' : '詳細を展開 ▾'}
          </span>
        </summary>
        
        <div className="tenant-context-bar p-5 mt-2 rounded-xl border transition-all duration-300" style={{ background: 'var(--glass-bg)', borderColor: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            
            {/* 左側: 現在のアクティブ情報２行表示 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px', color: 'var(--primary)' }}>
                <Building2 size={24} />
              </div>
              <div style={{ fontSize: '0.82rem', lineHeight: '1.4' }}>
                <div style={{ color: '#475569', fontWeight: 600 }}>
                  現在アクティブ：<span style={{ fontWeight: 700, color: '#1e293b' }}>{(() => {
                    const storedCorps = localStorage.getItem('stress_check_corporations');
                    const corps = storedCorps ? JSON.parse(storedCorps) : [];
                    const c = corps.find((corp: any) => corp.corporationId === activeUser?.corporationId);
                    return c ? c.name : '未選択';
                  })()}</span>
                </div>
                <div style={{ color: '#64748b', fontWeight: 500 }}>
                  管理者　<span style={{ fontWeight: 700, color: '#1e293b' }}>{activeUser?.name || '未選択'}</span>　
                  <span style={{ 
                    fontWeight: 600, 
                    color: '#ffffff', 
                    background: (() => {
                      const storedCorps = localStorage.getItem('stress_check_corporations');
                      const corps = storedCorps ? JSON.parse(storedCorps) : [];
                      const c = corps.find((corp: any) => corp.corporationId === activeUser?.corporationId);
                      return c?.plan === 'premium' ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
                    })(),
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    marginLeft: '4px'
                  }}>
                    {(() => {
                      const storedCorps = localStorage.getItem('stress_check_corporations');
                      const corps = storedCorps ? JSON.parse(storedCorps) : [];
                      const c = corps.find((corp: any) => corp.corporationId === activeUser?.corporationId);
                      return c?.plan ? (c.plan.charAt(0).toUpperCase() + c.plan.slice(1)) : '';
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* 右側: セレクターと各種アクションボタン */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>クイック切り替え:</label>
              <select
                value={activeUser ? activeUser.userId : ''}
                onChange={(e) => {
                  const selected = corporateUsers.find(u => u.userId === e.target.value);
                  if (selected) {
                    setActiveUser(selected);
                    onNotify(`管理者コンテキストを「${selected.name}」に切り替えました。`, 'success');
                  }
                }}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  fontWeight: 600
                }}
              >
                {corporateUsers.map(user => (
                  <option key={user.userId} value={user.userId}>
                    {user.name} ({user.corporationId} - {user.role === 'admin' ? '実施管理者' : '共同閲覧者'})
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => {
                  if (window.confirm('すべてのローカルストレージデータを削除し、初期デモ状態にリセットしますか？\n※ページは自動的にリロードされます。')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="btn btn-outline"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  borderRadius: '6px',
                  borderColor: '#fca5a5',
                  color: '#dc2626',
                  background: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 700
                }}
              >
                <RefreshCw size={12} />
                デモ初期化
              </button>

              <button
                onClick={() => setIsDevConsoleOpen(false)}
                className="btn btn-outline"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  borderColor: '#cbd5e1',
                  color: '#475569',
                  background: '#f8fafc',
                  fontWeight: 700
                }}
              >
                <X size={12} style={{ marginRight: '2px' }} />
                コンソールを閉じる
              </button>
            </div>

          </div>
        </div>
      </details>

      {/* 管理者用インナータブナビゲーション */}
      <div className="admin-tabs mb-6 flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '2px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`tab-btn ${activeTab === 'wizard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('wizard'); setIsWizardMode(false); }}
            style={{ borderBottom: activeTab === 'wizard' ? '2px solid var(--primary)' : '2px solid transparent' }}
          >
            <Settings size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            実施管理設定
          </button>
          <button 
            className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
            style={{ borderBottom: activeTab === 'results' ? '2px solid var(--primary)' : '2px solid transparent' }}
          >
            <ClipboardList size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            受検結果トラッキング
            {campaignFilteredResults.length > 0 && <span className="tab-badge">{campaignFilteredResults.length}</span>}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => setActiveTab('employees')}
            style={{ borderBottom: activeTab === 'employees' ? '2px solid var(--primary)' : '2px solid transparent' }}
          >
            <Users size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            従業員マスタ管理
          </button>
        </div>

        {/* ログアウトボタン */}
        <button 
          onClick={handleCorporateLogout}
          className="btn btn-outline"
          style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Lock size={14} />
          ログアウト
        </button>
      </div>

      {/* ==========================================
          タブ1: 実施管理設定 (Dashboard - 履歴＆現在設定の一覧)
          ========================================== */}
      {activeTab === 'wizard' && !isWizardMode && (
        <div className="card fade-in" style={{ maxWidth: '1000px' }}>
          <div className="admin-header mb-6 flex justify-between items-center flex-wrap gap-4" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>ストレスチェック 実施管理設定</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>現在実施中のストレスチェック設定の確認、および過去のキャンペーン履歴を管理します。</p>
            </div>
            
            <button 
              onClick={() => {
                // 新規キャンペーン用にフォームを初期化
                setCampaignName('');
                setAdminStep(1);
                setIsWizardMode(true);
              }}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.6rem 1.2rem',
                fontSize: '0.88rem',
                borderRadius: '8px',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)',
                transition: 'all 0.2s ease',
              }}
            >
              <PlusCircle size={18} />
              新しいストレスチェックを新規開始
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
            
            {/* 左側: 現在実施中のストレスチェック設定 */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  🟢 現在アクティブな実施設定
                </h3>
                <span style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', fontWeight: 700, fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>
                  実施中
                </span>
              </div>

              {campaignHistory.find(c => c.status === 'active') ? (() => {
                const activeCamp = campaignHistory.find(c => c.status === 'active')!;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>キャンペーン名</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{activeCamp.campaignName}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>実施期間</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e3a8a' }}>
                        ⏰ {activeCamp.startDate.replace('T', ' ')} 〜 {activeCamp.endDate.replace('T', ' ')}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '4px' }}>
                      <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>開示同意フォーム</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
                          {activeCamp.useConsent ? `使用 (${activeCamp.discloseLabel})` : '不使用'}
                        </div>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>医師面接受付</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
                          {activeCamp.displayCondition === 'high_stress_only' ? '高ストレス者のみ' : activeCamp.displayCondition === 'all' ? '全員' : activeCamp.displayCondition === 'recommended_only' ? '面接勧奨のみ' : '不使用'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button 
                        onClick={() => {
                          // 現在の設定値をウィザードのステートに入れてウィザードモードを起動する（編集）
                          setCampaignName(activeCamp.campaignName);
                          setStartDate(activeCamp.startDate);
                          setEndDate(activeCamp.endDate);
                          setUseConsent(activeCamp.useConsent || false);
                          setDiscloseLabel(activeCamp.discloseLabel || '事業者');
                          setDiscloseNotice(activeCamp.discloseNotice || '');
                          setConsentTiming(activeCamp.consentTiming || 'after');
                          setDisplayCondition(activeCamp.displayCondition || 'high_stress_only');
                          setRequireDisclosure(activeCamp.requireDisclosure || 'required');
                          setReceptionDays(activeCamp.receptionDays || 30);
                          setNotificationEmails(activeCamp.notificationEmails || '');
                          
                          setAdminStep(1);
                          setIsWizardMode(true);
                        }}
                        className="btn btn-outline"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}
                      >
                        🔧 現在の設定を編集・更新する
                      </button>
                    </div>
                  </div>
                );
              })() : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span>📭 現在有効化されている実施設定はありません。</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>右上のボタンから新しいキャンペーンを開始してください。</span>
                </div>
              )}
            </div>

            {/* 右側: 過去のストレスチェック実施履歴 */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)' }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  📅 ストレスチェック実施履歴
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                {campaignHistory.length > 0 ? campaignHistory.map((item) => (
                  <div 
                    key={item.campaignName}
                    style={{ 
                      padding: '10px 12px', 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0', 
                      background: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.campaignName}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        📅 {item.startDate.replace('T', ' ')} 〜 {item.endDate.replace('T', ' ')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        background: item.status === 'active' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                        color: item.status === 'active' ? '#16a34a' : '#64748b'
                      }}>
                        {item.status === 'active' ? '実施中' : '終了'}
                      </span>
                      <button 
                        onClick={() => {
                          setSelectedCampaignName(item.campaignName);
                          setActiveTab('results');
                          setResultsSubTab('list');
                          onNotify(`「${item.campaignName}」の受検結果データを表示します。`, 'success');
                        }}
                        className="btn btn-outline"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'white' }}
                      >
                        データ ➔
                      </button>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', fontSize: '0.8rem' }}>
                    履歴データがありません。
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          タブ1の別モード: 実施セットアップ (Wizard形式で新規作成または編集)
          ========================================== */}
      {activeTab === 'wizard' && isWizardMode && (
        <div className="card admin-placeholder fade-in" style={{ maxWidth: '700px' }}>
          <div className="admin-header flex justify-between items-center" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>実施セットアップウィザード</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>新しくストレスチェックキャンペーンを作成し、各種フローを設計します。</p>
            </div>
            <button 
              onClick={() => setIsWizardMode(false)}
              className="btn btn-outline"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                borderRadius: '6px',
                fontWeight: 700
              }}
            >
              ◀ キャンセルして戻る
            </button>
          </div>

          <div className="wizard-steps mb-6">
            <div className={`wizard-step ${adminStep === 1 ? 'active' : ''}`}>
              <span className="wizard-step-num">1</span> 期間設定
            </div>
            <div className={`wizard-step ${adminStep === 2 ? 'active' : ''}`}>
              <span className="wizard-step-num">2</span> 対象者登録
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

          <div className="admin-step-content" style={{ minHeight: '320px' }}>
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
                  />
                  <div className="text-right text-muted" style={{ fontSize: '0.75rem' }}>{customNoticeHighStress.length}/400 文字</div>
                </div>
              </div>
            )}

            {/* ステップ2: 対象者インポート */}
            {adminStep === 2 && (
              <div className="admin-card fade-in">
                <h3 className="mb-4 text-primary" style={{ fontSize: '1.1rem', fontWeight: 700 }}>ステップ2: 受検対象者（CSVインポート / 個別追加）</h3>
                
                {/* 従業員マスタマネージャを再利用 */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>👥 現在登録されている受検対象者</h4>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                    ※ ストレスチェックを実施する前に、受検対象の全従業員をあらかじめ登録しておく必要があります。<br/>
                    ※ すでにマスタ登録が完了している場合は、そのまま次のステップへ進んでください。
                  </p>
                </div>

                <EmployeeManager activeCorpId={activeUser ? activeUser.corporationId : 'CORP001'} onNotify={onNotify} />
              </div>
            )}

            {adminStep === 3 && (
              <div className="admin-card fade-in">
                <h3 className="mb-4 text-primary" style={{ fontSize: '1.1rem', fontWeight: 700 }}>ステップ3: 結果開示同意フォーム設定</h3>
                
                <div className="form-group mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="useConsent"
                    checked={useConsent}
                    onChange={(e) => setUseConsent(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="useConsent" style={{ fontWeight: 700, cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                    結果開示同意フォームを有効化する (強く推奨)
                  </label>
                </div>

                {useConsent && (
                  <div className="fade-in p-4 mb-4" style={{ background: 'rgba(30, 64, 175, 0.03)', border: '1px dashed rgba(30, 64, 175, 0.15)', borderRadius: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">事業者の呼称 <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={discloseLabel}
                        onChange={(e) => setDiscloseLabel(e.target.value)}
                        placeholder="例: 事業者、株式会社テクノロジーラボ"
                      />
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>※ 同意文書内で表示される「同意先」の名称です。</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">同意確認メッセージ本文</label>
                      <textarea
                        className="form-control"
                        rows={4}
                        value={discloseNotice}
                        onChange={(e) => setDiscloseNotice(e.target.value)}
                        placeholder="開示同意に関する説明や個人情報保護方針を入力してください。"
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">同意を求めるタイミング</label>
                      <div className="flex gap-4">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="consentTiming"
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
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ステップ4: 医師面接 */}
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
                    <option value="recommended_only">面接勧奨者にのみ表示</option>
                    <option value="disabled">使用しない</option>
                  </select>
                </div>

                {displayCondition !== 'disabled' && (
                  <div className="interview-sub-fields fade-in mt-4" style={{ background: 'rgba(30, 64, 175, 0.03)', border: '1px dashed rgba(30, 64, 175, 0.15)', borderRadius: '8px', padding: '1.25rem' }}>
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
                        placeholder="例: admin@company.com"
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
        <div className="card fade-in" style={{ maxWidth: '1050px' }}>
          <div className="admin-header mb-6 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>受検結果トラッキング ＆ 分析</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>受検対象従業員の進捗状況および集計結果をリアルタイムで追跡します。</p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={handleExportMETICSV} 
                className="btn btn-outline" 
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                title="健康経営度調査用CSVのダウンロード"
              >
                <Download size={14} style={{ marginRight: '6px' }} />
                健康経営CSV出力
              </button>
              <button 
                onClick={handleOpenReminder} 
                className="btn btn-outline" 
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
              >
                <Mail size={14} style={{ marginRight: '6px' }} />
                未受検者へ催促
              </button>
            </div>
          </div>

          {/* 実施管理設定レビューパネル (アコーディオン) */}
          <details 
            className="campaign-details-accordion mb-6" 
            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}
            open={isCampaignDetailsOpen}
            onToggle={(e) => setIsCampaignDetailsOpen(e.currentTarget.open)}
          >
            <summary 
              className="cursor-pointer p-4 flex items-center justify-between"
              style={{ listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>📋 表示対象の回号:</span>
                  <select
                    value={selectedCampaignName}
                    onChange={(e) => {
                      setSelectedCampaignName(e.target.value);
                      onNotify(`表示データを「${e.target.value}」に切り替えました。`, 'success');
                    }}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.85rem',
                      borderRadius: '6px',
                      border: '1.5px solid #2563eb',
                      background: 'white',
                      fontWeight: 700,
                      color: '#2563eb',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: '0 1px 3px rgba(37, 99, 235, 0.05)'
                    }}
                  >
                    {campaignHistory.map((item) => (
                      <option key={item.campaignName} value={item.campaignName}>
                        {item.campaignName} {item.status === 'active' ? '🟢 (実施中)' : '⚫ (期間終了)'}
                      </option>
                    ))}
                  </select>
                </div>
                <span style={{ color: '#64748b', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  ⏰ 実施期間: <span style={{ color: '#1e3a8a', fontWeight: 600 }}>{displayStartDate.replace('T', ' ')} 〜 {displayEndDate.replace('T', ' ')}</span>
                </span>
              </div>
              <span 
                className="btn btn-outline" 
                style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px', fontWeight: 700, borderColor: '#cbd5e1', color: '#475569', background: '#f8fafc' }}
              >
                {isCampaignDetailsOpen ? '詳細設定を閉じる ▴' : '詳細設定を展開 ▾'}
              </span>
            </summary>

            <div 
              style={{ padding: '1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(255, 255, 255, 0.6)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                
                {/* 同意フォーム設定レビュー */}
                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={15} />
                    結果開示同意フォーム設定
                  </h4>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 0', color: '#64748b', width: '120px' }}>開示同意フォーム</td>
                        <td style={{ padding: '6px 0', fontWeight: 600 }}>{displayUseConsent ? '使用する' : '使用しない'}</td>
                      </tr>
                      {displayUseConsent && (
                        <>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 0', color: '#64748b' }}>事業者の呼称</td>
                            <td style={{ padding: '6px 0', fontWeight: 600 }}>{displayDiscloseLabel}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 0', color: '#64748b' }}>同意タイミング</td>
                            <td style={{ padding: '6px 0', fontWeight: 600 }}>{displayConsentTiming === 'before' ? '受検開始前' : '受検完了直後'}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '6px 0', color: '#64748b', verticalAlign: 'top' }}>説明文面</td>
                            <td style={{ padding: '6px 0', fontSize: '0.75rem', color: '#475569', lineHeight: '1.4' }}>{displayDiscloseNotice}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 医師面接受付設定レビュー */}
                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={15} />
                    医師面接指導受付フォーム設定
                  </h4>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 0', color: '#64748b', width: '120px' }}>面接申込の表示対象</td>
                        <td style={{ padding: '6px 0', fontWeight: 600 }}>
                          {displayConditionVal === 'high_stress_only' ? '高ストレス者のみ' : 
                           displayConditionVal === 'all' ? '全員' : 
                           displayConditionVal === 'recommended_only' ? '面接勧奨者のみ' : '使用しない'}
                        </td>
                      </tr>
                      {displayConditionVal !== 'disabled' && (
                        <>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 0', color: '#64748b' }}>結果開示の取得方針</td>
                            <td style={{ padding: '6px 0', fontWeight: 600 }}>
                              {displayRequireDisclosure === 'required' ? '事業者への結果開示同意を必須とする' : 
                               displayRequireDisclosure === 'optional' ? '開示同意は任意とする' : '開示同意は不要'}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 0', color: '#64748b' }}>面接申込受付期間</td>
                            <td style={{ padding: '6px 0', fontWeight: 600 }}>キャンペーン終了翌日から {displayReceptionDays} 日間</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '6px 0', color: '#64748b' }}>自動通知メール先</td>
                            <td style={{ padding: '6px 0', fontWeight: 600, color: 'var(--primary)', wordBreak: 'break-all' }}>{displayNotificationEmails}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 案内・説明文面レビュー */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>受検開始案内の説明文面</h5>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.5', margin: 0 }}>{displayCustomNoticeStart}</p>
                </div>
                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>高ストレス判定時の案内文面</h5>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.5', margin: 0 }}>{displayCustomNoticeHighStress}</p>
                </div>
              </div>
            </div>
          </details>

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

          {/* タブ切り替え（対象回号の下に配置。よりタブらしいプレミアムデザイン） */}
          <div className="mb-4" style={{ borderBottom: '2px solid #e2e8f0', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <button 
              className={`tab-item ${resultsSubTab === 'list' ? 'active' : ''}`}
              onClick={() => setResultsSubTab('list')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: resultsSubTab === 'list' ? '3px solid #2563eb' : '3px solid transparent',
                color: resultsSubTab === 'list' ? '#2563eb' : '#64748b',
                fontWeight: resultsSubTab === 'list' ? 700 : 500,
                padding: '12px 8px',
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '-2px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>📊</span> 受検結果一覧
            </button>
            <button 
              className={`tab-item ${resultsSubTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setResultsSubTab('dashboard'); loadResultsAndEmployees(activeUser ? activeUser.corporationId : 'CORP001'); }}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: resultsSubTab === 'dashboard' ? '3px solid #2563eb' : '3px solid transparent',
                color: resultsSubTab === 'dashboard' ? '#2563eb' : '#64748b',
                fontWeight: resultsSubTab === 'dashboard' ? 700 : 500,
                padding: '12px 8px',
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '-2px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🏢</span> 組織分析ダッシュボード
            </button>
            <button 
              className={`tab-item ${resultsSubTab === 'history' ? 'active' : ''}`}
              onClick={() => setResultsSubTab('history')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: resultsSubTab === 'history' ? '3px solid #2563eb' : '3px solid transparent',
                color: resultsSubTab === 'history' ? '#2563eb' : '#64748b',
                fontWeight: resultsSubTab === 'history' ? 700 : 500,
                padding: '12px 8px',
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '-2px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>📅</span> 実施履歴・回号選択
            </button>
          </div>

          {/* 2.1 受検結果一覧サブタブ */}
          {resultsSubTab === 'list' && (
            <div className="fade-in">
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
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>氏名 / 部署</th>
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
                      paginatedResults.map((res) => {
                        const emp = employees.find(e => e.employeeCode === res.employeeCode);
                        const name = emp ? emp.name : 'ゲスト受検者';
                        const dept = emp ? emp.department : '未割り当て';
                        
                        return (
                          <tr key={res.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row">
                            <td style={{ padding: '12px 16px', fontWeight: 600, fontFamily: 'monospace' }}>{res.employeeCode}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 500 }}>{name}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{dept}</div>
                            </td>
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
                                  {res.isHighStress ? '高ストレス' : '通常範囲内'}
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

                {/* ページネーションコントロールバー */}
                {filteredResults.length > 0 && (
                  <div className="pagination-bar flex items-center justify-between p-4 border-t border-gray-200" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div className="text-muted" style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                      全 <strong>{filteredResults.length}</strong> 件中 <strong>{filteredResults.length === 0 ? 0 : (resultsCurrentPage - 1) * resultsItemsPerPage + 1}〜{Math.min(filteredResults.length, resultsCurrentPage * resultsItemsPerPage)}</strong> 件を表示
                    </div>

                    <div className="flex gap-4 items-center" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* ページサイズセレクター */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <span>表示件数:</span>
                        <select
                          value={resultsItemsPerPage}
                          onChange={(e) => {
                            setResultsItemsPerPage(Number(e.target.value));
                            setResultsCurrentPage(1);
                          }}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 600, outline: 'none' }}
                        >
                          <option value={10}>10 件</option>
                          <option value={20}>20 件</option>
                          <option value={50}>50 件</option>
                          <option value={100}>100 件</option>
                        </select>
                      </div>

                      {/* ページ選択ボタン */}
                      {resultsTotalPages > 1 && (
                        <div className="flex gap-1" style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="pagination-btn"
                            disabled={resultsCurrentPage === 1}
                            onClick={() => setResultsCurrentPage(resultsCurrentPage - 1)}
                            style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', cursor: resultsCurrentPage === 1 ? 'not-allowed' : 'pointer', opacity: resultsCurrentPage === 1 ? 0.5 : 1, fontSize: '0.8rem', fontWeight: 700 }}
                          >
                            前へ
                          </button>
                          
                          {Array.from({ length: resultsTotalPages }, (_, i) => i + 1).map(pageNum => (
                            <button
                              key={pageNum}
                              className={`pagination-btn ${resultsCurrentPage === pageNum ? 'active' : ''}`}
                              onClick={() => setResultsCurrentPage(pageNum)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '4px',
                                border: '1px solid',
                                borderColor: resultsCurrentPage === pageNum ? 'var(--primary)' : '#cbd5e1',
                                background: resultsCurrentPage === pageNum ? 'linear-gradient(135deg, var(--primary) 0%, #1e3a8a 100%)' : 'white',
                                color: resultsCurrentPage === pageNum ? 'white' : 'var(--text-main)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.8rem'
                              }}
                            >
                              {pageNum}
                            </button>
                          ))}

                          <button
                            className="pagination-btn"
                            disabled={resultsCurrentPage === resultsTotalPages}
                            onClick={() => setResultsCurrentPage(resultsCurrentPage + 1)}
                            style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', cursor: resultsCurrentPage === resultsTotalPages ? 'not-allowed' : 'pointer', opacity: resultsCurrentPage === resultsTotalPages ? 0.5 : 1, fontSize: '0.8rem', fontWeight: 700 }}
                          >
                            次へ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2.2 組織分析ダッシュボードサブタブ (法的基準10名未満ロック) */}
          {resultsSubTab === 'dashboard' && (
            <div className="fade-in">
              <h3 className="mb-4" style={{ fontSize: '1.05rem', fontWeight: 800 }}>部署別 ストレス分析一覧</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {departments.map(dept => {
                  const stats = getDeptStats(dept);
                  return (
                    <div 
                      key={dept} 
                      className={`stat-card text-left ${selectedDept === dept ? 'selected-dept-card' : ''}`}
                      onClick={() => setSelectedDept(dept)}
                      style={{ cursor: 'pointer', padding: '1rem', border: selectedDept === dept ? '2px solid var(--primary)' : '1px solid #e2e8f0', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                    >
                      <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '8px' }}>{dept}</h4>
                      <div className="text-muted" style={{ fontSize: '0.8rem' }}>対象社員数: {stats.active} 名</div>
                      <div className="text-muted" style={{ fontSize: '0.8rem' }}>受検完了数: <strong>{stats.completed} 名</strong></div>
                      <div className="text-muted" style={{ fontSize: '0.8rem' }}>完了率: {stats.rate}%</div>
                      
                      <div className="mt-3 w-full flex justify-between items-center" style={{ width: '100%' }}>
                        {stats.completed < 10 ? (
                          <span className="masked-indicator" style={{ fontSize: '0.7rem' }}>
                            <Lock size={10} style={{ marginRight: '4px' }} /> 匿名保護ロック中
                          </span>
                        ) : (
                          <span className="consent-badge agreed" style={{ fontSize: '0.7rem' }}>
                            <BarChart2 size={10} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }} /> 分析開示可能
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 組織分析グラフ＆分析レポート表示 */}
              {selectedDept ? (
                <div className="dept-analysis-details fade-in" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', background: '#f8fafc', position: 'relative' }}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>「{selectedDept}」分析レポート</h3>
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                      完了数: {getDeptStats(selectedDept).completed} 名 / 10名基準
                    </span>
                  </div>

                  {getDeptStats(selectedDept).completed < 10 ? (
                    // =================== 10人未満ロック画面 (グラス施錠オーバーレイ) ===================
                    <div className="locked-dashboard-overlay text-center" style={{ padding: '3rem 1.5rem', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(4px)', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                      <div className="lock-icon-wrapper mb-4" style={{ background: '#fffbeb', borderColor: '#fef3c7' }}>
                        <Lock size={36} className="text-muted" style={{ color: '#d97706' }} />
                      </div>
                      <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#92400e', marginBottom: '8px' }}>
                        個人情報匿名化保護ロックがかかっています
                      </h4>
                      <p className="text-muted mb-4" style={{ fontSize: '0.82rem', maxWidth: '480px', margin: '0 auto', lineHeight: '1.6' }}>
                        厚生労働省のストレスチェック制度マニュアルの法的要件に基づき、<strong>受検完了者が10人未満のグループ</strong>については、個人が特定されるプライバシー侵害を避けるため、集計結果（グラフや平均スコア）の閲覧が法律上厳格に制限されています。
                      </p>
                      
                      <div className="progress-bar" style={{ maxWidth: '300px', margin: '0 auto 1rem', height: '6px' }}>
                        <div 
                          className="progress-fill" 
                          style={{ 
                            width: `${(getDeptStats(selectedDept).completed / 10) * 100}%`,
                            background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)' 
                          }}
                        ></div>
                      </div>
                      
                      <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#b45309' }}>
                        現在完了: {getDeptStats(selectedDept).completed}名 / 必要件数: 10名（あと {10 - getDeptStats(selectedDept).completed}名の受検が必要です）
                      </p>
                    </div>
                  ) : (
                    // =================== 10人以上 分析開示可能 ===================
                    <div className="fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        {/* 集計棒グラフ */}
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>部署ストレス指標比較 (高いほど良好)</h4>
                          <Bar 
                            data={{
                              labels: ['仕事ストレス要因', '心身の反応', '周囲のサポート'],
                              datasets: [
                                {
                                  label: `${selectedDept}平均`,
                                  data: [
                                    getDeptStats(selectedDept).avgStressor,
                                    getDeptStats(selectedDept).avgReaction,
                                    getDeptStats(selectedDept).avgSupport
                                  ],
                                  backgroundColor: [
                                    'rgba(59, 130, 246, 0.65)',
                                    'rgba(16, 185, 129, 0.65)',
                                    'rgba(139, 92, 246, 0.65)'
                                  ],
                                  borderColor: [
                                    'rgb(30, 64, 175)',
                                    'rgb(4, 120, 87)',
                                    'rgb(91, 33, 182)'
                                  ],
                                  borderWidth: 1.5
                                }
                              ]
                            }}
                            options={{
                              scales: {
                                y: {
                                  min: 0,
                                  max: 5,
                                  ticks: { stepSize: 1 }
                                }
                              },
                              plugins: {
                                legend: { display: false }
                              }
                            }}
                          />
                        </div>

                        {/* 分析コメントレポート */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ background: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '6px' }}>🔎 部署ごとのストレス特徴</h4>
                            <p style={{ fontSize: '0.8rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
                              {getDeptStats(selectedDept).avgReaction < 3.2 
                                ? '心身の健康度（ストレス反応の少なさ）指標が基準を下回っており、疲労感やイライラ感を感じている従業員が比較的多い兆候があります。適度な残業抑制や、業務調整のヒアリングを実施することを推奨します。'
                                : '心身のストレス反応、仕事の要因、サポート環境がともに安定的な高水準に保たれています。活気が高く、良好な健康状態が持続されています。'}
                            </p>
                          </div>

                          <div style={{ background: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c2410c', marginBottom: '6px' }}>⚠️ メンタルヘルスリスク</h4>
                            <p style={{ fontSize: '0.8rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
                              本部署内における高ストレス者の比率は <strong>{Math.round((getDeptStats(selectedDept).highStress / getDeptStats(selectedDept).completed) * 100)}%</strong> です。<br />
                              相談しやすい職場風土作りの継続や、個別の管理者研修を通じて、ラインによるセルフケア支援を一層強化してください。
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted" style={{ border: '2px dashed #e2e8f0', borderRadius: '8px' }}>
                  分析結果を表示する部署を選択してください。
                </div>
              )}
            </div>
          )}

          {/* 2.3 実施履歴・回号選択サブタブ */}
          {resultsSubTab === 'history' && (
            <div className="fade-in">
              <div className="mb-4" style={{ background: 'rgba(37, 99, 235, 0.04)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
                <p style={{ fontSize: '0.82rem', color: '#1e3a8a', margin: 0, fontWeight: 600 }}>
                  💡 過去に実施されたストレスチェック回号を選択すると、結果一覧やダッシュボード、設定のレビュー表示がその回号のデータに瞬時に切り替わります。
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {campaignHistory.map((item) => {
                  const campResults = results.filter(r => r.campaignName === item.campaignName);
                  const campCompleted = campResults.length;
                  const campTotal = item.campaignName === '令和7年度 秋期定期ストレスチェック' 
                    ? (activeUser?.corporationId === 'CORP002' ? 4 : 50)
                    : item.campaignName === '令和7年度 春期定期ストレスチェック'
                      ? 48
                      : employees.filter(e => e.status === 'active').length;
                  const campRate = campTotal > 0 ? Math.round((campCompleted / campTotal) * 100) : 0;
                  const campHighStress = campResults.filter(r => r.isHighStress).length;
                  const isActive = item.status === 'active';

                  return (
                    <div 
                      key={item.campaignName}
                      className="card"
                      style={{
                        padding: '1.25rem',
                        border: selectedCampaignName === item.campaignName ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                        borderRadius: '12px',
                        background: selectedCampaignName === item.campaignName ? 'rgba(37, 99, 235, 0.02)' : '#ffffff',
                        boxShadow: selectedCampaignName === item.campaignName ? '0 4px 12px rgba(37, 99, 235, 0.08)' : '0 2px 4px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1 1 300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {item.campaignName}
                          </span>
                          <span 
                            style={{ 
                              fontSize: '0.72rem', 
                              fontWeight: 700, 
                              padding: '2px 8px', 
                              borderRadius: '12px',
                              color: '#ffffff',
                              background: isActive 
                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                                : 'linear-gradient(135deg, #64748b 0%, #475569 100%)'
                            }}
                          >
                            {isActive ? '実施中' : '期間終了'}
                          </span>
                          {selectedCampaignName === item.campaignName && (
                            <span 
                              style={{ 
                                fontSize: '0.72rem', 
                                fontWeight: 700, 
                                padding: '2px 8px', 
                                borderRadius: '12px',
                                color: 'var(--primary)',
                                background: '#eff6ff',
                                border: '1px solid var(--primary-light)'
                              }}
                            >
                              表示中
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                          ⏰ 実施期間: <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.startDate.replace('T', ' ')} 〜 {item.endDate.replace('T', ' ')}</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '350px', marginTop: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }}>
                            <span style={{ color: '#475569' }}>受検進捗: {campCompleted}名 / {campTotal}名</span>
                            <span style={{ color: isActive ? 'var(--primary)' : '#475569' }}>{campRate}%</span>
                          </div>
                          <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                width: `${campRate}%`, 
                                background: isActive 
                                  ? 'linear-gradient(90deg, var(--primary) 0%, #3b82f6 100%)' 
                                  : 'linear-gradient(90deg, #64748b 0%, #94a3b8 100%)',
                                borderRadius: '3px',
                                transition: 'width 0.4s ease'
                              }}
                            />
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', gap: '10px', marginTop: '2px' }}>
                            <span>⚠️ 高ストレス: {campHighStress}名</span>
                            <span>✉️ 同意率: {campCompleted > 0 ? Math.round((campResults.filter(r => r.consentDisclose).length / campCompleted) * 100) : 0}%</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setSelectedCampaignName(item.campaignName);
                            setResultsSubTab('list');
                            onNotify(`表示回号を「${item.campaignName}」に切り替えて、結果一覧へ移動しました。`, 'success');
                          }}
                          className="btn btn-outline"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            borderColor: 'var(--primary-light)',
                            color: 'var(--primary)',
                            background: '#eff6ff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Search size={13} />
                          結果一覧を表示
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCampaignName(item.campaignName);
                            setResultsSubTab('dashboard');
                            loadResultsAndEmployees(activeUser ? activeUser.corporationId : 'CORP001');
                            onNotify(`表示回号を「${item.campaignName}」に切り替えて、組織分析ダッシュボードへ移動しました。`, 'success');
                          }}
                          className="btn btn-primary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <BarChart2 size={13} />
                          組織分析を表示
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          タブ3: 従業員マスタ管理 (CRUD)
          ========================================== */}
      {activeTab === 'employees' && (
        <div className="card" style={{ maxWidth: '1050px' }}>
          <EmployeeManager onNotify={onNotify} activeCorpId={activeUser ? activeUser.corporationId : 'CORP001'} />
        </div>
      )}

      {/* ==========================================
          受検催促メール送信シミュレーター (モーダル)
          ========================================== */}
      {isReminderOpen && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '500px', padding: '2rem', background: 'white' }}>
            <div className="flex justify-between items-center pb-2 mb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                未受検者への催促メール一斉配信
              </h3>
              <button className="icon-btn" onClick={() => setIsReminderOpen(false)} disabled={isReminding}>
                <X size={18} />
              </button>
            </div>

            {isReminding ? (
              // 送信アニメーション中
              <div className="text-center py-6 fade-in">
                <RefreshCw size={36} className="text-primary mb-3" style={{ animation: 'spin 1.5s linear infinite', display: 'inline-block' }} />
                <h4 style={{ fontWeight: 700 }}>催促メールを送信しています...</h4>
                <p className="text-primary mt-2" style={{ fontWeight: 600, fontSize: '0.95rem' }}>{reminderCurrentName} さんに送信中</p>
                
                <div className="progress-bar mt-6" style={{ height: '8px' }}>
                  <div className="progress-fill" style={{ width: `${reminderProgress}%` }}></div>
                </div>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>送信進捗: {reminderProgress}%</span>
              </div>
            ) : (
              // プレビューと開始
              <div className="fade-in">
                <div className="alert-badge warning mb-4" style={{ borderRadius: '6px', fontSize: '0.82rem' }}>
                  <AlertCircle size={16} style={{ marginRight: '6px' }} />
                  <span>現在、未受検の対象従業員が <strong>{reminderTargetCount}名</strong> 検出されました。</span>
                </div>

                {/* メールプレビュー */}
                <div className="email-preview-box mb-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem', fontSize: '0.8rem', lineHeight: '1.5' }}>
                  <div><strong>差出人:</strong> メンタルヘルス事務局 &lt;hoken@company.com&gt;</div>
                  <div><strong>件名:</strong> 【催促】定期ストレスチェック受検のお願い</div>
                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '8px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    山田 太郎 様 (サンプル)<br /><br />
                    お疲れ様です。メンタルヘルス推進事務局です。<br />
                    現在、定期ストレスチェック期間中です。締切が近づいておりますので、未受検の方は下記URLより社員番号 [EMP001] を入力の上、受検にご協力をお願い致します。<br /><br />
                    【受検URL】 https://stresscheck.company.com/<br />
                    【受検締切】 {campaignName} 終了時まで
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="btn btn-outline w-full" onClick={() => setIsReminderOpen(false)}>
                    キャンセル
                  </button>
                  <button className="btn btn-primary w-full" onClick={handleStartReminderSimulation}>
                    送信を開始する (一斉配信)
                  </button>
                </div>
              </div>
            )}
          </div>
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
              <div className="result-summary mb-4" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--primary)' }}>👤 受検者基本プロファイル</h4>
                <div className="grid grid-cols-2 gap-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '0.85rem' }}>
                  <div><strong>社員番号:</strong> {selectedResult.employeeCode}</div>
                  <div><strong>氏名:</strong> {selectedEmployee ? selectedEmployee.name : 'ゲスト受検者'}</div>
                  <div><strong>部署:</strong> {selectedEmployee ? selectedEmployee.department : '未割り当て'}</div>
                  <div><strong>受検完了日時:</strong> {selectedResult.completedAt.replace('T', ' ').substring(0, 16)}</div>
                </div>
              </div>

              <div className="mb-4">
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px' }}>📊 診断結果スコア</h4>
                
                {!selectedResult.consentDisclose ? (
                  <div className="alert-badge warning flex-col" style={{ padding: '1.5rem', borderRadius: '8px', width: '100%', alignItems: 'center', textAlign: 'center' }}>
                    <ShieldAlert size={36} className="mb-2" style={{ color: '#ea580c' }} />
                    <strong style={{ fontSize: '1rem', color: '#9a3412', marginBottom: '8px' }}>個人情報の非開示保護が有効です</strong>
                    <p style={{ fontSize: '0.8rem', color: '#a16207', lineHeight: '1.5' }}>
                      この受検者は、結果の<strong>「{discloseLabel}への開示に同意しない」</strong>を選択しました。<br />
                      厚生労働省の法的基準に基づき、本人の明示的な同意がないため、詳細な回答データ、18尺度スコア、および高ストレス該当の合否はマスキングされ閲覧できません。
                    </p>
                    
                    <div className="masked-data-mock mt-4" style={{ width: '100%', border: '1px dashed #cbd5e1', padding: '10px', background: 'rgba(255,255,255,0.5)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div>仕事のストレス要因: *** / 5段階</div>
                      <div>心身のストレス反応: *** / 5段階</div>
                      <div>周囲のサポート関係: *** / 5段階</div>
                      <div style={{ fontWeight: 700, marginTop: '4px' }}>総合判定: [ 🔒 個人情報保護により非表示 ]</div>
                    </div>
                  </div>
                ) : (
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

                    <div style={{ maxWidth: '320px', margin: '0 auto 1.5rem' }}>
                      <Radar 
                        data={{
                          labels: ['仕事の量', '仕事の質', '仕事の裁量度', '職場の対人関係', '活気', 'イライラ感', '疲労感', '不安感', '抑うつ感', '身体愁訴', '上司のサポート', '同僚のサポート', '満足度'],
                          datasets: [
                            {
                              label: 'スコア（高いほど良好）',
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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
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
        
        /* CSV ドロップゾーン */
        .csv-dropzone {
          border: 2px dashed #3b82f6;
          background: #eff6ff;
          border-radius: 8px;
          padding: 2rem 1.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .csv-dropzone:hover {
          background: #dbeafe;
          border-color: #2563eb;
        }

        /* スマートインポートセルエディタ */
        .editor-table th, .editor-table td {
          border-right: 1px solid #cbd5e1;
        }
        .editor-table th:last-child, .editor-table td:last-child {
          border-right: none;
        }
        .editable-cell {
          cursor: pointer;
        }
        .cell-error {
          background-color: #fee2e2 !important;
          border: 1.5px solid #dc2626 !important;
        }
        .grid-input {
          width: 100%;
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.8rem;
          font-weight: 500;
          padding: 2px 4px;
          font-family: inherit;
        }
        .grid-input:focus {
          background: white;
          border-radius: 3px;
          box-shadow: 0 0 2px rgba(30, 64, 175, 0.4);
        }

        /* 組織分析選択カード */
        .selected-dept-card {
          box-shadow: 0 4px 10px rgba(30, 64, 175, 0.15) !important;
          background-color: #eff6ff !important;
        }
      `}</style>
    </div>
  );
};
