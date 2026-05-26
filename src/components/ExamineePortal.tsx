import React, { useState, useEffect } from 'react';
import { questions } from '../data/questions';
import { calculateScoring, ScoringResult, Gender } from '../utils/scoring';
import { Corporation, CampaignSettings, ConsentSettings, InterviewSettings, Employee, ExamineeResult, InterviewDetails } from '../types';
import { Radar } from 'react-chartjs-2';
import { Activity, AlertTriangle, CheckCircle, ArrowRight, ArrowLeft, RefreshCw, Sparkles, ShieldCheck, Mail, Phone, Calendar, Lock } from 'lucide-react';

interface ExamineePortalProps {
  onNotify: (message: string, type: 'success' | 'error') => void;
  onComplete: () => void;
}

export const ExamineePortal: React.FC<ExamineePortalProps> = ({ onNotify, onComplete }) => {
  // ==========================================
  // 1. 設定及び状態定義
  // ==========================================
  const [campaignSettings, setCampaignSettings] = useState<CampaignSettings | null>(null);
  const [consentSettings, setConsentSettings] = useState<ConsentSettings | null>(null);
  const [interviewSettings, setInterviewSettings] = useState<InterviewSettings | null>(null);

  const [isLocked, setIsLocked] = useState(false);
  const [step, setStep] = useState<'login' | 'start' | 'consent_before' | 'questions' | 'consent_after' | 'mindfulness' | 'result'>('login');
  
  // 受検者テナント & 従業員情報
  const [corporationId, setCorporationId] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [loggedInEmployee, setLoggedInEmployee] = useState<Employee | null>(null);
  const [gender, setGender] = useState<Gender>('male');

  // メールアドレスログイン & OTP状態
  const [loginEmail, setLoginEmail] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [userEnteredOtp, setUserEnteredOtp] = useState('');
  const [targetEmployeeForLogin, setTargetEmployeeForLogin] = useState<Employee | null>(null);
  const [targetCorpForLogin, setTargetCorpForLogin] = useState<Corporation | null>(null);

  // 回答進捗
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<ScoringResult | null>(null);
  
  // アニメーション
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const [breathText, setBreathText] = useState('ゆっくり息を吸い込んで...');

  // 医師面接申請フォーム状態
  const [requestInterview, setRequestInterview] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [slot1, setSlot1] = useState('');
  const [slot2, setSlot2] = useState('');
  const [slot3, setSlot3] = useState('');
  const [comments, setComments] = useState('');
  const [interviewConsent, setInterviewConsent] = useState(false);
  const [interviewSubmitted, setInterviewSubmitted] = useState(false);

  // ==========================================
  // 2. テナント固有設定のロード
  // ==========================================
  const loadTenantSettings = (corpCode: string): boolean => {
    // 1. キャンペーン設定
    const storedCampaign = localStorage.getItem(`stress_check_campaign_${corpCode}`);
    let camp: CampaignSettings | null = null;
    if (storedCampaign) {
      camp = JSON.parse(storedCampaign);
      setCampaignSettings(camp);
    } else {
      // フォールバック用の初期キャンペーン
      camp = {
        campaignName: '令和8年度 ストレスチェック',
        startDate: '2026-05-01T00:00',
        endDate: '2026-06-30T23:59',
        customNoticeStart: '日頃のストレス状況を把握し、健康的なワークライフを送るためのチェックです。正直にお答えください（所要時間約5分）。',
        customNoticeHighStress: '判定の結果、ストレス反応が高い状態であることがわかりました。自身の心身の健康のため、医師面接等のセルフケアをご検討ください。',
        status: 'active'
      };
      setCampaignSettings(camp);
    }

    // 2. 同意設定
    const storedConsent = localStorage.getItem(`stress_check_consent_${corpCode}`);
    if (storedConsent) {
      setConsentSettings(JSON.parse(storedConsent));
    } else {
      setConsentSettings({
        useConsent: true,
        discloseLabel: '事業者',
        discloseNotice: '本ストレスチェックの結果は、労働安全衛生法に基づき、あなたの同意がある場合に限り事業者に開示されます。同意された場合、結果は職場環境の改善や必要に応じた産業医面談等の健康管理のために利用されます。同意されない場合でも、受検したことのみをもって不利益な取り扱いを受けることはありません。',
        consentTiming: 'after'
      });
    }

    // 3. 面接設定
    const storedInterview = localStorage.getItem(`stress_check_interview_${corpCode}`);
    if (storedInterview) {
      setInterviewSettings(JSON.parse(storedInterview));
    } else {
      setInterviewSettings({
        displayCondition: 'high_stress_only',
        requireDisclosure: 'required',
        receptionDays: 14,
        notificationEmails: 'safety@example.com'
      });
    }

    // 期間ロックアウト判定
    if (camp) {
      const now = new Date();
      const start = new Date(camp.startDate);
      const end = new Date(camp.endDate);
      if (now < start || now > end) {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    }
    
    return true;
  };

  // キーボードナビゲーション
  useEffect(() => {
    if (step !== 'questions' || isAnimating) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const optionIdx = parseInt(e.key) - 1;
        const questionId = questions[currentIndex].id;
        handleAnswer(questionId, optionIdx);
      }
      if (e.key === 'Backspace' || e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, currentIndex, isAnimating]);

  // マインドフルネス呼吸アニメーション
  useEffect(() => {
    if (step !== 'mindfulness') return;
    
    let isMounted = true;
    const sequence = [
      { text: 'ゆっくり息を吸い込んで...', duration: 4000 },
      { text: '息を吐き出して、リラックス...', duration: 4000 }
    ];
    
    let index = 0;
    const runSequence = () => {
      if (!isMounted) return;
      setBreathText(sequence[index].text);
      const nextDelay = sequence[index].duration;
      index = (index + 1) % sequence.length;
      setTimeout(runSequence, nextDelay);
    };

    runSequence();
    return () => { isMounted = false; };
  }, [step]);

  // ==========================================
  // 3. ビジネスロジック処理
  // ==========================================

  // ワンタイムパスコードの送信シミュレーション
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!corporationId.trim()) {
      onNotify('企業コードを入力してください。', 'error');
      return;
    }
    if (!loginEmail.trim()) {
      onNotify('メールアドレスを入力してください。', 'error');
      return;
    }

    const corpCode = corporationId.trim().toUpperCase();
    const emailInput = loginEmail.trim().toLowerCase();

    // 1. 企業存在チェック
    const storedCorps = localStorage.getItem('stress_check_corporations');
    const corps: Corporation[] = storedCorps ? JSON.parse(storedCorps) : [];
    const foundCorp = corps.find(c => c.corporationId === corpCode);

    if (!foundCorp) {
      onNotify('入力された企業コードが見つかりません。', 'error');
      return;
    }

    if (foundCorp.status === 'suspended') {
      onNotify('この企業の契約は現在一時停止されています。', 'error');
      return;
    }

    // 2. 従業員存在チェック（メールアドレスで一致）
    const storedEmployees = localStorage.getItem('stress_check_employees');
    if (storedEmployees) {
      const emps: Employee[] = JSON.parse(storedEmployees);
      const found = emps.find(emp => emp.corporationId === corpCode && emp.email.trim().toLowerCase() === emailInput);
      
      if (found) {
        if (found.status === 'inactive') {
          onNotify('この従業員アカウントは現在無効に設定されています。', 'error');
          return;
        }

        // 6桁のOTPコードを生成
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setOtpCode(code);
        setTargetEmployeeForLogin(found);
        setTargetCorpForLogin(foundCorp);
        setIsOtpSent(true);
        setUserEnteredOtp('');
        onNotify('ログイン用パスコードをシミュレーターに送信しました。', 'success');
      } else {
        onNotify('登録されていないメールアドレス、または企業コードが一致しません。', 'error');
      }
    } else {
      onNotify('従業員マスタが登録されていません。', 'error');
    }
  };

  // パスコード検証処理
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEnteredOtp.trim()) {
      onNotify('6桁の認証コードを入力してください。', 'error');
      return;
    }

    if (userEnteredOtp.trim() === otpCode) {
      if (!targetEmployeeForLogin || !targetCorpForLogin) return;

      const corpCode = targetCorpForLogin.corporationId;
      loadTenantSettings(corpCode);

      setLoggedInEmployee(targetEmployeeForLogin);
      setGender(targetEmployeeForLogin.gender);
      setEmail(targetEmployeeForLogin.email); // 面接申請用のemailステートへ設定
      setEmployeeCode(targetEmployeeForLogin.employeeCode); // 既存互換性のために社員番号も設定
      
      setStep('start');
      onNotify(`${targetCorpForLogin.name}の${targetEmployeeForLogin.name}様としてログインしました。`, 'success');
    } else {
      onNotify('認証コードが正しくありません。シミュレーターに表示されているコードを入力してください。', 'error');
    }
  };

  // ゲスト受検（テストをスムーズにするためのバイパス）
  const handleGuestLogin = () => {
    const guestEmp: Employee = {
      corporationId: 'CORP001',
      employeeCode: `GUEST-${Math.floor(1000 + Math.random() * 9000)}`,
      name: 'テスト受検者 (ゲスト)',
      nameKana: 'テストジュケンシャ',
      gender: 'male',
      email: 'guest@example.com',
      birthDate: '1990-01-01',
      status: 'active',
      department: '技術開発部'
    };
    
    // CORP001 (テクノロジーラボ) の設定をロード
    loadTenantSettings('CORP001');

    setLoggedInEmployee(guestEmp);
    setCorporationId('CORP001');
    setEmployeeCode(guestEmp.employeeCode);
    setGender('male');
    setStep('start');
    onNotify('ゲスト受検（テストモード・テクノロジーラボ所属）を開始します。', 'success');
  };

  // 動的タグの文字列置換
  const substituteTags = (text: string): string => {
    if (!text) return '';
    const name = loggedInEmployee ? loggedInEmployee.name : 'ゲスト受検者';
    const period = campaignSettings 
      ? `${campaignSettings.startDate.replace('T', ' ')} 〜 ${campaignSettings.endDate.replace('T', ' ')}` 
      : '';
    const label = consentSettings ? consentSettings.discloseLabel : '事業者';

    return text
      .replace(/{氏名}/g, name)
      .replace(/{社員番号}/g, employeeCode)
      .replace(/{実施期間}/g, period)
      .replace(/{事業者名}/g, label)
      .replace(/{事業者}/g, label);
  };

  // 開始画面から進む
  const handleStartNext = () => {
    if (consentSettings?.useConsent && consentSettings.consentTiming === 'before') {
      setStep('consent_before');
    } else {
      setStep('questions');
    }
  };

  // 設問の回答（オートアドバンス）
  const handleAnswer = (questionId: number, optionIndex: number) => {
    if (isAnimating) return;

    const score = optionIndex + 1;
    const newAnswers = { ...answers, [questionId]: score };
    setAnswers(newAnswers);

    setSlideDirection('next');
    setIsAnimating(true);

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsAnimating(false);
      } else {
        // 全問回答完了
        setIsAnimating(false);
        const scoringResult = calculateScoring(newAnswers, gender);
        setResult(scoringResult);

        if (consentSettings?.useConsent && consentSettings.consentTiming === 'after') {
          setStep('consent_after');
        } else {
          // 同意フォームを使用しない場合
          saveExamineeResult(scoringResult, true);
        }
      }
    }, 280);
  };

  // 前の設問に戻る
  const handlePrev = () => {
    if (isAnimating || currentIndex === 0) return;

    setSlideDirection('prev');
    setIsAnimating(true);

    setTimeout(() => {
      setCurrentIndex(currentIndex - 1);
      setIsAnimating(false);
    }, 280);
  };

  // 同意画面からの遷移
  const handleConsentSubmit = (agreed: boolean) => {
    if (step === 'consent_before') {
      setStep('questions');
    } else if (step === 'consent_after' && result) {
      saveExamineeResult(result, agreed);
    }
  };

  // 結果レコードのローカルストレージ保存
  const saveExamineeResult = (scoringResult: ScoringResult, isAgreed: boolean) => {
    const finalResult: ExamineeResult = {
      id: `${employeeCode}-${Date.now()}`,
      corporationId: loggedInEmployee ? loggedInEmployee.corporationId : 'CORP001',
      employeeCode,
      campaignName: campaignSettings ? campaignSettings.campaignName : '標準キャンペーン',
      answers,
      subscales: scoringResult.subscales,
      totalReactionScore: scoringResult.totalReactionScore,
      totalStressorSupportScore: scoringResult.totalStressorSupportScore,
      isHighStress: scoringResult.isHighStress,
      consentDisclose: isAgreed,
      requestInterview: false, // 後で申請されたら true にアップデート
      completedAt: new Date().toISOString()
    };

    // 既存レコードを取得
    const stored = localStorage.getItem('stress_check_results');
    const list: ExamineeResult[] = stored ? JSON.parse(stored) : [];
    list.push(finalResult);
    localStorage.setItem('stress_check_results', JSON.stringify(list));

    // 高ストレス判定の場合はマインドフルネス呼吸を挟む
    if (scoringResult.isHighStress) {
      setStep('mindfulness');
    } else {
      setStep('result');
    }
  };

  // 医師面接申請の送信
  const handleInterviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      onNotify('連絡先電話番号を入力してください。', 'error');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      onNotify('有効なメールアドレスを入力してください。', 'error');
      return;
    }
    if (interviewSettings?.requireDisclosure === 'required' && !interviewConsent) {
      onNotify(`医師および${consentSettings?.discloseLabel || '事業者'}への結果開示同意が必要です。`, 'error');
      return;
    }

    // 最新の受検結果レコードを読み込んでアップデート
    const stored = localStorage.getItem('stress_check_results');
    if (stored) {
      const list: ExamineeResult[] = JSON.parse(stored);
      // 一番最後の自分の受検レコードを検索（企業コードも含めてマッチさせる）
      const targetCorpId = loggedInEmployee ? loggedInEmployee.corporationId : 'CORP001';
      const myResultIndex = [...list].reverse().findIndex(res => 
        res.employeeCode === employeeCode && res.corporationId === targetCorpId
      );
      
      if (myResultIndex !== -1) {
        const actualIndex = list.length - 1 - myResultIndex;
        
        const details: InterviewDetails = {
          phone: phone.trim(),
          email: email.trim(),
          preferredSlots: [slot1.trim(), slot2.trim(), slot3.trim()],
          comments: comments.trim()
        };

        list[actualIndex].requestInterview = true;
        list[actualIndex].interviewDetails = details;
        
        // もし面接申請によって強制同意設定の場合、同意状態も true にする
        if (interviewSettings?.requireDisclosure === 'required') {
          list[actualIndex].consentDisclose = true;
        }

        localStorage.setItem('stress_check_results', JSON.stringify(list));
        setInterviewSubmitted(true);
        onNotify('医師面接の希望申請を受付いたしました。産業医および人事管理者へ自動通知されました。', 'success');
      }
    }
  };

  // 最初からやり直す
  const handleRestart = () => {
    setCorporationId('');
    setEmployeeCode('');
    setLoggedInEmployee(null);
    setCurrentIndex(0);
    setAnswers({});
    setResult(null);
    setRequestInterview(false);
    setPhone('');
    setSlot1('');
    setSlot2('');
    setSlot3('');
    setComments('');
    setInterviewConsent(false);
    setInterviewSubmitted(false);
    setStep('login');
    onComplete();
  };

  const progress = ((currentIndex + 1) / questions.length) * 100;

  // ==========================================
  // 4. レンダリング表示
  // ==========================================

  // A. 期間ロックアウト画面
  if (isLocked) {
    return (
      <div className="card text-center fade-in" style={{ padding: '3rem 2rem' }}>
        <div className="lock-icon-wrapper mb-4">
          <Lock size={44} className="text-muted" style={{ color: '#dc2626' }} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#991b1b', marginBottom: '1rem' }}>
          現在、ストレスチェック実施期間外です
        </h2>
        <p className="text-muted mb-6" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
          申し訳ございません。このストレスチェックキャンペーンは現在実施期間外、または既に終了しているため受検することができません。
        </p>
        
        {campaignSettings && (
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <strong>【設定された実施期間】</strong><br />
            <span style={{ color: '#991b1b', fontWeight: 600 }}>
              {campaignSettings.startDate.replace('T', ' ')} 〜 {campaignSettings.endDate.replace('T', ' ')}
            </span>
          </div>
        )}
        <p className="text-muted" style={{ fontSize: '0.8rem' }}>受検期間の開始までお待ちいただくか、企業の安全衛生管理者にお問い合わせください。</p>
      </div>
    );
  }

  return (
    <div className="examinee-portal-wrapper w-full">
      {/* 1. 企業コード ＆ メールアドレス認証 (OTP) ログイン画面 */}
      {step === 'login' && (
        <div className="card fade-in" style={{ maxWidth: '500px' }}>
          <div className="text-center mb-6">
            <div className="logo-badge mb-3">
              <Activity size={32} className="text-primary" />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>受検ログイン (認証)</h2>
            <p className="text-muted mt-1" style={{ fontSize: '0.85rem' }}>
              企業コードと登録されているメールアドレスを入力してログインしてください。
            </p>
          </div>

          {!isOtpSent ? (
            <form onSubmit={handleSendOtp}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">企業コード (Corporate Code)</label>
                <input
                  type="text"
                  className="form-control"
                  value={corporationId}
                  onChange={(e) => setCorporationId(e.target.value)}
                  placeholder="例: CORP001"
                  style={{ textAlign: 'center', letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase' }}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">登録メールアドレス (Email Address)</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    className="form-control"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="yamada@company.com"
                    style={{ paddingLeft: '36px' }}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full" style={{ padding: '0.9rem' }}>
                認証コードを送信する <ArrowRight size={18} style={{ marginLeft: '6px', verticalAlign: 'middle' }} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div className="alert-badge success mb-4" style={{ padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', lineHeight: '1.4', background: '#eff6ff', border: '1px solid #bfdbfe', color: 'var(--primary)' }}>
                📧 <strong>{loginEmail}</strong> 宛に認証コードを送信しました。
                <br />
                ※デモ環境のため、下のシミュレーターからコードをコピーしてください。
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">6桁の認証コード (Verification Code)</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    maxLength={6}
                    className="form-control"
                    value={userEnteredOtp}
                    onChange={(e) => setUserEnteredOtp(e.target.value)}
                    placeholder="123456"
                    style={{ paddingLeft: '36px', textAlign: 'center', letterSpacing: '8px', fontSize: '1.25rem', fontWeight: 700 }}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" className="btn btn-outline" onClick={() => setIsOtpSent(false)} style={{ flex: 1, padding: '0.8rem' }}>
                  <ArrowLeft size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> 戻る
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '0.8rem' }}>
                  ログインする <ShieldCheck size={18} style={{ marginLeft: '6px', verticalAlign: 'middle' }} />
                </button>
              </div>
            </form>
          )}

          {/* デモ環境用：OTP配信シミュレーター */}
          {isOtpSent && otpCode && (
            <div className="otp-simulator-box mt-6" style={{
              background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.05), rgba(79, 70, 229, 0.05))',
              border: '1px dashed rgba(30, 64, 175, 0.3)',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Sparkles size={14} /> OTP送信シミュレーター (デモ用)
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                メールサーバーに接続せず、ローカルで生成された検証用パスコードです：
              </p>
              <div className="flex items-center justify-center gap-3">
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '4px', background: 'white', padding: '4px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  {otpCode}
                </span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(otpCode);
                    onNotify('認証コードをコピーしました！', 'success');
                  }} 
                  className="btn btn-outline" 
                  style={{ padding: '6px 12px', fontSize: '0.8rem', height: 'auto' }}
                  type="button"
                >
                  コピー
                </button>
              </div>
            </div>
          )}

          {/* デモ・検証用バイパス */}
          <div className="divider-text my-4" style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '0.75rem', position: 'relative' }}>
            <span style={{ background: 'white', padding: '0 8px' }}>または</span>
          </div>

          <button className="btn btn-outline w-full" onClick={handleGuestLogin} style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
            ゲスト（デモ・テスト用）として受検する
          </button>
          <div className="feature-info mt-4" style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            💡 <strong>テストガイド:</strong> テクノロジーラボは `CORP001` + `yamada@company.com` (山田太郎)、グローバル営業本部は `CORP002` + `hayashi@company.com` (林直樹) で検証可能です。
          </div>
        </div>
      )}

      {/* 2. 開始説明画面 */}
      {step === 'start' && (
        <div className="card text-center fade-in">
          <div className="logo-badge mb-4">
            <Activity size={40} className="text-primary" />
          </div>
          <h1 className="mb-2" style={{ fontSize: '1.6rem', fontWeight: 800 }}>
            {campaignSettings ? campaignSettings.campaignName : 'ストレスチェック'}
          </h1>
          <p className="text-muted mb-6" style={{ fontSize: '0.9rem', lineHeight: '1.6', textAlign: 'left', background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            {campaignSettings ? substituteTags(campaignSettings.customNoticeStart) : 'ストレスチェックを開始します。'}
          </p>

          <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <ShieldCheck size={20} className="text-primary" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)' }}>
              回答は厳重に保護され、本人の明確な同意なしに開示されることはありません。
            </span>
          </div>

          <button className="btn btn-primary w-full" onClick={handleStartNext} style={{ padding: '1rem' }}>
            回答を開始する <ArrowRight size={18} style={{ marginLeft: '6px', verticalAlign: 'middle' }} />
          </button>
        </div>
      )}

      {/* 3. 同意確認画面（開始前） */}
      {step === 'consent_before' && (
        <div className="card fade-in" style={{ maxWidth: '540px' }}>
          <div className="text-center mb-6">
            <ShieldCheck size={40} className="text-primary-light mb-3" />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>受検結果の事業者開示に関する同意書</h2>
          </div>

          <div className="consent-box mb-6" style={{ maxHeight: '180px', overflowY: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
            {consentSettings ? substituteTags(consentSettings.discloseNotice) : '規約説明文がありません。'}
          </div>

          <div className="options-grid">
            <button className="option-btn text-center" onClick={() => handleConsentSubmit(true)} style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '1.05rem' }}>同意して受検する</div>
              <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>結果が安全に{consentSettings?.discloseLabel || '事業者'}へ開示され、社内の環境改善等に利用されます。</div>
            </button>
            <button className="option-btn text-center" onClick={() => handleConsentSubmit(false)} style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '1.05rem' }}>同意せずに受検する</div>
              <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>結果は開示されず、管理者画面ではあなたの詳細スコアはマスキング保護されます。</div>
            </button>
          </div>
        </div>
      )}

      {/* 4. 設問回答画面 (摩擦ゼロ体験) */}
      {step === 'questions' && (
        <div className="card">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="flex justify-between mb-2 flex-wrap">
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
              カテゴリ {questions[currentIndex].category}: {
                questions[currentIndex].category === 'A' ? '仕事について' :
                questions[currentIndex].category === 'B' ? '最近1ヶ月間の状態' :
                questions[currentIndex].category === 'C' ? '周りの方々について' : '仕事や生活の満足度'
              }
            </span>
            <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              {currentIndex + 1} / {questions.length} 問
            </span>
          </div>

          {/* スライド回答エリア */}
          <div className="slide-container" style={{ minHeight: '290px' }}>
            <div className={`slide-content ${
              isAnimating 
                ? (slideDirection === 'next' ? 'slide-out-left' : 'slide-out-right') 
                : (slideDirection === 'next' ? 'slide-in-right' : 'slide-in-left')
            }`}>
              <h2 className="question-text">{questions[currentIndex].text}</h2>
              
              <div className="options-grid">
                {questions[currentIndex].options.map((option, idx) => (
                  <button 
                    key={idx} 
                    className={`option-btn ${answers[questions[currentIndex].id] === idx + 1 ? 'selected' : ''}`}
                    onClick={() => handleAnswer(questions[currentIndex].id, idx)}
                  >
                    <span className="keyboard-badge">{idx + 1}</span> {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="question-footer">
            <button 
              className="btn btn-outline" 
              disabled={currentIndex === 0 || isAnimating}
              onClick={handlePrev}
            >
              <ArrowLeft size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> 戻る
            </button>
            <span className="keyboard-guide">
              ※キーボードの [1]~[4] で回答、[←] または [BS] で戻れます
            </span>
          </div>
        </div>
      )}

      {/* 5. 同意確認画面（設問回答後） */}
      {step === 'consent_after' && (
        <div className="card fade-in" style={{ maxWidth: '540px' }}>
          <div className="text-center mb-6">
            <ShieldCheck size={40} className="text-primary-light mb-3" />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>回答完了：結果の事業者開示に関する同意書</h2>
            <p className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>全57問の回答が完了しました。診断結果を{consentSettings?.discloseLabel || '事業者'}へ開示することに同意しますか？</p>
          </div>

          <div className="consent-box mb-6" style={{ maxHeight: '180px', overflowY: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
            {consentSettings ? substituteTags(consentSettings.discloseNotice) : '規約説明文がありません。'}
          </div>

          <div className="options-grid">
            <button className="option-btn text-center" onClick={() => handleConsentSubmit(true)} style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '1.05rem' }}>同意して結果を確認する</div>
              <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>結果が安全に{consentSettings?.discloseLabel || '事業者'}へ開示され、適切なフォローや職場改善が行われます。</div>
            </button>
            <button className="option-btn text-center" onClick={() => handleConsentSubmit(false)} style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '1.05rem' }}>同意せずに結果を確認する（非開示保護）</div>
              <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>診断スコアは{consentSettings?.discloseLabel || '事業者'}に共有されず、管理画面では完全にマスキング（非表示）されます。</div>
            </button>
          </div>
        </div>
      )}

      {/* 6. マインドフルネス・ブリッジ（高ストレス者ケア） */}
      {step === 'mindfulness' && (
        <div className="card text-center fade-in">
          <div className="logo-badge mb-4 warning">
            <Sparkles size={36} className="text-primary-light" />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>マインドフルネス・ブリッジ</h2>
          <p className="text-muted mb-6" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
            お疲れ様でした。すべての質問への回答が完了しました。<br />
            結果を表示する前に、少しだけ肩の力を抜いて、深い呼吸を3回行いましょう。
          </p>

          <div className="breathe-container">
            <div className="breathe-circle-wrapper">
              <div className="breathe-ripple"></div>
              <div className="breathe-circle"></div>
            </div>
            <div className="breathe-instruction">{breathText}</div>
          </div>

          <button className="btn btn-primary w-full" onClick={() => setStep('result')} style={{ padding: '1rem' }}>
            呼吸を整えて結果を確認する <ArrowRight size={18} style={{ marginLeft: '6px', verticalAlign: 'middle' }} />
          </button>
        </div>
      )}

      {/* 7. 診断結果 ＆ 医師面接指導申請画面 */}
      {step === 'result' && result && (
        <div className="card fade-in" style={{ maxWidth: '640px' }}>
          <div className="text-center mb-6">
            {result.isHighStress ? (
              <div className="alert-badge warning justify-center" style={{ display: 'inline-flex', padding: '6px 16px', borderRadius: '20px' }}>
                <AlertTriangle size={18} style={{ marginRight: '6px' }} />
                <span>高ストレス状態と判定されました</span>
              </div>
            ) : (
              <div className="alert-badge success justify-center" style={{ display: 'inline-flex', padding: '6px 16px', borderRadius: '20px' }}>
                <CheckCircle size={18} style={{ marginRight: '6px' }} />
                <span>良好な健康状態です</span>
              </div>
            )}
            <h1 className="mt-4" style={{ fontSize: '1.6rem', fontWeight: 800 }}>診断結果報告</h1>
            <p className="text-muted mt-1" style={{ fontSize: '0.85rem' }}>{loggedInEmployee ? loggedInEmployee.name : 'ゲスト'} 様のストレス状況プロフィールです。</p>
          </div>

          {/* チャート */}
          <div style={{ maxWidth: '380px', margin: '0 auto 2rem' }}>
            <Radar 
              data={{
                labels: ['仕事の量', '仕事の質', '仕事の裁量度', '職場の対人関係', '活気', 'イライラ感', '疲労感', '不安感', '抑うつ感', '身体愁訴', '上司のサポート', '同僚 of サポート', '満足度'],
                datasets: [
                  {
                    label: 'ストレスプロフィール（高いほど良好）',
                    data: [
                      result.subscales.jobQuantity,
                      result.subscales.jobQuality,
                      result.subscales.jobControl,
                      result.subscales.interpersonal,
                      result.subscales.vigor,
                      result.subscales.irritation,
                      result.subscales.fatigue,
                      result.subscales.anxiety,
                      result.subscales.depression,
                      result.subscales.somatic,
                      result.subscales.supervisorSupport,
                      result.subscales.colleagueSupport,
                      result.subscales.satisfaction,
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
                    pointLabels: { font: { size: 10, weight: 'bold' } }
                  }
                },
                plugins: { legend: { display: false } }
              }}
            />
          </div>

          {/* 判定サマリー */}
          <div className="result-summary mb-6" style={{ background: 'var(--glass-bg)', padding: '1.25rem', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>判定結果アドバイス</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
              {result.isHighStress 
                ? (campaignSettings ? substituteTags(campaignSettings.customNoticeHighStress) : 'ストレス過多の反応がみられます。適度な休息をお勧めします。')
                : '現在のところ、全体的にバランスが取れており、ストレスによる心身の反応は健康的な範囲内にあります。今後も引き続き心地よいセルフケアと適度な休息を心がけてください。'}
            </p>
          </div>

          {/* 医師面接指導申請フォーム (動的表示判定) */}
          {interviewSettings && 
           interviewSettings.displayCondition !== 'disabled' && 
           (interviewSettings.displayCondition === 'all' || 
            (interviewSettings.displayCondition === 'high_stress_only' && result.isHighStress)) && (
            <div className="doctor-interview-box mb-6 fade-in" style={{ border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: '8px', padding: '1.5rem' }}>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="text-primary" size={24} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)' }}>🩺 医師による面接指導の申請（希望受付）</h3>
              </div>
              <p className="text-muted mb-4" style={{ fontSize: '0.8rem', lineHeight: '1.5' }}>
                厚生労働省のガイドラインに基づき、高ストレス判定となった受検者は、産業医・医師による面接指導を申し込むことができます。面接希望を送信すると、衛生管理担当者および産業医に通知され、日程調整が行われます。
              </p>

              {interviewSubmitted ? (
                // 申請完了
                <div className="alert-badge success text-center flex-col py-4 justify-center" style={{ borderRadius: '6px' }}>
                  <CheckCircle size={28} className="mb-2" />
                  <strong style={{ fontSize: '0.95rem' }}>医師面接希望の申請を受け付けました</strong>
                  <span style={{ fontSize: '0.78rem', marginTop: '2px', color: '#15803d' }}>後日、衛生管理者より日程調整等のご連絡を差し上げます。</span>
                </div>
              ) : (
                // 申請フォーム
                <form onSubmit={handleInterviewSubmit}>
                  <div className="form-group mb-4">
                    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
                      <input 
                        type="checkbox" 
                        checked={requestInterview} 
                        onChange={(e) => setRequestInterview(e.target.checked)}
                        style={{ width: '18px', height: '18px', marginRight: '8px' }}
                      />
                      医師による面接指導を希望する
                    </label>
                  </div>

                  {requestInterview && (
                    <div className="interview-fields fade-in pl-2" style={{ borderLeft: '2px solid var(--primary-light)' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>連絡先電話番号 <span style={{ color: 'red' }}>*</span></label>
                        <div style={{ position: 'relative' }}>
                          <Phone size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input 
                            type="tel" 
                            className="form-control" 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="例: 090-XXXX-XXXX"
                            style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>連絡先メールアドレス <span style={{ color: 'red' }}>*</span></label>
                        <div style={{ position: 'relative' }}>
                          <Mail size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input 
                            type="email" 
                            className="form-control" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="例: example@company.com"
                            style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>面談希望日時（第1〜第3希望を入力してください）</label>
                        <div className="flex flex-col gap-2">
                          <div style={{ position: 'relative' }}>
                            <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input 
                              type="text" 
                              className="form-control" 
                              value={slot1} 
                              onChange={(e) => setSlot1(e.target.value)} 
                              placeholder="第1希望: 例 6月1日 午後14時以降"
                              style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
                            />
                          </div>
                          <div style={{ position: 'relative' }}>
                            <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input 
                              type="text" 
                              className="form-control" 
                              value={slot2} 
                              onChange={(e) => setSlot2(e.target.value)} 
                              placeholder="第2希望: 例 6月3日 午前10時〜12時"
                              style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
                            />
                          </div>
                          <div style={{ position: 'relative' }}>
                            <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input 
                              type="text" 
                              className="form-control" 
                              value={slot3} 
                              onChange={(e) => setSlot3(e.target.value)} 
                              placeholder="第3希望: 例 6月5日 終日可"
                              style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>事前相談内容・フリーコメント（任意）</label>
                        <textarea 
                          className="form-control" 
                          rows={2} 
                          value={comments} 
                          onChange={(e) => setComments(e.target.value)}
                          placeholder="体調の変化や、産業医に事前に伝えておきたい相談内容を入力してください。"
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>

                      {interviewSettings.requireDisclosure === 'required' && (
                        <div className="form-group mb-4">
                          <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.78rem', color: '#991b1b', lineHeight: '1.4' }}>
                            <input 
                              type="checkbox" 
                              checked={interviewConsent} 
                              onChange={(e) => setInterviewConsent(e.target.checked)}
                              style={{ width: '16px', height: '16px', marginRight: '6px', flexShrink: 0 }}
                            />
                            <span>
                              <strong>【同意必須】</strong>面接指導希望を送信することにより、私の詳細な診断結果が面接を行う産業医および{consentSettings?.discloseLabel || '事業者'}の人事管理者に共有されることに同意します。
                            </span>
                          </label>
                        </div>
                      )}

                      <button type="submit" className="btn btn-primary w-full" style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>
                        医師面接の申請を送信する
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}

          {/* やり直しボタン */}
          <button className="btn btn-outline w-full" onClick={handleRestart} style={{ padding: '0.8rem' }}>
            <RefreshCw size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> 最初に戻る（受検ログアウト）
          </button>
        </div>
      )}
    </div>
  );
};
