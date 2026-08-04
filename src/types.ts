/**
 * 财务分析工具 - TypeScript类型定义
 */

// ============ 数据模型 ============

/**
 * 指标数据结构
 */
export interface MetricData {
  orders?: number;
  gmv?: number;
  revenue?: number;
  profit?: number;
  expense?: number;
  [key: string]: number | undefined;
}

/**
 * 城市数据结构
 */
export interface CityData {
  name: string;
  displayName?: string;
  metrics: MetricData;
  modules?: ModuleData;
}

/**
 * 商家类型
 */
export type MerchantType = 'all' | 'city' | 'ka';

/**
 * 模块数据结构
 */
export interface ModuleData {
  all?: MetricData;
  city?: MetricData;
  ka?: MetricData;
  [key: string]: MetricData | undefined;
}

/**
 * 商户数据结构（V3格式）
 */
export interface MerchantData {
  date: string;
  all: MetricData;
  cities: CityData[];
  modules?: ModuleData;
  metadata?: Metadata;
}

/**
 * 元数据结构
 */
export interface Metadata {
  lastSyncAt?: string;
  cloudVersion?: string;
  availableDates?: string[];
  [key: string]: any;
}

/**
 * V3格式数据
 */
export interface V3Data {
  version: 3;
  metadata: Metadata;
  currentData: MerchantData;
  cache: Record<string, MerchantData>;
  importHistory: ImportRecord[];
  currentImportIndex: number;
  currentMerchantType: MerchantType;
}

/**
 * 导入历史记录
 */
export interface ImportRecord {
  monthLabel: string;
  data: MerchantData | null;
  importedAt: string;
  fileName: string;
}

/**
 * 云端记录
 */
export interface CloudRecord {
  date: string;
  merchantData: MerchantData;
  updatedAt: string;
  fileName: string;
}

// ============ UI状态 ============

/**
 * 应用状态
 */
export interface AppState {
  hasData: boolean;
  historyCount: number;
  selectedCities: string[];
  currentImportIndex: number;
  currentMerchantType: MerchantType;
  cacheSize: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * 渲染配置
 */
export interface RenderConfig {
  theme: 'light' | 'dark';
  locale: string;
  dateFormat: string;
  numberFormat: 'compact' | 'full';
}

// ============ 工具函数类型 ============

/**
 * 字段映射规则
 */
export interface FieldRule {
  keys: string[];
  name: string;
  format?: 'number' | 'money' | 'percent';
}

/**
 * 模块定义
 */
export interface ModuleDef {
  searchName: string;
  key: string;
  label?: string;
}

// ============ Excel相关 ============

/**
 * Excel工作簿
 */
export interface ExcelWorkbook {
  SheetNames: string[];
  Sheets: Record<string, any>;
}

/**
 * Excel行数据
 */
export type ExcelRow = (string | number | null)[];

/**
 * Excel工作表数据
 */
export type ExcelData = ExcelRow[];