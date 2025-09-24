import express from "express";
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';  // Added import for Zod schemas

import { MessageData } from "genkit";
import {
  AgentCard,
  Task,
  TaskStatusUpdateEvent,
  TextPart,
} from "@a2a-js/sdk";
import {
  InMemoryTaskStore,
  TaskStore,
  AgentExecutor,
  RequestContext,
  ExecutionEventBus,
  DefaultRequestHandler,
} from "@a2a-js/sdk/server";
import { A2AExpressApp } from "@a2a-js/sdk/server/express";
import { ai } from "./genkit.js";
import {
  OrchestrationState,
  ResearchPlan,
  ResearchStepExecution,
  OrchestrationIssue,
  ResearchMethodology,
  ResearchStep,
} from "../shared/interfaces.js";
import { QueryAnalyzer } from "./query-analyzer.js";
import { MethodologySelector } from "./methodology-selector.js";
import { DataSourceIdentifier } from "./data-source-identifier.js";
import { StepDecomposer } from "./step-decomposer.js";
import { RiskAssessor } from "./risk-assessor.js";
import { ContingencyPlanner } from "./contingency-planner.js";

// Load the Genkit prompt
const planningPrompt = ai.prompt('planning_agent');

/**
 * Main executor for the Planning Agent that orchestrates all planning components
 */
export class ResearchPlanner {
  private queryAnalyzer: QueryAnalyzer;
  private methodologySelector: MethodologySelector;
  private dataSourceIdentifier: DataSourceIdentifier;
  private stepDecomposer: StepDecomposer;
  private riskAssessor: RiskAssessor;
  private contingencyPlanner: ContingencyPlanner;

  constructor() {
    this.queryAnalyzer = new QueryAnalyzer();
    this.methodologySelector = new MethodologySelector();
    this.dataSourceIdentifier = new DataSourceIdentifier();
    this.stepDecomposer = new StepDecomposer();
    this.riskAssessor = new RiskAssessor();
    this.contingencyPlanner = new ContingencyPlanner();
  }

