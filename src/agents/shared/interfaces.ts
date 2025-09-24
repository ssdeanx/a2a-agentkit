// Shared TypeScript interfaces for the Deep Research Agent system
// Based on the Deep Research Agent Design Specification

export interface ResearchQuery {
  topic: string;
  scope?: string;
  depth?: 'basic' | 'comprehensive' | 'expert';
  deadline?: Date;
  constraints?: string[];
}

export interface ResearchResult {
  topic: string;
  findings: ResearchFinding[];
  sources: SourceCitation[];
  methodology: string;
  confidence: number; // 0-1
  generatedAt: Date;
  processingTime: number; // milliseconds
}

export interface ResearchFinding {
  claim: string;
  evidence: string;
  confidence: number; // 0-1
  sources: number[]; // Indices into sources array
  category: 'factual' | 'analytical' | 'speculative';
}

export interface SourceCitation {
  url: string;
  title: string;
  author?: string;
  publicationDate?: Date;
  credibilityScore: number; // 0-1
  type: 'academic' | 'news' | 'web' | 'government' | 'expert';
  accessedAt: Date;
}

export interface ResearchPlan {
  id: string;
  topic: string;
  objectives: string[];
  methodology: ResearchMethodology;
  dataSources: DataSource[];
  executionSteps: ResearchStep[];
  riskAssessment: RiskFactor[];
  contingencyPlans: ContingencyPlan[];
  qualityThresholds: QualityThreshold[];
  estimatedTimeline: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResearchMethodology {
  approach: 'systematic' | 'exploratory' | 'comparative' | 'case-study';
  justification: string;
  phases: string[];
  qualityControls: string[];
}

export interface DataSource {
  type: 'web' | 'academic' | 'news' | 'social' | 'government' | 'statistical';
  priority: number; // 1-5, 1 being highest
  credibilityWeight: number; // 0-1
  estimatedVolume: 'high' | 'medium' | 'low';
  accessRequirements?: string[];
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export interface ResearchStep {
  id: string;
  description: string;
  agentType: 'planning' | 'orchestrator' | 'web-research' | 'academic-research' | 'news-research' | 'data-analysis';
  dependencies: string[]; // Step IDs
  estimatedDuration: number; // minutes
  successCriteria: string;
  fallbackStrategies: string[];
  priority: number; // 1-5, 1 being highest
}

export interface RiskFactor {
  type: 'data-availability' | 'api-limits' | 'time-constraints' | 'credibility-concerns' | 'technical-failures';
  probability: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  mitigationStrategy: string;
  monitoringTrigger?: string;
}

export interface ContingencyPlan {
  triggerCondition: string;
  fallbackStrategy: string;
  resourceAdjustment: string;
  estimatedImpact: string;
}

export interface QualityThreshold {
  metric: 'source-credibility' | 'data-completeness' | 'cross-validation' | 'recency' | 'consistency';
  minimumValue: number; // 0-1
  acceptableRange: [number, number];
  measurementMethod: string;
}

export interface OrchestrationState {
  researchId: string;
  plan: ResearchPlan;
  currentPhase: 'planning' | 'execution' | 'synthesis' | 'validation' | 'reporting';
  activeSteps: ResearchStepExecution[];
  completedSteps: ResearchStepResult[];
  issues: OrchestrationIssue[];
  progress: {
    completedSteps: number;
    totalSteps: number;
    estimatedTimeRemaining: number; // minutes
    overallConfidence: number; // 0-1
  };
  startedAt: Date;
  lastUpdated: Date;
}

export interface ResearchStepExecution {
  stepId: string;
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  progressUpdates: ProgressUpdate[];
  assignedAgent?: string;
  retryCount: number;
}

export interface ResearchStepResult {
  stepId: string;
  status: 'success' | 'partial' | 'failed';
  data: any; // Flexible for different result types
  sources: SourceCitation[];
  processingTime: number; // milliseconds
  qualityScore: number; // 0-1
  issues: string[];
  metadata: Record<string, any>;
}

export interface OrchestrationIssue {
  id: string;
  type: 'agent-failure' | 'data-quality' | 'dependency-blocked' | 'resource-exhausted' | 'timeout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedSteps: string[];
  resolution?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface ProgressUpdate {
  timestamp: Date;
  message: string;
  percentage?: number; // 0-100
  currentActivity: string;
  estimatedTimeRemaining?: number; // minutes
}

// A2A Protocol interfaces
export interface AgentCard {
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  supportedTasks: TaskType[];
  endpoints: {
    status: string;
    execute: string;
    cancel?: string;
  };
  protocolVersion: string;
  metadata: Record<string, any>;
}

export interface TaskType {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
}

export interface A2AMessage {
  id: string;
  from: string;
  to: string;
  type: 'task-request' | 'task-response' | 'status-update' | 'error' | 'cancel';
  payload: any;
  timestamp: Date;
  correlationId?: string;
}

export interface TaskRequest {
  taskId: string;
  type: string;
  parameters: Record<string, any>;
  priority: number;
  timeout?: number; // milliseconds
  metadata?: Record<string, any>;
}

export interface TaskResponse {
  taskId: string;
  status: 'success' | 'error' | 'cancelled';
  result?: any;
  error?: string;
  processingTime: number;
  metadata?: Record<string, any>;
}

// Utility types
export type AgentType = 'planning' | 'orchestrator' | 'web-research' | 'academic-research' | 'news-research' | 'data-analysis';

export type ResearchPhase = 'planning' | 'execution' | 'synthesis' | 'validation' | 'reporting';

export type DataSourceType = 'web' | 'academic' | 'news' | 'social' | 'government' | 'statistical';

export type RiskType = 'data-availability' | 'api-limits' | 'time-constraints' | 'credibility-concerns' | 'technical-failures';

export type QualityMetric = 'source-credibility' | 'data-completeness' | 'cross-validation' | 'recency' | 'consistency';

export interface ResearchDimension {
  type: 'academic' | 'web' | 'news' | 'statistical';
  relevance: number; // 0-1
  priority: 'high' | 'medium' | 'low';
}

export interface SynthesisResult {
  id: string;
  researchId: string;
  synthesis: string; // The comprehensive narrative synthesis
  keyFindings: Array<{
    dimension: string;
    finding: string;
    confidence: number;
    validationStatus: 'confirmed' | 'partially-confirmed' | 'unconfirmed' | 'contradicted';
    supportingSources: string[];
    contradictingSources?: string[];
    consensusLevel: number;
  }>;
  confidenceMetrics: {
    overallConfidence: number;
    sourceDiversity: number;
    validationRate: number;
    contradictionRate: number;
  };
  gapsAndRecommendations: {
    knowledgeGaps: string[];
    methodologicalLimitations: string[];
    recommendations: string[];
  };
  sourceSummary: {
    totalSources: number;
    sourceTypes: Record<string, number>;
    topSources: Array<{source: string, contributionCount: number}>;
  };
  generatedAt: Date;
  version: string;
}