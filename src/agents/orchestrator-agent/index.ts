import express from "express";
import { v4 as uuidv4 } from 'uuid';

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
  OrchestrationDecision,
  ResearchStep,
  AgentType
} from "../shared/interfaces.js";
import { TaskDelegator } from "./task-delegator.js";
import { A2ACommunicationManager } from "./a2a-communication.js";

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY environment variable not set.");
  process.exit(1);
}

// Load the Genkit prompt
const orchestratorPrompt = ai.prompt('orchestrator');

/**
 * OrchestratorAgentExecutor implements the agent's core logic for coordinating research tasks.
 */
class OrchestratorAgentExecutor implements AgentExecutor {
  private cancelledTasks = new Set<string>();
  private researchStates = new Map<string, OrchestrationState>();
  private taskDelegator: TaskDelegator;
  private a2aManager: A2ACommunicationManager;

  constructor(taskDelegator: TaskDelegator, a2aManager: A2ACommunicationManager) {
    this.taskDelegator = taskDelegator;
    this.a2aManager = a2aManager;
  }

  public cancelTask = async (
    taskId: string,
    eventBus: ExecutionEventBus,
  ): Promise<void> => {
    this.cancelledTasks.add(taskId);
    // Update research state to cancelled
    const state = this.researchStates.get(taskId);
    if (state) {
      state.activeSteps.forEach(step => {
        if (step.status === 'running') {
          step.status = 'cancelled';
          step.completedAt = new Date();
        }
      });
      this.researchStates.set(taskId, state);
    }
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
          parts: [{ kind: 'text', text: 'Research orchestration cancelled.' }],
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
    const researchId = taskId; // Use taskId as researchId for simplicity

    console.log(
      `[OrchestratorAgentExecutor] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId})`
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
          parts: [{ kind: 'text', text: 'Coordinating research execution...' }],
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
        `[OrchestratorAgentExecutor] No valid text messages found in history for task ${taskId}.`
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
      // 4. Initialize or load research state
      let researchState = this.researchStates.get(researchId);
      if (!researchState) {
        // This is the first message - expect a research plan from planning agent
        // For now, create a basic state structure
        researchState = {
          researchId,
          plan: {} as ResearchPlan, // Will be populated from planning agent
          currentPhase: 'planning',
          activeSteps: [],
          completedSteps: [],
          issues: [],
          progress: {
            completedSteps: 0,
            totalSteps: 0,
            estimatedTimeRemaining: 0,
            overallConfidence: 0.5,
          },
          startedAt: new Date(),
          lastUpdated: new Date(),
        };
        this.researchStates.set(researchId, researchState);
      }

      // 5. Run the Genkit prompt for orchestration decisions
      const currentStateSummary = JSON.stringify({
        currentPhase: researchState.currentPhase,
        activeTasks: researchState.activeSteps.map(s => ({
          id: s.stepId,
          agentType: s.agentId,
          status: s.status,
        })),
        completedTasks: researchState.completedSteps.length,
        issues: researchState.issues.length,
        progress: researchState.progress,
      });

      const response = await orchestratorPrompt(
        {
          currentState: currentStateSummary,
          pendingTasks: 'Analyze current research needs and assign appropriate agents',
          now: new Date().toISOString()
        },
        { messages }
      );

      // 6. Parse orchestration decision from response
      const orchestrationDecision = this.parseOrchestrationDecision(response.text);

      // 7. Update research state based on decision
      this.updateResearchState(researchState, orchestrationDecision);

      // 8. Publish status update with orchestration results
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
              text: `Orchestration update: ${orchestrationDecision.nextActions?.length || 0} actions planned, ${orchestrationDecision.activeTasks?.length || 0} tasks active`
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
        console.log(`[OrchestratorAgentExecutor] Request cancelled for task: ${taskId}`);
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
              parts: [{ kind: 'text', text: 'Research orchestration cancelled.' }],
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

      // 9. Continue orchestration loop (simplified for now)
      // In a full implementation, this would coordinate with other agents
      // For now, we'll complete the task after one orchestration cycle

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
              text: `Research orchestration completed. Phase: ${researchState.currentPhase}, Progress: ${researchState.progress.completedSteps}/${researchState.progress.totalSteps}`
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
      console.error(`[OrchestratorAgentExecutor] Error processing task ${taskId}:`, error);
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
            parts: [{ kind: 'text', text: `Orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
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

  private parseOrchestrationDecision(responseText: string): any {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(responseText);
      return parsed.orchestrationDecision || parsed;
    } catch (e) {
      // Fallback: create a basic decision structure
      console.warn('[OrchestratorAgentExecutor] Could not parse orchestration decision as JSON, using fallback');
      return {
        currentPhase: 'execution',
        activeTasks: [],
        completedTasks: [],
        issues: [],
        progressMetrics: {
          completedSteps: 0,
          totalSteps: 1,
          estimatedTimeRemaining: 30,
          overallConfidence: 0.5,
          qualityScore: 0.8,
        },
        nextActions: [{
          action: 'monitor-progress',
          description: 'Continue monitoring research progress',
          priority: 3,
          estimatedImpact: 'Maintain research momentum',
        }],
      };
    }
  }

  private updateResearchState(state: OrchestrationState, decision: any): void {
    state.currentPhase = decision.currentPhase || state.currentPhase;
    state.lastUpdated = new Date();

    if (decision.progressMetrics) {
      state.progress = {
        completedSteps: decision.progressMetrics.completedSteps || state.progress.completedSteps,
        totalSteps: decision.progressMetrics.totalSteps || state.progress.totalSteps,
        estimatedTimeRemaining: decision.progressMetrics.estimatedTimeRemaining || state.progress.estimatedTimeRemaining,
        overallConfidence: decision.progressMetrics.overallConfidence || state.progress.overallConfidence,
      };
    }

    if (decision.issues) {
      decision.issues.forEach((issue: any) => {
        state.issues.push({
          id: uuidv4(),
          type: issue.type || 'unknown',
          severity: issue.severity || 'medium',
          description: issue.description || 'Issue detected',
          affectedSteps: issue.affectedTasks || [],
          createdAt: new Date(),
        });
      });
    }
  }
}

// --- Server Setup ---

const orchestratorAgentCard: AgentCard = {
  protocolVersion: '1.0',
  name: 'Research Orchestrator Agent',
  description:
    'An agent that coordinates multi-agent research execution, manages research state, and optimizes task distribution across specialized research agents.',
  url: 'http://localhost:41243/',
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
      id: 'research_orchestration',
      name: 'Research Orchestration',
      description:
        'Coordinates complex research tasks across multiple specialized agents, managing dependencies, quality assurance, and progress tracking.',
      tags: ['research', 'coordination', 'multi-agent', 'planning'],
      examples: [
        'Execute this research plan across web, academic, and news research agents.',
        'Monitor research progress and reassign tasks based on agent performance.',
        'Synthesize findings from multiple research streams into coherent results.',
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
  const agentExecutor: AgentExecutor = new OrchestratorAgentExecutor();

  // 3. Create DefaultRequestHandler
  const requestHandler = new DefaultRequestHandler(
    orchestratorAgentCard,
    taskStore,
    agentExecutor
  );

  // 4. Create and setup A2AExpressApp
  const appBuilder = new A2AExpressApp(requestHandler);
  const expressApp = appBuilder.setupRoutes(express(), '');

  // 5. Start the server
  const PORT = process.env.ORCHESTRATOR_AGENT_PORT || 41243;
  expressApp.listen(PORT, () => {
    console.log(`[OrchestratorAgent] Server started on http://localhost:${PORT}`);
    console.log(`[OrchestratorAgent] Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`);
    console.log('[OrchestratorAgent] Press Ctrl+C to stop the server');
  });
}

main().catch(console.error);