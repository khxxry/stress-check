import React, { useState, useEffect, useRef } from 'react';
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
import { Settings, ClipboardList, Users, ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert, Search, X, Lock, Check, Upload, AlertCircle, RefreshCw, Mail, Download, BarChart2, Building2 } from 'lucide-react';

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

interface CSVRow {
  employeeCode: string;
  name: string;
  nameKana: string;
  gender: 'male' | 'female';
  email: string;
  birthDate: string;
  department: string;
}

interface ParsedCSVItem {
  id: number;
  data: CSVRow;
  errors: Record<string, string>;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<'wizard' | 'results' | 'employees'>('wizard');
  const [resultsSubTab, setResultsSubTab] = useState<'list' | 'dashboard'>('list');
  
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

  // ==========================================
  // 2. 受検結果一覧状態
  // ==========================================
  const [results, setResults] = useState<ExamineeResult[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [resultSearchTerm, setResultSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState<ExamineeResult | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // ==========================================
  // 3. スマートCSVインポート状態
  // ==========================================
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedItems, setParsedItems] = useState<ParsedCSVItem[]>([]);
  const [hasImportErrors, setHasImportErrors] = useState(false);
  const [duplicateOption, setDuplicateOption] = useState<'overwrite' | 'skip'>('overwrite');

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

    onNotify('設定がLocalStorageに保存され、キャンペーンが有効化されました！', 'success');
    setAdminStep(1); 
  };

  // ==========================================
  // スマートCSVインポート機能
  // ==========================================

