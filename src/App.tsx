import React, { useState } from 'react';
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
import { Activity, AlertTriangle, CheckCircle } from 'lucide-react';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

type Step = 'start' | 'gender' | 'questions' | 'result';

const App: React.FC = () => {
  const [step, setStep] = useState<Step>('start');
  const [gender, setGender] = useState<Gender>('male');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<ScoringResult | null>(null);

  const handleAnswer = (questionId: number, optionIndex: number) => {
    // Standard answers are 1-based (1: Positive/Never to 4: Negative/Always)
    const score = optionIndex + 1;
    const newAnswers = { ...answers, [questionId]: score };
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const scoringResult = calculateScoring(newAnswers, gender);
      setResult(scoringResult);
      setStep('result');
    }
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
        backgroundColor: 'rgba(30, 64, 175, 0.2)',
        borderColor: 'rgb(30, 64, 175)',
        pointBackgroundColor: 'rgb(30, 64, 175)',
        pointBorderColor: '#fff',
      },
    ],
  } : null;

  return (
    <div className="container">
      {step === 'start' && (
        <div className="card text-center">
          <Activity size={48} className="mb-4 text-primary" />
          <h1>Stress Check</h1>
          <p className="text-muted mb-6">
            職業性ストレス簡易調査票（57項目）に基づき、あなたのストレス状態を測定します。
          </p>
          <button className="btn btn-primary" onClick={() => setStep('gender')}>
            診断を始める
          </button>
        </div>
      )}

      {step === 'gender' && (
        <div className="card">
          <h2>性別を選択してください</h2>
          <p className="text-muted mb-6">性別により採点基準が異なります。</p>
          <div className="options-grid">
            <button className="option-btn" onClick={() => { setGender('male'); setStep('questions'); }}>
              男性
            </button>
            <button className="option-btn" onClick={() => { setGender('female'); setStep('questions'); }}>
              女性
            </button>
          </div>
        </div>
      )}

      {step === 'questions' && (
        <div className="card">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-muted mb-2">Question {currentIndex + 1} of {questions.length}</p>
          <h2 className="question-text">{questions[currentIndex].text}</h2>
          <div className="options-grid">
            {questions[currentIndex].options.map((option, idx) => (
              <button 
                key={idx} 
                className="option-btn"
                onClick={() => handleAnswer(questions[currentIndex].id, idx)}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-6">
            <button 
              className="btn btn-outline" 
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(currentIndex - 1)}
            >
              戻る
            </button>
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="card">
          <div className="text-center mb-8">
            {result.isHighStress ? (
              <div className="alert-badge warning">
                <AlertTriangle size={24} />
                <span>高ストレス状態です</span>
              </div>
            ) : (
              <div className="alert-badge success">
                <CheckCircle size={24} />
                <span>健康的な状態です</span>
              </div>
            )}
            <h1 className="mt-4">診断結果</h1>
          </div>

          <div style={{ maxWidth: '400px', margin: '0 auto' }} className="mb-8">
            {radarData && (
              <Radar 
                data={radarData} 
                options={{
                  scales: {
                    r: {
                      min: 0,
                      max: 5,
                      ticks: { stepSize: 1 }
                    }
                  }
                }} 
              />
            )}
          </div>

          <div className="result-summary">
            <h3>総合評価</h3>
            <p className="mb-4">
              {result.isHighStress 
                ? '判定基準に従い、高ストレス者と判定されました。医師による面接指導を検討することをお勧めします。'
                : '現在のところ、ストレスによる健康への影響は少ないようです。引き続きセルフケアに努めてください。'}
            </p>
            <button className="btn btn-primary w-full" onClick={() => window.location.reload()}>
              最初に戻る
            </button>
          </div>
        </div>
      )}

      <style>{`
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mb-8 { margin-bottom: 2rem; }
        .mt-4 { margin-top: 1rem; }
        .mt-6 { margin-top: 1.5rem; }
        .text-center { text-align: center; }
        .text-primary { color: var(--primary); }
        .w-full { width: 100%; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        
        .alert-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-weight: 600;
        }
        .alert-badge.warning {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fee2e2;
        }
        .alert-badge.success {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #dcfce7;
        }
      `}</style>
    </div>
  );
};

export default App;
