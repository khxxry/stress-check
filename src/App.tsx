import React, { useState, useEffect } from 'react';
import { questions } from './data/questions';
import { calculateScoring, ScoringResult, Gender } from './utils/scoring';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Activity, AlertTriangle, CheckCircle, ArrowRight, ArrowLeft, RefreshCw, Eye, Settings, ShieldAlert, Sparkles } from 'lucide-react';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

type Mode = 'examinee' | 'admin';
type Step = 'start' | 'gender' | 'questions' | 'mindfulness' | 'result';

const App: React.FC = () => {
  // ルーティング状態
  const [mode, setMode] = useState<Mode>('examinee');
  
  // 受検者側の状態
  const [step, setStep] = useState<Step>('start');
  const [gender, setGender] = useState<Gender>('male');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<ScoringResult | null>(null);
  
  // アニメーション状態
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  
  // マインドフルネスの呼吸ガイダンス用テキスト
  const [breathText, setBreathText] = useState('ゆっくり息を吸い込んで...');

  // 管理者画面用の状態（モックアップ用）
  const [adminStep, setAdminStep] = useState(1);

  // キーボードナビゲーションのイベントハンドラ
  useEffect(() => {
    if (mode !== 'examinee' || step !== 'questions' || isAnimating) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1〜4キーで回答
      if (['1', '2', '3', '4'].includes(e.key)) {
        const optionIdx = parseInt(e.key) - 1;
        const questionId = questions[currentIndex].id;
        handleAnswer(questionId, optionIdx);
      }
      // Backspaceまたは左矢印で戻る
      if (e.key === 'Backspace' || e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, step, currentIndex, isAnimating]);

  // マインドフルネス呼吸サークルの文言アニメーション
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

  // 回答時の自動遷移 (Auto-Advance)
  const handleAnswer = (questionId: number, optionIndex: number) => {
    if (isAnimating) return;

    // スコア保存
    const score = optionIndex + 1;
    const newAnswers = { ...answers, [questionId]: score };
    setAnswers(newAnswers);

    // アニメーション設定
    setSlideDirection('next');
    setIsAnimating(true);

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsAnimating(false);
      } else {
        // 全問回答完了時、採点を実行
        const scoringResult = calculateScoring(newAnswers, gender);
        setResult(scoringResult);
        
        // 高ストレス判定の場合は、マインドフルネスの呼吸ケア画面（クッション）を挟む
        if (scoringResult.isHighStress) {
          setStep('mindfulness');
        } else {
          setStep('result');
        }
        setIsAnimating(false);
      }
    }, 280); // CSSスライドアニメーション(300ms)よりわずかに短く同期
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

  const progress = ((currentIndex + 1) / questions.length) * 100;

  const radarData = result ? {
    labels: [
      '仕事の量', '仕事の質', '仕事の裁量度', '職場の対人関係', '活気', 
      'イライラ感', '疲労感', '不安感', '抑うつ感', '身体愁訴',
      '上司のサポート', '同僚のサポート', '仕事・生活の満足度'
    ],
    datasets: [
      {
        label: 'ストレスプロフィール（5段階評価：高いほど良好）',
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
      },
    ],
  } : null;

  return (
    <div className="app-container">
      {/* 簡易ヘッダー・ルーティング */}
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

      {mode === 'examinee' ? (
        // 受検者画面
        <div className="container">
          {step === 'start' && (
            <div className="card text-center fade-in">
              <div className="logo-badge mb-4">
                <Activity size={40} className="text-primary" />
              </div>
              <h1 className="mb-2">ストレスチェック</h1>
              <p className="text-muted mb-6">
                厚生労働省の標準「職業性ストレス簡易調査票（57項目）」に準拠した、あなたのストレス状態を評価する診断です。
              </p>
              <div className="feature-info mb-6 text-left">
                <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>✨ <strong>フェーズ1プレミアムUX機能:</strong></p>
                <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', paddingLeft: '1.25rem' }}>
                  <li><strong>オートアドバンス:</strong> クリックした瞬間に滑らかに次の設問へ進みます。</li>
                  <li><strong>キーボード操作:</strong> テンキーの [1]〜[4] キーで回答し、[Backspace] で戻ることができます。</li>
                  <li><strong>マインドフルネスケア:</strong> 高ストレス判定時に、呼吸を整えるガイドを挟みます。</li>
                </ul>
              </div>
              <button className="btn btn-primary w-full" onClick={() => setStep('gender')}>
                診断を開始する <ArrowRight size={18} style={{ marginLeft: '6px', verticalAlign: 'middle' }} />
              </button>
            </div>
          )}

          {step === 'gender' && (
            <div className="card text-center fade-in">
              <h2>性別を選択してください</h2>
              <p className="text-muted mb-6">※厚生労働省の基準に従い、性別により採点マッピング（素点換算）が異なります。</p>
              <div className="options-grid">
                <button className="option-btn text-center" onClick={() => { setGender('male'); setStep('questions'); }}>
                  男性
                </button>
                <button className="option-btn text-center" onClick={() => { setGender('female'); setStep('questions'); }}>
                  女性
                </button>
              </div>
              <button className="btn btn-outline mt-6 w-full" onClick={() => setStep('start')}>
                戻る
              </button>
            </div>
          )}

          {step === 'questions' && (
            <div className="card">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                  カテゴリ {questions[currentIndex].category}: {
                    questions[currentIndex].category === 'A' ? '仕事について' :
                    questions[currentIndex].category === 'B' ? '最近1ヶ月間の状態' :
                    questions[currentIndex].category === 'C' ? '周りの方々について' : '仕事や生活の満足度'
                  }
                </span>
                <span className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  {currentIndex + 1} / {questions.length} 問
                </span>
              </div>

              {/* スライドコンテナ */}
              <div className="slide-container" style={{ minHeight: '320px' }}>
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

              <div className="flex justify-between mt-6 pt-4" style={{ borderTop: '1px solid #e2e8f0' }}>
                <button 
                  className="btn btn-outline" 
                  disabled={currentIndex === 0 || isAnimating}
                  onClick={handlePrev}
                >
                  <ArrowLeft size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> 戻る
                </button>
                <span className="text-muted" style={{ fontSize: '0.8rem', alignSelf: 'center' }}>
                  ※キーボードの [1]~[4] で選択、[←] または [BS] で戻れます
                </span>
              </div>
            </div>
          )}

          {step === 'mindfulness' && (
            <div className="card text-center fade-in">
              <div className="logo-badge mb-4 warning">
                <Sparkles size={36} className="text-primary-light" />
              </div>
              <h2>マインドフルネス・ブリッジ</h2>
              <p className="text-muted mb-6">
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

              <button className="btn btn-primary w-full" onClick={() => setStep('result')}>
                呼吸を整えて結果を確認する <ArrowRight size={18} style={{ marginLeft: '6px', verticalAlign: 'middle' }} />
              </button>
            </div>
          )}

          {step === 'result' && result && (
            <div className="card fade-in">
              <div className="text-center mb-8">
                {result.isHighStress ? (
                  <div className="alert-badge warning">
                    <AlertTriangle size={20} />
                    <span>高ストレス状態と判定されました</span>
                  </div>
                ) : (
                  <div className="alert-badge success">
                    <CheckCircle size={20} />
                    <span>良好な健康状態です</span>
                  </div>
                )}
                <h1 className="mt-4">ストレスチェック結果</h1>
              </div>

              <div style={{ maxWidth: '420px', margin: '0 auto' }} className="mb-8">
                {radarData && (
                  <Radar 
                    data={radarData} 
                    options={{
                      scales: {
                        r: {
                          min: 0,
                          max: 5,
                          ticks: { stepSize: 1, display: false },
                          pointLabels: {
                            font: {
                              size: 11,
                              weight: 'bold'
                            }
                          }
                        }
                      },
                      plugins: {
                        legend: { display: false }
                      }
                    }} 
                  />
                )}
              </div>

              <div className="result-summary admin-card" style={{ background: 'var(--glass-bg)' }}>
                <h3 className="mb-2">判定結果とアドバイス</h3>
                <p className="text-muted mb-4" style={{ lineHeight: '1.6' }}>
                  {result.isHighStress 
                    ? '厚生労働省が定める高ストレス判定基準に基づき、ストレスの負荷が高い状態であると評価されました。ご自身の体調を第一に考え、必要に応じて管理者に相談の上、医師による面接指導をお申し込みいただくことをお勧めします。'
                    : '現在のところ、全体的にバランスが取れており、ストレスによる心身の反応は健康的な範囲内にあります。今後も引き続き心地よいセルフケアと適度な休息を心がけてください。'}
                </p>
                
                {result.isHighStress && (
                  <div className="alert-badge warning mb-4 w-full justify-center" style={{ borderRadius: '8px', padding: '1rem' }}>
                    <ShieldAlert size={20} style={{ marginRight: '8px' }} />
                    <span>※管理者への医師面接希望の申請フォームはフェーズ2で実装されます。</span>
                  </div>
                )}

                <button className="btn btn-outline w-full" onClick={() => {
                  setAnswers({});
                  setCurrentIndex(0);
                  setResult(null);
                  setStep('start');
                }}>
                  <RefreshCw size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> 最初からやり直す
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // 管理者画面プレースホルダー (フェーズ2・3への架け橋)
        <div className="container">
          <div className="card admin-placeholder fade-in">
            <div className="admin-header flex justify-between">
              <div>
                <h2>ストレスチェック 実施管理設定</h2>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>フェーズ2・3の実装プレースホルダー（運用設計用ワイヤーフレーム）</p>
              </div>
              <span className="alert-badge success" style={{ alignSelf: 'center', fontSize: '0.8rem' }}>管理者モード</span>
            </div>

            {/* セットアップウィザードステップ */}
            <div className="wizard-steps">
              <div className={`wizard-step ${adminStep === 1 ? 'active' : ''}`}>
                <span className="wizard-step-num">1</span> 期間設定
              </div>
              <div className={`wizard-step ${adminStep === 2 ? 'active' : ''}`}>
                <span className="wizard-step-num">2</span> 対象者登録
              </div>
              <div className={`wizard-step ${adminStep === 3 ? 'active' : ''}`}>
                <span className="wizard-step-num">3</span> 開示同意設定
              </div>
              <div className={`wizard-step ${adminStep === 4 ? 'active' : ''}`}>
                <span className="wizard-step-num">4</span> 面接希望設定
              </div>
              <div className={`wizard-step ${adminStep === 5 ? 'active' : ''}`}>
                <span className="wizard-step-num">5</span> 最終確認
              </div>
            </div>

            {/* 各ステップごとのプレースホルダーカード */}
            {adminStep === 1 && (
              <div className="admin-card fade-in">
                <h3 className="mb-4">ステップ1: 実施期間設定</h3>
                <div className="form-group">
                  <label className="form-label">実施キャンペーン名</label>
                  <input type="text" className="form-control" defaultValue="2026年度 春期定期ストレスチェック" />
                </div>
                <div className="flex gap-4">
                  <div className="form-group w-full">
                    <label className="form-label">開始日時</label>
                    <input type="datetime-local" className="form-control" defaultValue="2026-05-25T10:00" />
                  </div>
                  <div className="form-group w-full">
                    <label className="form-label">終了日時</label>
                    <input type="datetime-local" className="form-control" defaultValue="2026-06-08T18:00" />
                  </div>
                </div>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>※設定された期間外は受検ログイン画面が自動的にロックされます。</p>
              </div>
            )}

            {adminStep === 2 && (
              <div className="admin-card fade-in">
                <h3 className="mb-4">ステップ2: 対象者インポート (CSV/Excel)</h3>
                <div className="text-center" style={{ border: '2px dashed #cbd5e1', padding: '3rem 1rem', borderRadius: '8px', background: '#f8fafc' }}>
                  <p className="mb-2" style={{ fontWeight: 600 }}>対象者リストファイルをここにドラッグ＆ドロップ</p>
                  <p className="text-muted mb-4" style={{ fontSize: '0.8rem' }}>CSVまたはExcel (.xlsx) 形式 - 最大10MB</p>
                  <button className="btn btn-outline btn-sm">ファイルを選択</button>
                </div>
                <div className="feature-info mt-4" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>✨ <strong>フェーズ3のスマート機能:</strong> ドラッグ後、エラーが含まれている行を画面上で瞬時に検出・赤色でハイライトし、その場で手動修正ができるエディタが展開されます。</p>
                </div>
              </div>
            )}

            {adminStep === 3 && (
              <div className="admin-card fade-in">
                <h3 className="mb-4">ステップ3: 事業者への結果開示フォーム設定</h3>
                <div className="form-group">
                  <label className="form-label">同意フォームの使用</label>
                  <div className="flex gap-4">
                    <label><input type="radio" name="disclose" defaultChecked /> 使用する</label>
                    <label><input type="radio" name="disclose" /> 使用しない</label>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">「事業者」の呼称カスタマイズ (10文字以内)</label>
                  <input type="text" className="form-control" placeholder="例: 〇〇株式会社" defaultValue="事業者" />
                </div>
                <div className="form-group">
                  <label className="form-label">開示に関する説明・注意書き (400文字以内)</label>
                  <textarea className="form-control" rows={3} defaultValue="このストレスチェックは、個人情報保護方針に基づき実施されます。あなたの同意がある場合のみ、結果が事業者に共有されます。同意しないことで不利益な扱いを受けることは一切ありません。"></textarea>
                </div>
              </div>
            )}

            {adminStep === 4 && (
              <div className="admin-card fade-in">
                <h3 className="mb-4">ステップ4: 医師による面接希望フォーム設定</h3>
                <div className="form-group">
                  <label className="form-label">面接フォームの表示条件</label>
                  <select className="form-control">
                    <option>高ストレス者と面接勧奨者にのみ表示 (推奨)</option>
                    <option>全員に表示</option>
                    <option>面接勧奨者にのみ表示</option>
                    <option>使用しない</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">結果開示許可の取得方法</label>
                  <select className="form-control">
                    <option>面接希望時に結果開示同意を必須とする</option>
                    <option>結果開示同意は任意とする</option>
                    <option>開示許可は取得しない</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">受付期間 (実施期間終了日の翌日からの日数)</label>
                  <input type="number" className="form-control" defaultValue={30} style={{ width: '120px' }} />
                </div>
              </div>
            )}

            {adminStep === 5 && (
              <div className="admin-card text-center fade-in">
                <CheckCircle size={48} className="text-primary-light mb-4" />
                <h3>すべてのセットアップ設定が完了しました！</h3>
                <p className="text-muted mb-6">
                  フェーズ2でこれらの設定がLocalStorageに保存され、<br />
                  「受検者画面」の挙動（表示される案内文や面接フォームの有無）へ連動されるようになります。
                </p>
                <div className="feature-info text-left mb-6" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>📝 <strong>設定情報のサマリー（デモ）:</strong></p>
                  <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                    <li>実施回名: 2026年度 春期定期ストレスチェック</li>
                    <li>対象者リスト: 84名 (未アップロード)</li>
                    <li>結果開示同意: 収集する (呼称: 事業者)</li>
                    <li>医師面接希望: 高ストレス者にのみ表示 (開示必須)</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ウィザードナビゲーションボタン */}
            <div className="flex justify-between mt-4">
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
                    // 最終確認から最初のステップに戻る
                    setAdminStep(1);
                  }
                }}
              >
                {adminStep === 5 ? '最初に戻る' : '次へ進む'} <ArrowRight size={16} style={{ marginLeft: '6px', verticalAlign: 'middle' }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* キーボードショートカットやUX要素用のグローバルスタイルとバッジ */}
      <style>{`
        .app-container {
          width: 100%;
          min-height: 100vh;
          padding: 1.5rem 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .logo-badge {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #eff6ff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .logo-badge.warning {
          background: #fffbeb;
        }
        .keyboard-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          background: #e2e8f0;
          color: var(--text-muted);
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 4px;
          margin-right: 10px;
          border-bottom: 2px solid #cbd5e1;
        }
        .option-btn:hover .keyboard-badge {
          background: var(--primary-light);
          color: white;
          border-bottom-color: var(--primary);
        }
        .option-btn.selected .keyboard-badge {
          background: var(--primary);
          color: white;
          border-bottom-color: #1e3a8a;
        }
        .fade-in {
          animation: fadeIn 0.4s ease forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .text-left { text-align: left; }
        .gap-4 { gap: 1rem; }
      `}</style>
    </div>
  );
};

export default App;