  // ドラッグオーバーハンドラ
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // ファイルドロップハンドラ
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processCSVFile(files[0]);
    }
  };

  // ファイル選択ハンドラ
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processCSVFile(files[0]);
    }
  };

  // CSVファイルのパースとバリデーション
  const processCSVFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      onNotify('CSV形式のファイルのみアップロード可能です。', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSVContent(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // テキストパース
  const parseCSVContent = (content: string) => {
    const lines = content.split(/\r?\n/);
    const parsed: ParsedCSVItem[] = [];
    let idCounter = 1;

    // ヘッダー行をスキップしてループ
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // 空行スキップ

      // 簡易カンマ分割 (ダブルクォーテーションをトリム)
      const cols = line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());

      // 列不足の場合は埋める
      const employeeCode = cols[0] || '';
      const name = cols[1] || '';
      const nameKana = cols[2] || '';
      const rawGender = cols[3] || 'male';
      const email = cols[4] || '';
      const birthDate = cols[5] || '';
      const department = cols[6] || '一般';

      // 性別の自動マッピング
      let gender: 'male' | 'female' = 'male';
      if (rawGender === 'female' || rawGender === '女性' || rawGender === '女' || rawGender === 'f') {
        gender = 'female';
      }

      const rowData: CSVRow = {
        employeeCode,
        name,
        nameKana,
        gender,
        email,
        birthDate,
        department
      };

      // バリデーション実行
      const errors = validateRow(rowData, parsed.map(p => p.data.employeeCode));

      parsed.push({
        id: idCounter++,
        data: rowData,
        errors
      });
    }

    setParsedItems(parsed);
    checkErrorsExist(parsed);
    onNotify(`${parsed.length} 行のCSVデータを読み込みました。`, 'success');
  };

  // 単一行バリデーション
  const validateRow = (row: CSVRow, previousCodes: string[]): Record<string, string> => {
    const errs: Record<string, string> = {};

    if (!row.employeeCode) {
      errs.employeeCode = '社員番号は必須です';
    } else if (previousCodes.includes(row.employeeCode)) {
      errs.employeeCode = 'ファイル内で社員番号が重複しています';
    }

    if (!row.name) {
      errs.name = '名前は必須です';
    }

    if (!row.email) {
      errs.email = 'メールアドレスは必須です';
    } else if (!row.email.includes('@')) {
      errs.email = '@を含む有効な形式にしてください';
    }

    if (!row.birthDate) {
      errs.birthDate = '生年月日は必須です';
    } else if (isNaN(Date.parse(row.birthDate))) {
      errs.birthDate = '日付形式(YYYY-MM-DD)にしてください';
    }

    return errs;
  };

  // エラーの有無を検査
  const checkErrorsExist = (items: ParsedCSVItem[]) => {
    const hasError = items.some(item => Object.keys(item.errors).length > 0);
    setHasImportErrors(hasError);
  };

  // エディタセル直接編集ロジック
  const handleCellEdit = (itemId: number, field: keyof CSVRow, value: string) => {
    const updated = parsedItems.map(item => {
      if (item.id === itemId) {
        const newData = { ...item.data, [field]: value };
        
        // 再バリデーション用に、他の行の社員番号リストを取得
        const otherCodes = parsedItems
          .filter(p => p.id !== itemId)
          .map(p => p.data.employeeCode);

        const newErrors = validateRow(newData, otherCodes);
        return {
          ...item,
          data: newData,
          errors: newErrors
        };
      }
      return item;
    });

    setParsedItems(updated);
    checkErrorsExist(updated);
  };

  // インポート確定処理
  const handleConfirmImport = () => {
    if (hasImportErrors) {
      onNotify('エラーが表示されているセルをすべて修正してください。', 'error');
      return;
    }
    if (!activeUser) return;
    const currentCorpId = activeUser.corporationId;

    const storedEmployees = localStorage.getItem('stress_check_employees');
    const existingEmployees: Employee[] = storedEmployees ? JSON.parse(storedEmployees) : [];
    
    let addedCount = 0;
    let updatedCount = 0;

    const updatedList = [...existingEmployees];

    parsedItems.forEach(item => {
      const idx = updatedList.findIndex(e => e.corporationId === currentCorpId && e.employeeCode === item.data.employeeCode);
      const newEmp: Employee = {
        corporationId: currentCorpId,
        employeeCode: item.data.employeeCode,
        name: item.data.name,
        nameKana: item.data.nameKana,
        gender: item.data.gender,
        email: item.data.email,
        birthDate: item.data.birthDate,
        status: 'active',
        department: item.data.department
      };

      if (idx !== -1) {
        if (duplicateOption === 'overwrite') {
          updatedList[idx] = newEmp;
          updatedCount++;
        }
      } else {
        updatedList.push(newEmp);
        addedCount++;
      }
    });

    localStorage.setItem('stress_check_employees', JSON.stringify(updatedList));
    setParsedItems([]); // クリア
    
    // 自社の従業員のみをフィルタリングして状態にセット
    const filteredEmps = updatedList.filter(e => e.corporationId === currentCorpId);
    setEmployees(filteredEmps);
    onNotify(`インポート成功：${addedCount}名を追加、${updatedCount}名を更新しました。`, 'success');
  };

  // ==========================================
  // 健康経営調査用データCSV出力機能
  // ==========================================
  const handleExportMETICSV = () => {
    // 統計計算
    const totalActive = employees.filter(e => e.status === 'active').length;
    const completed = results.length;
    const rate = totalActive > 0 ? ((completed / totalActive) * 100).toFixed(1) : '0';

    // 性別受検率
    const activeMale = employees.filter(e => e.status === 'active' && e.gender === 'male').length;
    const completedMale = results.filter(r => {
      const emp = employees.find(e => e.employeeCode === r.employeeCode);
      return emp?.gender === 'male';
    }).length;
    const maleRate = activeMale > 0 ? ((completedMale / activeMale) * 100).toFixed(1) : '0';

    const activeFemale = employees.filter(e => e.status === 'active' && e.gender === 'female').length;
    const completedFemale = results.filter(r => {
      const emp = employees.find(e => e.employeeCode === r.employeeCode);
      return emp?.gender === 'female';
    }).length;
    const femaleRate = activeFemale > 0 ? ((completedFemale / activeFemale) * 100).toFixed(1) : '0';

    // 年代計算用
    const ageBrackets: Record<string, number> = { '20代以下': 0, '30代': 0, '40代': 0, '50代': 0, '60代以上': 0 };
    results.forEach(res => {
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
    let csvContent = '\uFEFF'; // Excel文字化け防止のBOM
    csvContent += '健康経営度調査提出用 統計データ出力レポート\n';
    csvContent += `キャンペーン名,${campaignName}\n`;
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
    const deptResults = results.filter(r => {
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

  const totalEmployees = employees.filter(e => e.status === 'active').length;
  const completedCount = results.length;
  const completionRate = totalEmployees > 0 ? Math.round((completedCount / totalEmployees) * 100) : 0;
  const highStressCount = results.filter(r => r.isHighStress).length;
  const interviewRequestCount = results.filter(r => r.requestInterview).length;

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
      <details className="dev-tool-accordion mb-6" style={{ width: '100%' }}>
        <summary className="dev-tool-summary cursor-pointer p-3 rounded-lg border flex items-center justify-between text-xs font-bold text-gray-500" style={{ background: '#f8fafc', borderColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', listStyle: 'none' }}>
          <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>🔧</span>
            <span>【デモ・動作検証用】テナント擬似切り替えツール</span>
          </div>
          <span className="toggle-indicator text-xs font-normal" style={{ color: 'var(--primary)' }}>(クリックして展開)</span>
        </summary>
        
        <div className="tenant-context-bar flex items-center justify-between p-4 mt-2 rounded-xl border transition-all duration-300" style={{ background: 'var(--glass-bg)', borderColor: '#cbd5e1', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="p-2 rounded-lg text-primary" style={{ background: '#eff6ff', padding: '8px' }}>
              <Building2 size={24} className="text-primary" />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">現在選択中の企業</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeUser ? activeUser.name : '未選択'}
                <span className="text-xs text-gray-500 font-normal bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                  {activeUser ? activeUser.corporationId : ''}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400">管理者コンテキスト:</label>
            <select
              value={activeUser ? activeUser.userId : ''}
              onChange={(e) => {
                const selected = corporateUsers.find(u => u.userId === e.target.value);
                if (selected) {
                  setActiveUser(selected);
                  onNotify(`管理者コンテキストを「${selected.name}」に切り替えました。`, 'success');
                }
              }}
              className="py-1.5 px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {corporateUsers.map(user => (
                <option key={user.userId} value={user.userId}>
                  {user.name} ({user.corporationId} - {user.role === 'admin' ? '実施管理者' : '共同閲覧者'})
                </option>
              ))}
            </select>
            
            <button
              onClick={() => {
                if (window.confirm('すべてのローカルストレージデータを削除し、初期デモ状態（一貫性のあるデータ）にリセットしますか？\n※ページは自動的にリロードされます。')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="btn btn-outline"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
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
              デモデータ初期化
            </button>
          </div>
        </div>
      </details>

      {/* 管理者用インナータブナビゲーション */}
      <div className="admin-tabs mb-6 flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '2px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`tab-btn ${activeTab === 'wizard' ? 'active' : ''}`}
            onClick={() => setActiveTab('wizard')}
            style={{ borderBottom: activeTab === 'wizard' ? '2px solid var(--primary)' : '2px solid transparent' }}
          >
            <Settings size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            実施セットアップ
          </button>
          <button 
            className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
            style={{ borderBottom: activeTab === 'results' ? '2px solid var(--primary)' : '2px solid transparent' }}
          >
            <ClipboardList size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            受検結果トラッキング
            {results.length > 0 && <span className="tab-badge">{results.length}</span>}
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

            {/* ステップ2: 対象者インポート (完全スマートインポート) */}
            {adminStep === 2 && (
              <div className="admin-card fade-in">
                <h3 className="mb-4 text-primary" style={{ fontSize: '1.1rem', fontWeight: 700 }}>ステップ2: 対象従業員マスタ登録（CSVスマートインポート）</h3>
                
                <div className="flex gap-4 justify-between mb-4 flex-wrap" style={{ fontSize: '0.88rem' }}>
                  <div>👥 有効な登録従業員数: <strong>{totalEmployees} 名</strong></div>
                  <div>
                    重複時の処理: 
                    <select 
                      value={duplicateOption} 
                      onChange={(e) => setDuplicateOption(e.target.value as any)}
                      style={{ marginLeft: '6px', padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="overwrite">既存データに上書きする</option>
                      <option value="skip">重複データはスキップする</option>
                    </select>
                  </div>
                </div>

                {/* CSVアップロードエリア */}
                <div 
                  className="csv-dropzone text-center mb-6" 
                  onDragOver={handleDragOver}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={32} className="text-primary mb-2" style={{ display: 'inline-block' }} />
                  <p style={{ fontWeight: 700 }}>受検対象者CSVファイルをドラッグ＆ドロップ</p>
                  <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>または、ここをクリックしてファイルを選択</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    style={{ display: 'none' }} 
                    accept=".csv" 
                  />
                </div>

                <div className="feature-info mb-4" style={{ fontSize: '0.75rem', padding: '10px' }}>
                  📝 <strong>CSV推奨形式:</strong> 社員番号, 氏名, カナ, 性別(男性/女性), メールアドレス, 生年月日(YYYY-MM-DD), 部署
                </div>

                {/* スマートグリッドエディタ (エラー検出時) */}
                {parsedItems.length > 0 && (
                  <div className="smart-grid-editor-wrapper fade-in" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                    <div className="editor-header flex justify-between items-center py-2 px-4" style={{ background: hasImportErrors ? '#fef2f2' : '#f0fdf4', borderBottom: '1px solid #cbd5e1' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: hasImportErrors ? '#991b1b' : '#15803d' }}>
                        {hasImportErrors 
                          ? `⚠️ ${parsedItems.filter(p => Object.keys(p.errors).length > 0).length}行にエラーがあります。赤く表示されたセルをダブルクリックして修正してください。`
                          : '✨ すべてのデータの検証が完了しました！エラーはありません。'}
                      </span>
                      {hasImportErrors && <span style={{ fontSize: '0.75rem', color: '#991b1b' }}>※Enterで確定、Escでキャンセル</span>}
                    </div>

                    <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                      <table className="editor-table" style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                            <th style={{ padding: '6px 12px' }}>社員番号</th>
                            <th style={{ padding: '6px 12px' }}>氏名</th>
                            <th style={{ padding: '6px 12px' }}>メールアドレス</th>
                            <th style={{ padding: '6px 12px' }}>生年月日</th>
                            <th style={{ padding: '6px 12px' }}>部署</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedItems.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                              {/* 社員番号 */}
                              <td 
                                className={`editable-cell ${item.errors.employeeCode ? 'cell-error' : ''}`}
                                style={{ padding: '4px 10px' }}
                                title={item.errors.employeeCode}
                              >
                                <input
                                  type="text"
                                  value={item.data.employeeCode}
                                  onChange={(e) => handleCellEdit(item.id, 'employeeCode', e.target.value)}
                                  className="grid-input"
                                />
                              </td>
                              {/* 氏名 */}
                              <td 
                                className={`editable-cell ${item.errors.name ? 'cell-error' : ''}`}
                                style={{ padding: '4px 10px' }}
                                title={item.errors.name}
                              >
                                <input
                                  type="text"
                                  value={item.data.name}
                                  onChange={(e) => handleCellEdit(item.id, 'name', e.target.value)}
                                  className="grid-input"
                                />
                              </td>
                              {/* メールアドレス */}
                              <td 
                                className={`editable-cell ${item.errors.email ? 'cell-error' : ''}`}
                                style={{ padding: '4px 10px' }}
                                title={item.errors.email}
                              >
                                <input
                                  type="email"
                                  value={item.data.email}
                                  onChange={(e) => handleCellEdit(item.id, 'email', e.target.value)}
                                  className="grid-input"
                                />
                              </td>
                              {/* 生年月日 */}
                              <td 
                                className={`editable-cell ${item.errors.birthDate ? 'cell-error' : ''}`}
                                style={{ padding: '4px 10px' }}
                                title={item.errors.birthDate}
                              >
                                <input
                                  type="text"
                                  value={item.data.birthDate}
                                  onChange={(e) => handleCellEdit(item.id, 'birthDate', e.target.value)}
                                  className="grid-input"
                                />
                              </td>
                              {/* 部署 */}
                              <td style={{ padding: '4px 10px' }}>
                                <input
                                  type="text"
                                  value={item.data.department}
                                  onChange={(e) => handleCellEdit(item.id, 'department', e.target.value)}
                                  className="grid-input"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="py-2 px-4 text-right" style={{ background: '#f8fafc', borderTop: '1px solid #cbd5e1' }}>
                      <button 
                        className="btn btn-primary" 
                        disabled={hasImportErrors}
                        onClick={handleConfirmImport}
                        style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                      >
                        {parsedItems.length} 名のデータをインポート確定
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ステップ3: 同意設定 */}
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
                        maxLength={10}
                      />
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
        <div className="card fade-in" style={{ maxWidth: '800px' }}>
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

          {/* サブタブ切り替え: 結果一覧 vs 組織ダッシュボード */}
          <div className="results-subtabs mb-4 flex gap-2" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <button 
              className={`btn btn-outline ${resultsSubTab === 'list' ? 'btn-primary text-white' : ''}`}
              onClick={() => setResultsSubTab('list')}
              style={{ padding: '4px 12px', fontSize: '0.82rem', borderRadius: '4px' }}
            >
              受検結果一覧
            </button>
            <button 
              className={`btn btn-outline ${resultsSubTab === 'dashboard' ? 'btn-primary text-white' : ''}`}
              onClick={() => { setResultsSubTab('dashboard'); loadResultsAndEmployees(activeUser ? activeUser.corporationId : 'CORP001'); }}
              style={{ padding: '4px 12px', fontSize: '0.82rem', borderRadius: '4px' }}
            >
              組織分析ダッシュボード
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
                      filteredResults.map((res) => {
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
                                ? '心身のストレス反応平均値が平均基準を下回っています。疲労感やイライラ感を感じている従業員が比較的多い兆候があります。適度な残業抑制や、業務調整のヒアリングを実施することを推奨します。'
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
        </div>
      )}

      {/* ==========================================
          タブ3: 従業員マスタ管理 (CRUD)
          ========================================== */}
      {activeTab === 'employees' && (
        <div className="card" style={{ maxWidth: '800px' }}>
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
