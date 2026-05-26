import React, { useState, useEffect } from 'react';
import { Employee, ExamineeResult } from '../types';
import { Edit2, Trash2, Plus, Search, X, AlertCircle, Upload } from 'lucide-react';

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

  // CSVインポート状態
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedCSVItem[]>([]);
  const [hasImportErrors, setHasImportErrors] = useState(false);
  const [duplicateOption, setDuplicateOption] = useState<'overwrite' | 'skip'>('overwrite');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

      const cols = line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());

      const employeeCode = cols[0] || '';
      const name = cols[1] || '';
      const nameKana = cols[2] || '';
      const rawGender = cols[3] || 'male';
      const email = cols[4] || '';
      const birthDate = cols[5] || '';
      const department = cols[6] || '一般';

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

  const checkErrorsExist = (items: ParsedCSVItem[]) => {
    const hasError = items.some(item => Object.keys(item.errors).length > 0);
    setHasImportErrors(hasError);
  };

  const handleCellEdit = (itemId: number, field: keyof CSVRow, value: string) => {
    const updated = parsedItems.map(item => {
      if (item.id === itemId) {
        const newData = { ...item.data, [field]: value };
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

  const handleConfirmImport = () => {
    if (hasImportErrors) {
      onNotify('エラーが表示されているセルをすべて修正してください。', 'error');
      return;
    }

    // すでに存在する従業員リストを取得
    const storedEmployees = localStorage.getItem('stress_check_employees');
    const existingEmployees: Employee[] = storedEmployees ? JSON.parse(storedEmployees) : [];

    let addedCount = 0;
    let updatedCount = 0;
    const updatedList = [...existingEmployees];

    parsedItems.forEach(item => {
      const idx = updatedList.findIndex(e => e.corporationId === activeCorpId && e.employeeCode === item.data.employeeCode);
      const newEmp: Employee = {
        corporationId: activeCorpId,
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
    setParsedItems([]);
    setIsCsvModalOpen(false);

    // 従業員リストを更新
    const filteredEmps = updatedList.filter(e => e.corporationId === activeCorpId);
    setEmployees(filteredEmps);
    onNotify(`インポート成功：${addedCount}名を追加、${updatedCount}名を更新しました。`, 'success');
  };

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

  // 従業員のステータストグル
  const handleToggleStatus = (emp: Employee) => {
    const newStatus: 'active' | 'inactive' = emp.status === 'active' ? 'inactive' : 'active';
    const updatedEmployees = employees.map(e => {
      if (e.employeeCode === emp.employeeCode) {
        return { ...e, status: newStatus };
      }
      return e;
    });
    
    saveAllEmployees(updatedEmployees);
    onNotify(`従業員「${emp.name}」のステータスを${newStatus === 'active' ? '「有効」' : '「無効」'}に変更しました。`, 'success');
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
        <div className="flex gap-2" style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline" onClick={() => setIsCsvModalOpen(true)}>
            <Upload size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            CSV一括インポート
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            新規従業員登録
          </button>
        </div>
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
          {/* 上部ページネーションコントロールバー */}
          {filteredEmployees.length > 0 && (
            <div className="pagination-bar flex items-center justify-between p-4 border-b border-gray-200" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
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

          <table className="admin-table" style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600, width: '12%' }}>社員番号</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, width: '23%' }}>氏名</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center', width: '11%' }}>性別</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, width: '28%' }}>メールアドレス</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center', width: '15%' }}>ステータス</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center', width: '11%' }}>操作</th>
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
                    <td style={{ padding: '10px 12px', fontWeight: 600, fontFamily: 'monospace' }}>{emp.employeeCode}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.02em', marginBottom: '2px' }}>{emp.nameKana}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '3px' }}>{emp.name}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>{emp.department || '一般'}</div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}><span className={`gender-badge ${emp.gender === 'male' ? 'male' : 'female'}`}>{emp.gender === 'male' ? '男性' : '女性'}</span></td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{emp.email}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <label className="status-switch" style={{ margin: '0 auto' }} title={emp.status === 'active' ? '無効（一時休職など）にする' : '有効にする'}>
                        <input
                          type="checkbox"
                          checked={emp.status === 'active'}
                          onChange={() => handleToggleStatus(emp)}
                        />
                        <span className="status-slider"></span>
                        <span className="status-switch-label">
                          {emp.status === 'active' ? '有効' : '無効'}
                        </span>
                      </label>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
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
      </div>

      {/* 登録・編集モーダル（ダイアログ形式） */}
      {isFormOpen && (
        <div className="csv-modal-overlay" onClick={() => setIsFormOpen(false)}>
          <div className="admin-form-modal-card card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', padding: '1.5rem', background: 'white' }}>
            <div className="flex justify-between items-center mb-4 pb-2" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {editingEmployee ? '従業員情報の編集' : '新規従業員の登録'}
              </h3>
              <button 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} 
                onClick={() => setIsFormOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {validationError && (
              <div className="alert-badge error mb-4" style={{ borderRadius: '6px', fontSize: '0.8rem', padding: '8px' }}>
                <AlertCircle size={16} style={{ marginRight: '6px' }} />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    社員番号 <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="例: EMP001"
                    disabled={!!editingEmployee}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
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
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
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

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
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

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    性別 <span style={{ color: 'red' }}>*</span>
                  </label>
                  <div className="flex gap-4" style={{ display: 'flex', gap: '16px', height: '38px', alignItems: 'center' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="radio"
                        name="gender"
                        checked={formGender === 'male'}
                        onChange={() => setFormGender('male')}
                        style={{ marginRight: '6px' }}
                      />
                      男性
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
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

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    生年月日 <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={formBirthDate}
                    onChange={(e) => setFormBirthDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
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

              {editingEmployee && editingEmployee.employeeCode !== formCode.trim() && (
                <p className="text-muted mt-2" style={{ fontSize: '0.75rem', color: '#b45309', background: '#fffbeb', padding: '6px 10px', borderRadius: '4px', border: '1px solid #fef3c7' }}>
                  ⚠️ 社員番号を変更すると、紐付く受検履歴のコードもカスケード更新されます。
                </p>
              )}

              <div className="flex gap-2 mt-6" style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-outline w-full" 
                  onClick={() => setIsFormOpen(false)}
                  style={{ padding: '0.65rem' }}
                >
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary w-full"
                  style={{ padding: '0.65rem' }}
                >
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSVインポートモーダル */}
      {isCsvModalOpen && (
        <div className="csv-modal-overlay" onClick={() => setIsCsvModalOpen(false)}>
          <div className="csv-modal-card card" onClick={(e) => e.stopPropagation()}>
            <div className="csv-modal-header">
              <div>
                <h3 className="csv-modal-title">CSV一括インポート</h3>
                <p className="csv-modal-subtitle">従業員データをCSVから一括で登録・更新します。</p>
              </div>
              <button className="csv-modal-close" onClick={() => setIsCsvModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="csv-modal-body">
              <div className="csv-config-row">
                <div className="csv-config-label">
                  📁 重複する社員番号の処理:
                </div>
                <select
                  value={duplicateOption}
                  onChange={(e) => setDuplicateOption(e.target.value as 'overwrite' | 'skip')}
                  className="csv-config-select"
                >
                  <option value="overwrite">上書き（既存のデータを更新）</option>
                  <option value="skip">スキップ（既存のデータを維持）</option>
                </select>
              </div>

              {/* ドラッグ＆ドロップゾーン */}
              {parsedItems.length === 0 ? (
                <div
                  className="csv-dropzone-box"
                  onDragOver={handleDragOver}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={40} className="csv-dropzone-icon" />
                  <p className="csv-dropzone-text-primary">CSVファイルをドラッグ＆ドロップしてください</p>
                  <p className="csv-dropzone-text-secondary">または、ここをクリックしてファイルを選択</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    accept=".csv"
                  />
                </div>
              ) : (
                <div className="parsed-items-section">
                  <div className="parsed-items-summary" style={{ background: hasImportErrors ? '#fef2f2' : '#f0fdf4', borderColor: hasImportErrors ? '#fca5a5' : '#bbf7d0' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: hasImportErrors ? '#991b1b' : '#15803d' }}>
                      {hasImportErrors
                        ? `⚠️ ${parsedItems.filter(p => Object.keys(p.errors).length > 0).length}行にエラーがあります。セルを直接編集して修正してください。`
                        : '✨ すべてのデータの検証が完了しました！エラーはありません。'}
                    </span>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', height: 'auto', border: '1px solid #cbd5e1' }}
                      onClick={() => setParsedItems([])}
                    >
                      クリア
                    </button>
                  </div>

                  {/* スマートグリッドエディタ */}
                  <div className="csv-grid-wrapper">
                    <table className="csv-grid-table">
                      <thead>
                        <tr>
                          <th>社員番号</th>
                          <th>氏名</th>
                          <th>氏名(カナ)</th>
                          <th>性別</th>
                          <th>メールアドレス</th>
                          <th>生年月日</th>
                          <th>部署</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedItems.map(item => (
                          <tr key={item.id}>
                            <td className={item.errors.employeeCode ? 'cell-error' : ''} title={item.errors.employeeCode}>
                              <input
                                type="text"
                                value={item.data.employeeCode}
                                onChange={(e) => handleCellEdit(item.id, 'employeeCode', e.target.value)}
                                className="csv-grid-input"
                              />
                            </td>
                            <td className={item.errors.name ? 'cell-error' : ''} title={item.errors.name}>
                              <input
                                type="text"
                                value={item.data.name}
                                onChange={(e) => handleCellEdit(item.id, 'name', e.target.value)}
                                className="csv-grid-input"
                              />
                            </td>
                            <td className={item.errors.nameKana ? 'cell-error' : ''} title={item.errors.nameKana}>
                              <input
                                type="text"
                                value={item.data.nameKana}
                                onChange={(e) => handleCellEdit(item.id, 'nameKana', e.target.value)}
                                className="csv-grid-input"
                              />
                            </td>
                            <td>
                              <select
                                value={item.data.gender}
                                onChange={(e) => handleCellEdit(item.id, 'gender', e.target.value)}
                                className="csv-grid-select"
                              >
                                <option value="male">男性</option>
                                <option value="female">女性</option>
                              </select>
                            </td>
                            <td className={item.errors.email ? 'cell-error' : ''} title={item.errors.email}>
                              <input
                                type="email"
                                value={item.data.email}
                                onChange={(e) => handleCellEdit(item.id, 'email', e.target.value)}
                                className="csv-grid-input"
                              />
                            </td>
                            <td className={item.errors.birthDate ? 'cell-error' : ''} title={item.errors.birthDate}>
                              <input
                                type="text"
                                value={item.data.birthDate}
                                onChange={(e) => handleCellEdit(item.id, 'birthDate', e.target.value)}
                                className="csv-grid-input"
                                placeholder="YYYY-MM-DD"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={item.data.department}
                                onChange={(e) => handleCellEdit(item.id, 'department', e.target.value)}
                                className="csv-grid-input"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="csv-modal-info">
                📝 <strong>推奨ヘッダー構成:</strong> 社員番号, 氏名, 氏名（カナ）, 性別, メールアドレス, 生年月日, 部署
                <br />
                ※ 1行目はヘッダー行として無視されます。
              </div>
            </div>

            <div className="csv-modal-footer">
              <button className="btn btn-outline" onClick={() => setIsCsvModalOpen(false)}>
                閉じる
              </button>
              {parsedItems.length > 0 && (
                <button
                  className="btn btn-primary"
                  disabled={hasImportErrors}
                  onClick={handleConfirmImport}
                >
                  インポート確定 ({parsedItems.length} 名)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .employee-manager-container {
          width: 100%;
        }
        .table-responsive {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          width: 100%;
        }
        .admin-table {
          min-width: 720px;
        }
        .admin-table th, .admin-table td {
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .table-row:hover {
          background-color: #f8fafc;
        }
        .gender-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 2px 10px;
          border-radius: 6px;
          min-width: 56px;
          height: 22px;
          line-height: 1;
          text-align: center;
          transition: all 0.2s ease;
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
        /* トグルスイッチUI */
        .status-switch {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
        }
        .status-switch input {
          opacity: 0;
          width: 0;
          height: 0;
          position: absolute;
        }
        .status-slider {
          position: relative;
          display: inline-block;
          width: 36px;
          height: 20px;
          background-color: #cbd5e1;
          border-radius: 20px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        .status-slider::before {
          position: absolute;
          content: "";
          height: 14px;
          width: 14px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          border-radius: 50%;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }
        .status-switch input:checked + .status-slider {
          background: linear-gradient(135deg, var(--primary) 0%, #1e3a8a 100%);
        }
        .status-switch input:checked + .status-slider::before {
          transform: translateX(16px);
        }
        .status-switch:hover .status-slider {
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.15), 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
        .status-switch-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
          transition: color 0.2s ease;
          min-width: 28px;
        }
        .status-switch input:checked ~ .status-switch-label {
          color: #16a34a;
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
        .admin-form-modal-card {
          background: rgba(255, 255, 255, 0.95);
          width: 100%;
          max-width: 480px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          backdrop-filter: blur(20px);
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* CSV Import Modal Glassmorphic Design Styles */
        .csv-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: fadeIn 0.25s ease-out;
        }
        
        .csv-modal-card {
          background: rgba(255, 255, 255, 0.85);
          width: 100%;
          max-width: 900px;
          max-height: 85vh;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          backdrop-filter: blur(20px);
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .csv-modal-header {
          padding: 16px 24px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(248, 250, 252, 0.5);
        }
        
        .csv-modal-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: rgba(15, 23, 42, 0.9);
        }
        
        .csv-modal-subtitle {
          margin: 4px 0 0 0;
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        
        .csv-modal-close {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .csv-modal-close:hover {
          background: rgba(0, 0, 0, 0.05);
          color: var(--text-main);
        }
        
        .csv-modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .csv-config-row {
          display: flex;
          gap: 12px;
          align-items: center;
          background: rgba(241, 245, 249, 0.5);
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid rgba(226, 232, 240, 0.8);
        }
        
        .csv-config-label {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-main);
        }
        
        .csv-config-select {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-size: 0.88rem;
          outline: none;
          font-weight: 500;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .csv-config-select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        
        .csv-dropzone-box {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 48px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(248, 250, 252, 0.5);
        }
        
        .csv-dropzone-box:hover {
          border-color: var(--primary);
          background: rgba(239, 246, 255, 0.5);
        }
        
        .csv-dropzone-icon {
          color: var(--primary);
          margin-bottom: 4px;
        }
        
        .csv-dropzone-text-primary {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }
        
        .csv-dropzone-text-secondary {
          font-size: 0.82rem;
          color: var(--text-muted);
          margin: 0;
        }
        
        .parsed-items-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .parsed-items-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid;
          gap: 12px;
        }
        
        .csv-grid-wrapper {
          max-height: 320px;
          overflow: auto;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
        }
        
        .csv-grid-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
          text-align: left;
        }
        
        .csv-grid-table th {
          background: #f8fafc;
          padding: 10px 12px;
          border-bottom: 2px solid #e2e8f0;
          font-weight: 600;
          color: #475569;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .csv-grid-table td {
          padding: 4px 6px;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .csv-grid-table td.cell-error {
          background: #fff5f5;
        }
        
        .csv-grid-table td.cell-error .csv-grid-input {
          color: #991b1b;
          border-color: #fca5a5;
          background: #fff5f5;
        }
        
        .csv-grid-table td.cell-error .csv-grid-input:focus {
          border-color: #ef4444;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1);
        }
        
        .csv-grid-input {
          width: 100%;
          border: 1px solid transparent;
          padding: 6px 8px;
          border-radius: 4px;
          font-size: 0.82rem;
          transition: all 0.2s;
          background: transparent;
        }
        
        .csv-grid-input:hover {
          border-color: #cbd5e1;
          background: white;
        }
        
        .csv-grid-input:focus {
          border-color: var(--primary);
          background: white;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
          outline: none;
        }
        
        .csv-grid-select {
          width: 100%;
          border: 1px solid transparent;
          padding: 6px 8px;
          border-radius: 4px;
          font-size: 0.82rem;
          transition: all 0.2s;
          background: transparent;
          outline: none;
          cursor: pointer;
        }
        
        .csv-grid-select:hover {
          border-color: #cbd5e1;
          background: white;
        }
        
        .csv-grid-select:focus {
          border-color: var(--primary);
          background: white;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        
        .csv-modal-info {
          font-size: 0.78rem;
          color: var(--text-muted);
          background: #f8fafc;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
          line-height: 1.6;
        }
        
        .csv-modal-footer {
          padding: 16px 24px;
          border-top: 1px solid rgba(226, 232, 240, 0.8);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: rgba(248, 250, 252, 0.5);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
