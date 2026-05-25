import { Gender } from '../utils/scoring';

export interface Corporation {
  corporationId: string; // 企業コード (一意)
  name: string;          // 企業名
  plan: 'basic' | 'premium' | 'enterprise'; // 契約プラン
  status: 'active' | 'suspended';           // 契約ステータス
  createdAt: string;     // 登録日 (YYYY-MM-DD)
}

export interface CorporateUser {
  userId: string;        // ユーザーID/コード (一意)
  corporationId: string; // 所属企業コード (FK)
  name: string;          // 管理者名
  email: string;         // メールアドレス
  role: 'admin' | 'practitioner'; // 権限: 実施管理者 | 共同閲覧者
  status: 'active' | 'inactive';  // ステータス
}

export interface Employee {
  corporationId: string; // 所属企業コード (FK)
  employeeCode: string;
  name: string;
  nameKana: string;
  gender: Gender;
  email: string;
  birthDate: string;
  status: 'active' | 'inactive';
  department: string; // 部署情報（組織分析に使用）
}

export interface CampaignSettings {
  campaignName: string;
  startDate: string; // YYYY-MM-DDTHH:MM
  endDate: string; // YYYY-MM-DDTHH:MM
  customNoticeStart: string;
  customNoticeHighStress: string;
  status: 'preparing' | 'active' | 'finished';
}

export interface ConsentSettings {
  useConsent: boolean;
  discloseLabel: string; // e.g., "事業者", "〇〇株式会社"
  discloseNotice: string;
  consentTiming: 'before' | 'after'; // before questionnaire starting, or after answering
}

export interface InterviewSettings {
  displayCondition: 'all' | 'high_stress_only' | 'recommended_only' | 'disabled';
  requireDisclosure: 'required' | 'optional' | 'none';
  receptionDays: number;
  notificationEmails: string; // Comma separated emails
}

export interface InterviewDetails {
  phone: string;
  email: string;
  preferredSlots: string[]; // 3 choice slots
  comments: string;
}

export interface ExamineeResult {
  id: string; // Unique submission id
  corporationId: string; // 受検時の所属企業コード
  employeeCode: string;
  campaignName: string; // Campaign identifier
  answers: Record<number, number>;
  subscales: Record<string, number>;
  totalReactionScore: number;
  totalStressorSupportScore: number;
  isHighStress: boolean;
  consentDisclose: boolean; // Agreed to disclose or not
  requestInterview: boolean;
  interviewDetails?: InterviewDetails;
  completedAt: string; // ISO datetime string
}
