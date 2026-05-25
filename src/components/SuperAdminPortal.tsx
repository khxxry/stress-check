import React, { useState, useEffect } from 'react';
import { Corporation, CorporateUser } from '../types';
import { Building2, Users2, Plus, Search, Edit2, Trash2, X, AlertCircle, ShieldAlert } from 'lucide-react';

interface SuperAdminPortalProps {
  onNotify: (message: string, type: 'success' | 'error') => void;
  onLogout?: () => void;
}

export const SuperAdminPortal: React.FC<SuperAdminPortalProps> = ({ onNotify, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'corporations' | 'corporate_users'>('corporations');
  
  // 状態管理
  const [corporations, setCorporations] = useState<Corporation[]>([]);
  const [corporateUsers, setCorporateUsers] = useState<CorporateUser[]>([]);
  
  // 検索・フィルター状態
  const [corpSearch, setCorpSearch] = useState('');
  const [corpPlanFilter, setCorpPlanFilter] = useState<string>('all');
  const [corpStatusFilter, setCorpStatusFilter] = useState<string>('all');
  
  const [userSearch, setUserSearch] = useState('');
  const [userCorpFilter, setUserCorpFilter] = useState<string>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');

  // モーダル・フォーム状態
  const [isCorpFormOpen, setIsCorpFormOpen] = useState(false);
  const [editingCorp, setEditingCorp] = useState<Corporation | null>(null);
  const [corpId, setCorpId] = useState('');
  const [corpName, setCorpName] = useState('');
  const [corpPlan, setCorpPlan] = useState<'basic' | 'premium' | 'enterprise'>('basic');
  const [corpStatus, setCorpStatus] = useState<'active' | 'suspended'>('active');

  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CorporateUser | null>(null);
  const [userId, setUserId] = useState('');
  const [userCorpId, setUserCorpId] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'practitioner'>('admin');
  const [userStatus, setUserStatus] = useState<'active' | 'inactive'>('active');

  const [validationError, setValidationError] = useState('');

  // ローカルストレージからデータを読み込む
  useEffect(() => {
    const storedCorps = localStorage.getItem('stress_check_corporations');
    if (storedCorps) {
      setCorporations(JSON.parse(storedCorps));
    }
    
    const storedUsers = localStorage.getItem('stress_check_corporate_users');
    if (storedUsers) {
      setCorporateUsers(JSON.parse(storedUsers));
    }
  }, []);

  // 企業追加・編集フォームを開く
  const handleOpenCorpAdd = () => {
    setEditingCorp(null);
    setCorpId('');
    setCorpName('');
    setCorpPlan('basic');
    setCorpStatus('active');
    setValidationError('');
    setIsCorpFormOpen(true);
  };

  const handleOpenCorpEdit = (corp: Corporation) => {
    setEditingCorp(corp);
    setCorpId(corp.corporationId);
    setCorpName(corp.name);
    setCorpPlan(corp.plan);
    setCorpStatus(corp.status);
    setValidationError('');
    setIsCorpFormOpen(true);
  };

  // 企業保存
  const handleSaveCorp = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!corpId.trim()) {
      setValidationError('企業コードを入力してください。');
      return;
    }
    if (!corpName.trim()) {
      setValidationError('企業名を入力してください。');
      return;
    }

    const cleanedCorpId = corpId.trim().toUpperCase();
    const updatedCorps = [...corporations];

    if (editingCorp === null) {
      // 重複チェック
      const exists = corporations.some(c => c.corporationId === cleanedCorpId);
      if (exists) {
        setValidationError('この企業コードは既に登録されています。');
        return;
      }

      const newCorp: Corporation = {
        corporationId: cleanedCorpId,
        name: corpName.trim(),
        plan: corpPlan,
        status: corpStatus,
        createdAt: new Date().toISOString().split('T')[0]
      };

      updatedCorps.push(newCorp);
      onNotify('企業マスタを登録しました。', 'success');
    } else {
      // 編集
      const oldCorpId = editingCorp.corporationId;
      if (oldCorpId !== cleanedCorpId) {
        const exists = corporations.some(c => c.corporationId === cleanedCorpId);
        if (exists) {
          setValidationError('変更後の企業コードは既に他の企業で使用されています。');
          return;
        }

        // 企業コード変更時のカスケードアップデート
        // 1. 企業ユーザーの所属企業コードを更新
        const storedUsers = localStorage.getItem('stress_check_corporate_users');
        if (storedUsers) {
          const users: CorporateUser[] = JSON.parse(storedUsers);
          const updatedUsers = users.map(u => {
            if (u.corporationId === oldCorpId) {
              return { ...u, corporationId: cleanedCorpId };
            }
            return u;
          });
          localStorage.setItem('stress_check_corporate_users', JSON.stringify(updatedUsers));
          setCorporateUsers(updatedUsers);
        }

        // 2. 従業員マスタの所属企業コードを更新
        const storedEmployees = localStorage.getItem('stress_check_employees');
        if (storedEmployees) {
          const emps = JSON.parse(storedEmployees);
          const updatedEmps = emps.map((emp: any) => {
            if (emp.corporationId === oldCorpId) {
              return { ...emp, corporationId: cleanedCorpId };
            }
            return emp;
          });
          localStorage.setItem('stress_check_employees', JSON.stringify(updatedEmps));
        }

        // 3. 受検結果履歴の所属企業コードを更新
        const storedResults = localStorage.getItem('stress_check_results');
        if (storedResults) {
          const results = JSON.parse(storedResults);
          const updatedResults = results.map((res: any) => {
            if (res.corporationId === oldCorpId) {
              return { ...res, corporationId: cleanedCorpId };
            }
            return res;
          });
          localStorage.setItem('stress_check_results', JSON.stringify(updatedResults));
        }

        // 4. キャンペーン設定等のLocalStorageキー名変更(可能であれば。または次回ロード時に同期)
        const campaign = localStorage.getItem(`stress_check_campaign_${oldCorpId}`);
        if (campaign) {
          localStorage.setItem(`stress_check_campaign_${cleanedCorpId}`, campaign);
          localStorage.removeItem(`stress_check_campaign_${oldCorpId}`);
        }
        const consent = localStorage.getItem(`stress_check_consent_${oldCorpId}`);
        if (consent) {
          localStorage.setItem(`stress_check_consent_${cleanedCorpId}`, consent);
          localStorage.removeItem(`stress_check_consent_${oldCorpId}`);
        }
        const interview = localStorage.getItem(`stress_check_interview_${oldCorpId}`);
        if (interview) {
          localStorage.setItem(`stress_check_interview_${cleanedCorpId}`, interview);
          localStorage.removeItem(`stress_check_interview_${oldCorpId}`);
        }
      }

      const index = corporations.findIndex(c => c.corporationId === oldCorpId);
      if (index !== -1) {
        updatedCorps[index] = {
          corporationId: cleanedCorpId,
          name: corpName.trim(),
          plan: corpPlan,
          status: corpStatus,
          createdAt: editingCorp.createdAt
        };
        onNotify('企業情報を更新しました。', 'success');
      }
    }

    setCorporations(updatedCorps);
    localStorage.setItem('stress_check_corporations', JSON.stringify(updatedCorps));
    setIsCorpFormOpen(false);
  };

  // 企業削除
  const handleDeleteCorp = (corp: Corporation) => {
    if (window.confirm(`企業「${corp.name} (${corp.corporationId})」を削除しますか？\n※この企業に紐付く「企業管理者」「従業員マスタ」「受検履歴」もすべて完全に削除されます。この操作は取り消せません。`)) {
      const targetId = corp.corporationId;
      
      // 1. 企業マスタ削除
      const updatedCorps = corporations.filter(c => c.corporationId !== targetId);
      setCorporations(updatedCorps);
      localStorage.setItem('stress_check_corporations', JSON.stringify(updatedCorps));

      // 2. 企業ユーザー削除
      const updatedUsers = corporateUsers.filter(u => u.corporationId !== targetId);
      setCorporateUsers(updatedUsers);
      localStorage.setItem('stress_check_corporate_users', JSON.stringify(updatedUsers));

      // 3. 従業員マスタ削除
      const storedEmployees = localStorage.getItem('stress_check_employees');
      if (storedEmployees) {
        const emps = JSON.parse(storedEmployees);
        const updatedEmps = emps.filter((emp: any) => emp.corporationId !== targetId);
        localStorage.setItem('stress_check_employees', JSON.stringify(updatedEmps));
      }

      // 4. 受検履歴削除
      const storedResults = localStorage.getItem('stress_check_results');
      if (storedResults) {
        const results = JSON.parse(storedResults);
        const updatedResults = results.filter((res: any) => res.corporationId !== targetId);
        localStorage.setItem('stress_check_results', JSON.stringify(updatedResults));
      }

      // 5. 各種設定キーの削除
      localStorage.removeItem(`stress_check_campaign_${targetId}`);
      localStorage.removeItem(`stress_check_consent_${targetId}`);
      localStorage.removeItem(`stress_check_interview_${targetId}`);

      onNotify('企業データおよび関連する全データを削除しました。', 'success');
    }
  };

  // 管理者アカウント追加・編集フォームを開く
  const handleOpenUserAdd = () => {
    setEditingUser(null);
    setUserId('');
    setUserCorpId(corporations.length > 0 ? corporations[0].corporationId : '');
    setUserName('');
    setUserEmail('');
    setUserRole('admin');
    setUserStatus('active');
    setValidationError('');
    setIsUserFormOpen(true);
  };

  const handleOpenUserEdit = (user: CorporateUser) => {
    setEditingUser(user);
    setUserId(user.userId);
    setUserCorpId(user.corporationId);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserStatus(user.status);
    setValidationError('');
    setIsUserFormOpen(true);
  };

  // 管理者アカウント保存
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!userId.trim()) {
      setValidationError('ユーザーIDを入力してください。');
      return;
    }
    if (!userCorpId) {
      setValidationError('所属企業を選択してください。');
      return;
    }
    if (!userName.trim()) {
      setValidationError('氏名を入力してください。');
      return;
    }
    if (!userEmail.trim() || !userEmail.includes('@')) {
      setValidationError('有効なメールアドレスを入力してください。');
      return;
    }

    const cleanedUserId = userId.trim();
    const updatedUsers = [...corporateUsers];

    if (editingUser === null) {
      // 重複チェック
      const exists = corporateUsers.some(u => u.userId === cleanedUserId);
      if (exists) {
        setValidationError('このユーザーIDは既に登録されています。');
        return;
      }

      const newUser: CorporateUser = {
        userId: cleanedUserId,
        corporationId: userCorpId,
        name: userName.trim(),
        email: userEmail.trim(),
        role: userRole,
        status: userStatus
      };

      updatedUsers.push(newUser);
      onNotify('企業管理者を登録しました。', 'success');
    } else {
      // 編集
      const oldUserId = editingUser.userId;
      if (oldUserId !== cleanedUserId) {
        const exists = corporateUsers.some(u => u.userId === cleanedUserId);
        if (exists) {
          setValidationError('変更後のユーザーIDは既に他のユーザーで使用されています。');
          return;
        }
      }

      const index = corporateUsers.findIndex(u => u.userId === oldUserId);
      if (index !== -1) {
        updatedUsers[index] = {
          userId: cleanedUserId,
          corporationId: userCorpId,
          name: userName.trim(),
          email: userEmail.trim(),
          role: userRole,
          status: userStatus
        };
        onNotify('企業管理者情報を更新しました。', 'success');
      }
    }

    setCorporateUsers(updatedUsers);
    localStorage.setItem('stress_check_corporate_users', JSON.stringify(updatedUsers));
    setIsUserFormOpen(false);
  };

  // 管理者アカウント削除
  const handleDeleteUser = (user: CorporateUser) => {
    if (window.confirm(`企業管理者「${user.name} (${user.userId})」を削除しますか？`)) {
      const updatedUsers = corporateUsers.filter(u => u.userId !== user.userId);
      setCorporateUsers(updatedUsers);
      localStorage.setItem('stress_check_corporate_users', JSON.stringify(updatedUsers));
      onNotify('企業管理者を削除しました。', 'success');
    }
  };

  // フィルタリング処理 - 企業
  const filteredCorporations = corporations.filter(c => {
    const matchesSearch = c.corporationId.toLowerCase().includes(corpSearch.toLowerCase()) || 
                          c.name.toLowerCase().includes(corpSearch.toLowerCase());
    const matchesPlan = corpPlanFilter === 'all' || c.plan === corpPlanFilter;
    const matchesStatus = corpStatusFilter === 'all' || c.status === corpStatusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  // フィルタリング処理 - 企業ユーザー
  const filteredUsers = corporateUsers.filter(u => {
    const matchesSearch = u.userId.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesCorp = userCorpFilter === 'all' || u.corporationId === userCorpFilter;
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchesSearch && matchesCorp && matchesRole;
  });

  // プランバッジの描画
  const renderPlanBadge = (plan: 'basic' | 'premium' | 'enterprise') => {
    const classes = {
      basic: 'plan-badge-basic',
      premium: 'plan-badge-premium',
      enterprise: 'plan-badge-enterprise'
    };
    const labels = {
      basic: 'Basic',
      premium: 'Premium',
      enterprise: 'Enterprise'
    };
    return <span className={`plan-badge ${classes[plan]}`}>{labels[plan]}</span>;
  };

  // ステータスバッジの描画
  const renderStatusBadge = (status: 'active' | 'suspended' | 'inactive') => {
    const isActive = status === 'active';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        isActive 
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      }`}>
        <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
        {status === 'active' ? '有効' : status === 'suspended' ? '一時停止' : '無効'}
      </span>
    );
  };

  return (
    <div className="super-admin-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      <div className="super-admin-header mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-primary" />
          システム管理者ポータル <span className="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">SaaS Multi-Tenant Mode</span>
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          企業マスタ（テナント）の登録・管理、および企業側の管理者アカウントのプロビジョニングを行います。各テナントのデータは完全に分離されます。
        </p>
      </div>

      {/* タブ切り替え */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex" style={{ display: 'flex' }}>
          <button
            onClick={() => setActiveTab('corporations')}
            className={`flex items-center gap-2 py-4 px-6 border-b-2 font-medium text-sm transition-all duration-200 ${
              activeTab === 'corporations'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building2 className="w-4.5 h-4.5 mr-1" />
            企業マスタ管理 ({corporations.length})
          </button>
          <button
            onClick={() => setActiveTab('corporate_users')}
            className={`flex items-center gap-2 py-4 px-6 border-b-2 font-medium text-sm transition-all duration-200 ${
              activeTab === 'corporate_users'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users2 className="w-4.5 h-4.5 mr-1" />
            企業管理者アカウント管理 ({corporateUsers.length})
          </button>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="btn btn-outline"
            style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}
          >
            <X className="w-4 h-4" />
            管理者ログアウト
          </button>
        )}
      </div>

      {/* タブコンテンツ: 企業マスタ管理 */}
      {activeTab === 'corporations' && (
        <div>
          {/* コントロールパネル */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-3 flex-1 min-w-[300px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="企業コード、企業名で検索..."
                  value={corpSearch}
                  onChange={(e) => setCorpSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <select
                value={corpPlanFilter}
                onChange={(e) => setCorpPlanFilter(e.target.value)}
                className="py-2 px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">全プラン</option>
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <select
                value={corpStatusFilter}
                onChange={(e) => setCorpStatusFilter(e.target.value)}
                className="py-2 px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">全ステータス</option>
                <option value="active">有効</option>
                <option value="suspended">一時停止</option>
              </select>
            </div>
            
            <button
              onClick={handleOpenCorpAdd}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              企業を新規登録
            </button>
          </div>

          {/* 企業一覧テーブル */}
          <div className="bg-white dark:bg-gray-850 shadow overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">企業コード</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">企業名</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">契約プラン</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ステータス</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">登録日</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">アクション</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-850 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCorporations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                        該当する企業情報が見つかりません。
                      </td>
                    </tr>
                  ) : (
                    filteredCorporations.map((corp) => (
                      <tr key={corp.corporationId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">{corp.corporationId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">{corp.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{renderPlanBadge(corp.plan)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{renderStatusBadge(corp.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{corp.createdAt}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenCorpEdit(corp)}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                              title="編集"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCorp(corp)}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* タブコンテンツ: 企業管理者アカウント管理 */}
      {activeTab === 'corporate_users' && (
        <div>
          {/* コントロールパネル */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-3 flex-1 min-w-[300px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ユーザーID、氏名、メールアドレスで検索..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <select
                value={userCorpFilter}
                onChange={(e) => setUserCorpFilter(e.target.value)}
                className="py-2 px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">全所属企業</option>
                {corporations.map(c => (
                  <option key={c.corporationId} value={c.corporationId}>{c.name}</option>
                ))}
              </select>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="py-2 px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">全権限</option>
                <option value="admin">実施管理者</option>
                <option value="practitioner">共同閲覧者</option>
              </select>
            </div>
            
            <button
              onClick={handleOpenUserAdd}
              disabled={corporations.length === 0}
              className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              管理者を新規登録
            </button>
          </div>

          {corporations.length === 0 && (
            <div className="p-4 mb-6 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-xl flex items-center gap-3 border border-amber-200 dark:border-amber-900">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>企業が1件も登録されていません。企業管理者を登録する前に「企業マスタ」を1件以上登録してください。</span>
            </div>
          )}

          {/* 企業ユーザー一覧テーブル */}
          <div className="bg-white dark:bg-gray-850 shadow overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ユーザーID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">氏名</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">所属企業</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">メールアドレス</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">権限</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ステータス</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">アクション</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-850 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                        該当する企業管理者情報が見つかりません。
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const corp = corporations.find(c => c.corporationId === user.corporationId);
                      return (
                        <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{user.userId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-950 dark:text-gray-100">{user.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-semibold text-gray-900 dark:text-white">{corp?.name || '不明'}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">({user.corporationId})</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              user.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {user.role === 'admin' ? '実施管理者' : '共同閲覧者'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{renderStatusBadge(user.status)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleOpenUserEdit(user)}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                title="編集"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="削除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 企業登録・編集モーダル */}
      {isCorpFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsCorpFormOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-850 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200 dark:border-gray-700">
              <form onSubmit={handleSaveCorp}>
                <div className="bg-white dark:bg-gray-850 px-6 pt-6 pb-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white" id="modal-title">
                      {editingCorp === null ? '新規企業の登録' : '企業情報の編集'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsCorpFormOpen(false)}
                      className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {validationError && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded-lg flex items-center gap-2 border border-red-200 dark:border-red-900 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        企業コード (テナントID) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="例: CORP001 (一意の英数字)"
                        value={corpId}
                        onChange={(e) => setCorpId(e.target.value)}
                        disabled={editingCorp !== null}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-900"
                        required
                      />
                      <p className="text-xs text-gray-400 mt-1">※登録後の企業コードの変更は推奨されません（関連データも自動で更新されますが、不整合を防ぐため慎重に指定してください）。</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        企業名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="例: 株式会社テクノロジーラボ"
                        value={corpName}
                        onChange={(e) => setCorpName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          契約プラン
                        </label>
                        <select
                          value={corpPlan}
                          onChange={(e) => setCorpPlan(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="basic">Basic (基本機能)</option>
                          <option value="premium">Premium (組織分析・CSV)</option>
                          <option value="enterprise">Enterprise (全機能・専用)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          契約ステータス
                        </label>
                        <select
                          value={corpStatus}
                          onChange={(e) => setCorpStatus(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="active">有効</option>
                          <option value="suspended">一時停止</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setIsCorpFormOpen(false)}
                    className="btn btn-secondary"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    {editingCorp === null ? '登録する' : '更新する'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 企業管理者登録・編集モーダル */}
      {isUserFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsUserFormOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-850 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200 dark:border-gray-700">
              <form onSubmit={handleSaveUser}>
                <div className="bg-white dark:bg-gray-850 px-6 pt-6 pb-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white" id="modal-title">
                      {editingUser === null ? '新規企業管理者の登録' : '企業管理者情報の編集'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsUserFormOpen(false)}
                      className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {validationError && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded-lg flex items-center gap-2 border border-red-200 dark:border-red-900 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          ユーザーID (ログイン用) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="例: USER001"
                          value={userId}
                          onChange={(e) => setUserId(e.target.value)}
                          disabled={editingUser !== null}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-900"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          所属企業 <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={userCorpId}
                          onChange={(e) => setUserCorpId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        >
                          {corporations.map(c => (
                            <option key={c.corporationId} value={c.corporationId}>{c.name} ({c.corporationId})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        氏名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="例: 佐藤 健太"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        メールアドレス <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="例: sato@example.com"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          管理者権限区分
                        </label>
                        <select
                          value={userRole}
                          onChange={(e) => setUserRole(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="admin">実施管理者 (全権限)</option>
                          <option value="practitioner">共同閲覧者 (閲覧のみ)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          ステータス
                        </label>
                        <select
                          value={userStatus}
                          onChange={(e) => setUserStatus(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="active">有効</option>
                          <option value="inactive">無効 (ログイン不可)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setIsUserFormOpen(false)}
                    className="btn btn-secondary"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    {editingUser === null ? '登録する' : '更新する'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