  /**
   * Execute comprehensive research planning for a given query
   */
  async execute(query: string): Promise<ResearchPlan> {
    console.log(`ResearchPlanner: Starting research planning for query: "${query}"`);

    try {
      // Step 1: Analyze the research query
      console.log("ResearchPlanner: Analyzing query...");
      const queryAnalysis = this.queryAnalyzer.analyzeQuery(query);
      console.log(`ResearchPlanner: Query analysis complete. Dimensions: ${queryAnalysis.researchDimensions.length}`);

      // Step 2: Select appropriate research methodologies
      console.log("ResearchPlanner: Selecting methodologies...");
      const methodologies = [this.methodologySelector.selectMethodology(queryAnalysis, "")];
      console.log(`ResearchPlanner: Selected ${methodologies.length} methodologies`);

      // Step 3: Identify and prioritize data sources
      console.log("ResearchPlanner: Identifying data sources...");
      const dataSources = this.dataSourceIdentifier.identifyDataSources(queryAnalysis.researchDimensions, methodologies[0].approach, queryAnalysis.coreQuestion);
      console.log(`ResearchPlanner: Identified ${dataSources.length} data sources`);

      // Step 4: Decompose research into executable steps
      console.log("ResearchPlanner: Decomposing into steps...");
      const researchSteps = this.stepDecomposer.decomposeIntoSteps(queryAnalysis.coreQuestion, methodologies[0].approach, dataSources, queryAnalysis.researchDimensions, queryAnalysis.estimatedScope);
      console.log(`ResearchPlanner: Created ${researchSteps.length} research steps`);

      // Step 5: Assess risks and create mitigation strategies
      console.log("ResearchPlanner: Assessing risks...");
      const riskAssessment = this.riskAssessor.assessRisks(queryAnalysis.coreQuestion, dataSources, researchSteps, queryAnalysis.estimatedScope || 'unknown', methodologies[0].approach);
      console.log(`ResearchPlanner: Identified ${riskAssessment.risks.length} risk factors`);

      // Step 6: Create contingency plans
      console.log("ResearchPlanner: Creating contingency plans...");
      const contingencyPlans = this.contingencyPlanner.createContingencyPlans(riskAssessment.risks, dataSources, researchSteps, queryAnalysis.coreQuestion);
      console.log(`ResearchPlanner: Created ${contingencyPlans.length} contingency plans`);

      // Step 7: Generate comprehensive research plan using Genkit
      console.log("ResearchPlanner: Generating final research plan...");
      const finalPlan = await this.generateComprehensivePlan(query, queryAnalysis, methodologies, dataSources, researchSteps, riskAssessment, contingencyPlans);

      console.log("ResearchPlanner: Research planning complete!");
      return finalPlan;

    } catch (error) {
      console.error("ResearchPlanner: Error during research planning:", error);
      throw new Error(`Research planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate the final comprehensive research plan using Genkit AI
   */
  private async generateComprehensivePlan(
    originalQuery: string,
    queryAnalysis: any,
    methodologies: any[],
    dataSources: any[],
    researchSteps: any[],
    riskAssessment: any,
    contingencyPlans: any[]
  ): Promise<ResearchPlan> {
    const planningPrompt = ai.definePrompt({
      name: "comprehensive-research-planning",
      input: {
        schema: z.object({  // Updated to use Zod schema
          query: z.string(),
          analysis: z.object({}).passthrough(),  // Allow flexible object for analysis
          methodologies: z.array(z.any()),
          dataSources: z.array(z.any()),
          steps: z.array(z.any()),
          risks: z.object({}).passthrough(),  // Allow flexible object for risks
          contingencies: z.array(z.any())
        })
      },
      output: {
        schema: z.object({  // Updated to use Zod schema
          title: z.string(),
          objective: z.string(),
          methodology: z.string(),
          dataSources: z.array(z.string()),
          executionSteps: z.array(z.object({
            id: z.string(),
            description: z.string(),
            agent: z.string(),
            dependencies: z.array(z.string()),
            estimatedDuration: z.number(),
            priority: z.string()
          })),
          riskMitigation: z.object({}).passthrough(),  // Allow flexible object
          timeline: z.object({}).passthrough()  // Allow flexible object
        })
      },
      prompt: `
You are an expert research strategist. Based on the comprehensive analysis provided, create a detailed research execution plan.

Original Query: {{query}}

Analysis Summary:
- Dimensions: {{analysis.dimensions}}
- Complexity: {{analysis.complexity}}
- Timeline: {{analysis.timeline}}

Selected Methodologies: {{methodologies}}

Available Data Sources: {{dataSources}}

Research Steps: {{steps}}

Risk Assessment: {{risks}}

Contingency Plans: {{contingencies}}

Create a comprehensive research plan that integrates all this information into a cohesive execution strategy. Focus on:

1. Clear objective and success criteria
2. Logical step sequencing with dependencies
3. Agent assignments for each step
4. Risk mitigation strategies
5. Realistic timeline estimates
6. Quality assurance measures

Ensure the plan is actionable and accounts for parallel execution where possible.`
    });

    const result = await planningPrompt({
      query: originalQuery,
      analysis: queryAnalysis,
      methodologies,
      dataSources,
      steps: researchSteps,
      risks: riskAssessment,
      contingencies: contingencyPlans
    });

    // Transform the result into our ResearchPlan interface
    const title = result.output?.title || 'Untitled Research Plan';
    return {
      id: `plan-${Date.now()}`,
      objectives: [title, ...(result.output?.objective ? [result.output.objective] : [])], // Prepend title to objectives for preservation
      methodology: {
        approach: this.mapMethodologyStringToEnum(result.output?.methodology), // Convert string to ResearchMethodology enum
        justification: 'Generated by AI',
        phases: [],
        qualityControls: []
      },
      dataSources: result.output?.dataSources?.map((ds: string) => ({ type: 'web', priority: 3, credibilityWeight: 0.7, estimatedVolume: 'medium' })) || [], // Convert string array to DataSource array (simplified)
      executionSteps: result.output?.executionSteps?.map((step: any) => ({ // Map to ResearchStep interface
        id: step.id,
        description: step.description,
        agentType: step.agent as ResearchStep['agentType'], // Cast to correct agentType
        dependencies: step.dependencies || [], // Ensure dependencies is an array
        estimatedDuration: step.estimatedDuration,
        priority: this.mapPriorityStringToNumber(step.priority), // Map string priority to number
        successCriteria: step.successCriteria || 'N/A', // Add missing property
        fallbackStrategies: step.fallbackStrategies || [], // Add missing property
      })) || [], // Ensure it's always an array of ResearchStep
      riskAssessment: [], // The prompt output 'riskMitigation' is not directly mapped to ResearchPlan's 'riskAssessment' which is an array of RiskFactor.
      contingencyPlans: [], // Placeholder
      qualityThresholds: [], // Placeholder
      // Added required fields from ResearchPlan type
      topic: result.output?.title || originalQuery,
      estimatedTimeline: typeof result.output?.timeline === 'string'
        ? result.output.timeline
        : (queryAnalysis?.timeline ?? 'unspecified'),
      version: '1.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      // Removed invalid 'status' property — ResearchPlan type does not include 'status'.
    };
  }
  
  /**
   * Maps a string methodology to a ResearchMethodology enum value.
   * @param methodologyString The methodology as a string.
   * @returns The corresponding ResearchMethodology enum value.
   */
  private mapMethodologyStringToEnum(methodologyString: string | undefined): ResearchMethodology['approach'] {
    switch (methodologyString?.toLowerCase()) {
      case 'systematic':
        return 'systematic';
      case 'exploratory':
        return 'exploratory';
      case 'comparative':
        return 'comparative';
      case 'case-study':
        return 'case-study';
      default:
        return 'exploratory'; // Default to exploratory if not recognized
    }
  }
  
  /**
   * Maps a string priority ('high', 'medium', 'low') to a number (1, 3, 5).
   * @param priorityString The priority as a string.
   * @returns The priority as a number.
   */
  private mapPriorityStringToNumber(priorityString?: string): 1 | 3 | 5 {
    const p = (priorityString || 'medium').toLowerCase();
    switch (p) {
      case 'high':
        return 1;
      case 'medium':
        return 3;
      case 'low':
        return 5;
      default:
        return 3; // Default to medium priority
    };
  }
}

/**
 * PlanningAgentExecutor implements the agent's core logic for research planning and strategy development.
 */
class PlanningAgentExecutor implements AgentExecutor {
  private cancelledTasks = new Set<string>();
  private researchPlanner: ResearchPlanner;

  constructor() {
    this.researchPlanner = new ResearchPlanner();
  }

  public cancelTask = async (
    taskId: string,
    eventBus: ExecutionEventBus,
  ): Promise<void> => {
    this.cancelledTasks.add(taskId);
    // Publish immediate cancellation event
    const cancelledUpdate: TaskStatusUpdateEvent = {
      kind: 'status-update',
      taskId: taskId,
      contextId: uuidv4(), // Generate context ID for cancellation
      status: {
        state: 'canceled',
        message: {
          kind: 'message',
          role: 'agent',
          messageId: uuidv4(),
          parts: [{ kind: 'text', text: 'Research planning cancelled.' }],
          taskId: taskId,
          contextId: uuidv4(),
        },
        timestamp: new Date().toISOString(),
      },
      final: true,
    };
    eventBus.publish(cancelledUpdate);
  };

  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    const { userMessage } = requestContext;
    const existingTask = requestContext.task;

    const taskId = existingTask?.id || uuidv4();
    const contextId = userMessage.contextId || existingTask?.contextId || uuidv4();
    const researchId = taskId; // For future orchestration integration

    console.log(
      `[PlanningAgentExecutor] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId}, research: ${researchId})`
    );

    // 1. Publish initial Task event if it's a new task
    if (!existingTask) {
      const initialTask: Task = {
        kind: 'task',
        id: taskId,
        contextId: contextId,
        status: {
          state: 'submitted',
          timestamp: new Date().toISOString(),
        },
        history: [userMessage],
        metadata: userMessage.metadata,
        artifacts: [],
      };
      eventBus.publish(initialTask);
    }

    // 2. Publish "working" status update
    const workingStatusUpdate: TaskStatusUpdateEvent = {
      kind: 'status-update',
      taskId: taskId,
      contextId: contextId,
      status: {
        state: 'working',
        message: {
          kind: 'message',
          role: 'agent',
          messageId: uuidv4(),
          parts: [{ kind: 'text', text: 'Developing comprehensive research strategy...' }],
          taskId: taskId,
          contextId: contextId,
        },
        timestamp: new Date().toISOString(),
      },
      final: false,
    };
    eventBus.publish(workingStatusUpdate);

    // 3. Prepare messages for Genkit prompt
    const historyForGenkit = existingTask?.history ? [...existingTask.history] : [];
    if (!historyForGenkit.find(m => m.messageId === userMessage.messageId)) {
      historyForGenkit.push(userMessage);
    }

    const messages: MessageData[] = historyForGenkit
      .map((m) => ({
        role: (m.role === 'agent' ? 'model' : 'user') as 'user' | 'model',
        content: m.parts
          .filter((p): p is TextPart => p.kind === 'text' && !!(p as TextPart).text)
          .map((p) => ({
            text: (p as TextPart).text,
          })),
      }))
      .filter((m) => m.content.length > 0);

    if (messages.length === 0) {
      console.warn(
        `[PlanningAgentExecutor] No valid text messages found in history for task ${taskId}.`
      );
      const failureUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId: taskId,
        contextId: contextId,
        status: {
          state: 'failed',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ kind: 'text', text: 'No input message found to process.' }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(failureUpdate);
      return;
    }

    try {
      // 4. Extract the research query from the user message
      const userQuery = messages[messages.length - 1]?.content?.[0]?.text || '';
      if (!userQuery) {
        throw new Error('No research query found in user message');
      }

      // 5. Execute comprehensive research planning using the new components
      console.log(`[PlanningAgentExecutor] Starting comprehensive planning for: "${userQuery}"`);
      const researchPlan = await this.researchPlanner.execute(userQuery);

      // 6. Publish status update with planning results
      const statusUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId: taskId,
        contextId: contextId,
        status: {
          state: 'working',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{
              kind: 'text',
              text: `Research plan developed successfully. ${researchPlan.executionSteps.length} execution steps planned.`
            }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: false,
      };
      eventBus.publish(statusUpdate);

      // Check if cancelled
      if (this.cancelledTasks.has(taskId)) {
        console.log(`[PlanningAgentExecutor] Request cancelled for task: ${taskId}`);
        const cancelledUpdate: TaskStatusUpdateEvent = {
          kind: 'status-update',
          taskId: taskId,
          contextId: contextId,
          status: {
            state: 'canceled',
            message: {
              kind: 'message',
              role: 'agent',
              messageId: uuidv4(),
              parts: [{ kind: 'text', text: 'Research planning cancelled.' }],
              taskId: taskId,
              contextId: contextId,
            },
            timestamp: new Date().toISOString(),
          },
          final: true,
        };
        eventBus.publish(cancelledUpdate);
        return;
      }

      // 7. Complete the planning task
      const completionUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId: taskId,
        contextId: contextId,
        status: {
          state: 'completed',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{
              kind: 'text',
              text: `Research strategy completed successfully. Plan ready for execution.`
            }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(completionUpdate);

    } catch (error) {
      console.error(`[PlanningAgentExecutor] Error processing task ${taskId}:`, error);
      const failureUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId: taskId,
        contextId: contextId,
        status: {
          state: 'failed',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ kind: 'text', text: `Research planning failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(failureUpdate);
    }
  }

  private parseResearchPlan(responseText: string): any {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(responseText.trim());
      // The prompt returns { researchPlan: {...} } so extract the researchPlan
      return parsed.researchPlan || parsed;
    } catch (e) {
      console.error('[PlanningAgentExecutor] Failed to parse JSON response:', e);
      console.error('[PlanningAgentExecutor] Raw response:', responseText);
      // Don't use fake fallback - return error information
      throw new Error(`Failed to parse research plan: ${e instanceof Error ? e.message : 'Invalid JSON response'}`);
    }
  }
}

