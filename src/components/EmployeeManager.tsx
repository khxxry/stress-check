import React, { useState, useEffect } from 'react';
import { Employee, ExamineeResult } from '../types';
import { Edit2, Trash2, Plus, Search, X, AlertCircle } from 'lucide-react';

interface EmployeeManagerProps {
  onNotify: (message: string, type: 'success' | 'error') => void;
  activeCorpId: string;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({ onNotify, activeCorpId }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // フォーム状態
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null); // null = 新規登録
  
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formNameKana, setFormNameKana] = useState('');
  const [formGender, setFormGender] = useState<'male' | 'female'>('male');
  const [formEmail, setFormEmail] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formDepartment, setFormDepartment] = useState('技術開発部');

  const [validationError, setValidationError] = useState('');

  // ページネーション状態
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // 検索ワードが変わったらページ数を1ページ目にリセット
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // LocalStorageから自テナントの従業員リストをロード
  useEffect(() => {
    const stored = localStorage.getItem('stress_check_employees');
    if (stored) {
      const allEmps: Employee[] = JSON.parse(stored);
      const filtered = allEmps.filter(emp => emp.corporationId === activeCorpId);
      setEmployees(filtered);
    } else {
      setEmployees([]);
    }
    setCurrentPage(1); // テナント切り替え時にページをリセット
  }, [activeCorpId]);

  // マージしてLocalStorage全体に保存するヘルパー関数（他企業のデータを破壊しない）
  const saveAllEmployees = (updatedSelfEmps: Employee[]) => {
    const stored = localStorage.getItem('stress_check_employees');
    const allEmps: Employee[] = stored ? JSON.parse(stored) : [];
    
    // 他企業のデータを抽出
    const otherCorpEmps = allEmps.filter(emp => emp.corporationId !== activeCorpId);
    
    // 自企業の新しいリストとマージして保存
    const finalEmps = [...otherCorpEmps, ...updatedSelfEmps];
    localStorage.setItem('stress_check_employees', JSON.stringify(finalEmps));
    setEmployees(updatedSelfEmps);
  };

  // フォームを開く（新規追加）
  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormCode('');
    setFormName('');
    setFormNameKana('');
    setFormGender('male');
    setFormEmail('');
    setFormBirthDate('');
    setFormStatus('active');
    setFormDepartment('技術開発部');
    setValidationError('');
    setIsFormOpen(true);
  };

  // フォームを開く（編集）
  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormCode(emp.employeeCode);
    setFormName(emp.name);
    setFormNameKana(emp.nameKana);
    setFormGender(emp.gender);
    setFormEmail(emp.email);
    setFormBirthDate(emp.birthDate);
    setFormStatus(emp.status);
    setFormDepartment(emp.department || '技術開発部');
    setValidationError('');
    setIsFormOpen(true);
  };

  // 従業員の保存（追加または更新）
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // バリデーション
    if (!formCode.trim()) {
      setValidationError('社員番号を入力してください。');
      return;
    }
    if (!formName.trim()) {
      setValidationError('氏名を入力してください。');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setValidationError('有効なメールアドレスを入力してください。');
      return;
    }
    if (!formBirthDate) {
      setValidationError('生年月日を入力してください。');
      return;
    }

    const updatedEmployees = [...employees];

    if (editingEmployee === null) {
      // 1. 新規登録
      // 自社内で社員番号の重複チェック
      const exists = employees.some(emp => emp.employeeCode === formCode.trim());
      if (exists) {
        setValidationError('この社員番号は既にあなたの企業で登録されています。');
        return;
      }

      const newEmp: Employee = {
        corporationId: activeCorpId,
        employeeCode: formCode.trim(),
        name: formName.trim(),
        nameKana: formNameKana.trim(),
        gender: formGender,
        email: formEmail.trim(),
        birthDate: formBirthDate,
        status: formStatus,
        department: formDepartment.trim()
      };

      updatedEmployees.push(newEmp);
      saveAllEmployees(updatedEmployees);
      onNotify('従業員を登録しました。', 'success');
    } else {
      // 2. 編集保存
      const oldCode = editingEmployee.employeeCode;
      const newCode = formCode.trim();

      // 社員番号変更時の自社内重複チェック
      if (oldCode !== newCode) {
        const exists = employees.some(emp => emp.employeeCode === newCode);
        if (exists) {
          setValidationError('変更後の社員番号は既にあなたの企業で使用されています。');
          return;
        }

        // 社員番号が変更された場合、カスケード（連動）更新を実行（自社の受検結果のみ）
        const storedResults = localStorage.getItem('stress_check_results');
        if (storedResults) {
          const results: ExamineeResult[] = JSON.parse(storedResults);
          const updatedResults = results.map(res => {
            if (res.corporationId === activeCorpId && res.employeeCode === oldCode) {
              return { ...res, employeeCode: newCode };
            }
            return res;
          });
          localStorage.setItem('stress_check_results', JSON.stringify(updatedResults));
        }
      }

      // 従業員データの更新
      const index = employees.findIndex(emp => emp.employeeCode === oldCode);
      if (index !== -1) {
        updatedEmployees[index] = {
          corporationId: activeCorpId,
          employeeCode: newCode,
          name: formName.trim(),
          nameKana: formNameKana.trim(),
          gender: formGender,
          email: formEmail.trim(),
          birthDate: formBirthDate,
          status: formStatus,
          department: formDepartment.trim()
        };
        saveAllEmployees(updatedEmployees);
        onNotify('従業員情報を更新しました。', 'success');
      }
    }

    setIsFormOpen(false);
  };

  // 従業員の削除
  const handleDelete = (emp: Employee) => {
    if (window.confirm(`従業員「${emp.name}」を削除しますか？\n※この企業内での受検履歴もすべて削除されます。`)) {
      const codeToDelete = emp.employeeCode;
      
      // 従業員マスタから削除
      const updatedEmployees = employees.filter(e => e.employeeCode !== codeToDelete);
      saveAllEmployees(updatedEmployees);

      // 紐付く受検結果も削除（自社のデータのみカスケード削除）
      const storedResults = localStorage.getItem('stress_check_results');
      if (storedResults) {
        const results: ExamineeResult[] = JSON.parse(storedResults);
        const updatedResults = results.filter(res => 
          !(res.corporationId === activeCorpId && res.employeeCode === codeToDelete)
        );
        localStorage.setItem('stress_check_results', JSON.stringify(updatedResults));
      }

      onNotify('従業員データを削除しました。', 'success');
    }
  };

  // 検索条件でのフィルタリング
  const filteredEmployees = employees.filter(emp => {
    const s = searchTerm.toLowerCase();
    return (
      emp.employeeCode.toLowerCase().includes(s) ||
      emp.name.toLowerCase().includes(s) ||
      emp.nameKana.toLowerCase().includes(s) ||
      emp.email.toLowerCase().includes(s)
    );
  });

  // ページネーション計算
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="employee-manager-container fade-in">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>従業員マスタ管理</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>受検対象となる全従業員の登録・編集・削除が行えます。</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          新規従業員登録
        </button>
      </div>

      {/* 検索バー */}
      <div className="search-box mb-6" style={{ position: 'relative' }}>
        <Search size={18} className="text-muted" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          className="form-control"
          placeholder="社員番号、氏名、カナ、メールで検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '40px' }}
        />
        {searchTerm && (
          <X 
            size={18} 
            className="text-muted" 
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }} 
            onClick={() => setSearchTerm('')} 
          />
        )}
      </div>

      <div className="flex gap-6 items-start flex-col md:flex-row">
        {/* 従業員一覧テーブル */}
        <div className="table-responsive w-full" style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>社員番号</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>氏名</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>性別</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>メールアドレス</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>ステータス</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    該当する従業員が見つかりません。
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => (
                  <tr key={emp.employeeCode} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row">
                    <td style={{ padding: '12px 16px', fontWeight: 600, fontFamily: 'monospace' }}>{emp.employeeCode}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500 }}>{emp.name}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{emp.nameKana} | {emp.department || '一般'}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`gender-badge ${emp.gender === 'male' ? 'male' : 'female'}`} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>
                        {emp.gender === 'male' ? '男性' : '女性'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{emp.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`status-badge ${emp.status}`} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>
                        {emp.status === 'active' ? '有効' : '無効'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div className="flex gap-2 justify-center">
                        <button className="icon-btn" onClick={() => handleOpenEdit(emp)} title="編集">
                          <Edit2 size={14} />
                        </button>
                        <button className="icon-btn delete" onClick={() => handleDelete(emp)} title="削除">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* ページネーションコントロールバー */}
          {filteredEmployees.length > 0 && (
            <div className="pagination-bar flex items-center justify-between p-4 border-t border-gray-200" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div className="text-muted" style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                全 <strong>{filteredEmployees.length}</strong> 件中 <strong>{filteredEmployees.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}〜{Math.min(filteredEmployees.length, currentPage * itemsPerPage)}</strong> 件を表示
              </div>

              <div className="flex gap-4 items-center" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* ページサイズセレクター */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>表示件数:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
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
                {totalPages > 1 && (
                  <div className="flex gap-1" style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="pagination-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      前へ
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                      <button
                        key={pageNum}
                        className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '4px',
                          border: '1px solid',
                          borderColor: currentPage === pageNum ? 'var(--primary)' : '#cbd5e1',
                          background: currentPage === pageNum ? 'linear-gradient(135deg, var(--primary) 0%, #1e3a8a 100%)' : 'white',
                          color: currentPage === pageNum ? 'white' : 'var(--text-main)',
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
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      次へ
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 登録・編集ドロワー（フォーム） */}
        {isFormOpen && (
          <div className="card admin-form-card fade-in" style={{ maxWidth: '380px', flexShrink: 0, padding: '1.5rem', background: 'white' }}>
            <div className="flex justify-between items-center mb-4 pb-2" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {editingEmployee ? '従業員情報の編集' : '新規従業員の登録'}
              </h3>
              <button 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} 
                onClick={() => setIsFormOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {validationError && (
              <div className="alert-badge error mb-4" style={{ borderRadius: '6px', fontSize: '0.8rem', padding: '8px' }}>
                <AlertCircle size={16} style={{ marginRight: '6px' }} />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>
                  社員番号 <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="例: EMP001"
                />
                {editingEmployee && editingEmployee.employeeCode !== formCode.trim() && (
                  <p className="text-muted mt-1" style={{ fontSize: '0.7rem', color: '#b45309' }}>
                    ⚠️ 社員番号を変更すると、紐付く受検履歴のコードもカスケード更新されます。
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>
                  氏名 <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例: 山田 太郎"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>
                  氏名（フリガナ）
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formNameKana}
                  onChange={(e) => setFormNameKana(e.target.value)}
                  placeholder="例: ヤマダ タロウ"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>
                  性別 <span style={{ color: 'red' }}>*</span>
                </label>
                <div className="flex gap-4">
                  <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="radio"
                      name="gender"
                      checked={formGender === 'male'}
                      onChange={() => setFormGender('male')}
                      style={{ marginRight: '6px' }}
                    />
                    男性
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="radio"
                      name="gender"
                      checked={formGender === 'female'}
                      onChange={() => setFormGender('female')}
                      style={{ marginRight: '6px' }}
                    />
                    女性
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>
                  メールアドレス <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="email"
                  className="form-control"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="例: example@company.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>
                  生年月日 <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={formBirthDate}
                  onChange={(e) => setFormBirthDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>
                  ステータス
                </label>
                <select
                  className="form-control"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                >
                  <option value="active">有効（受検可能）</option>
                  <option value="inactive">無効（休職・退職など）</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.85rem' }}>
                  所属部署
                </label>
                <select
                  className="form-control"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                >
                  <option value="技術開発部">技術開発部</option>
                  <option value="グローバル営業部">グローバル営業部</option>
                  <option value="人事総務部">人事総務部</option>
                  <option value="企画マーケティング部">企画マーケティング部</option>
                </select>
              </div>

              <div className="flex gap-2 mt-6">
                <button 
                  type="button" 
                  className="btn btn-outline w-full" 
                  onClick={() => setIsFormOpen(false)}
                  style={{ padding: '0.5rem' }}
                >
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary w-full"
                  style={{ padding: '0.5rem' }}
                >
                  保存する
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <style>{`
        .employee-manager-container {
          width: 100%;
        }
        .table-responsive {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .admin-table th, .admin-table td {
          border-bottom: 1px solid #f1f5f9;
        }
        .table-row:hover {
          background-color: #f8fafc;
        }
        .gender-badge.male {
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #dbeafe;
        }
        .gender-badge.female {
          background: #fdf2f8;
          color: #db2777;
          border: 1px solid #fce7f3;
        }
        .status-badge.active {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #dcfce7;
        }
        .status-badge.inactive {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
        }
        .icon-btn {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #475569;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .icon-btn:hover {
          background: #f1f5f9;
          color: var(--primary);
          border-color: var(--primary-light);
        }
        .icon-btn.delete:hover {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fca5a5;
        }
        .admin-form-card {
          box-shadow: var(--shadow), 0 0 0 1px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0 !important;
        }
      `}</style>
    </div>
  );
};
