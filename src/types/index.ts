import { Gender } from '../utils/scoring';

export interface Employee {
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