// --- Server Setup ---

const planningAgentCard: AgentCard = {
  protocolVersion: '1.0',
  name: 'Planning Agent',
  description:
    'An agent that creates comprehensive, evidence-based research strategies with systematic planning, risk assessment, and execution blueprints.',
  url: 'http://localhost:41245/',
  provider: {
    organization: 'A2A Samples',
    url: 'https://example.com/a2a-samples',
  },
  version: '0.0.1',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: true,
  },
  securitySchemes: undefined,
  security: undefined,
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  skills: [
    {
      id: 'research_planning',
      name: 'Research Planning',
      description:
        'Creates systematic research strategies with methodology design, data source mapping, execution planning, and risk management.',
      tags: ['planning', 'strategy', 'methodology', 'research'],
      examples: [
        'Develop a research plan for market analysis',
        'Create an investigation strategy for technical issues',
        'Design a systematic review methodology',
        'Plan multi-disciplinary research approaches',
      ],
      inputModes: ['text'],
      outputModes: ['text'],
    },
  ],
  supportsAuthenticatedExtendedCard: false,
};

async function main() {
  // 1. Create TaskStore
  const taskStore: TaskStore = new InMemoryTaskStore();

  // 2. Create AgentExecutor
  const agentExecutor = new PlanningAgentExecutor();

  // 3. Create DefaultRequestHandler
  const requestHandler = new DefaultRequestHandler(
    planningAgentCard,
    taskStore,
    agentExecutor
  );

  // 4. Create and setup A2AExpressApp
  const appBuilder = new A2AExpressApp(requestHandler);
  const expressApp = appBuilder.setupRoutes(express(), '');

  // 5. Start the server
  const PORT = process.env.PLANNING_AGENT_PORT || 41245;
  expressApp.listen(PORT, () => {
    console.log(`[PlanningAgent] Server started on http://localhost:${PORT}`);
    console.log(`[PlanningAgent] Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`);
    console.log('[PlanningAgent] Press Ctrl+C to stop the server');
  });
}

main().catch(console.error);