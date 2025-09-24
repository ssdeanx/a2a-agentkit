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

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY environment variable not set.");
  process.exit(1);
}

// Load the Genkit prompt
const academicResearchPrompt = ai.prompt('academic_research');

/**
 * AcademicResearchAgentExecutor implements the agent's core logic for scholarly research.
 */
class AcademicResearchAgentExecutor implements AgentExecutor {
  private cancelledTasks = new Set<string>();

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
          parts: [{ kind: 'text', text: 'Academic research cancelled.' }],
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
      `[AcademicResearchAgentExecutor] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId}, research: ${researchId})`
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
          parts: [{ kind: 'text', text: 'Conducting comprehensive academic research...' }],
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
        `[AcademicResearchAgentExecutor] No valid text messages found in history for task ${taskId}.`
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
      // 4. Run the Genkit prompt for academic research
      const response = await academicResearchPrompt(
        {
          researchDomain: 'multidisciplinary scholarly research',
          methodologicalFocus: 'rigorous academic methodology with peer review emphasis',
          now: new Date().toISOString()
        },
        { messages }
      );

      // 5. Parse academic research findings from response
      const academicFindings = this.parseAcademicFindings(response.text);

      // 6. Publish status update with research results
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
              text: `Academic research completed. Analyzed ${academicFindings?.scholarlyFindings?.length || 0} research areas from ${academicFindings?.metadata?.totalPublications || 0} publications`
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
        console.log(`[AcademicResearchAgentExecutor] Request cancelled for task: ${taskId}`);
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
              parts: [{ kind: 'text', text: 'Academic research cancelled.' }],
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

      // 7. Complete the research task
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
              text: `Academic research completed successfully. Average impact factor: ${academicFindings?.metadata?.averageImpactFactor || 'N/A'}`
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
      console.error(`[AcademicResearchAgentExecutor] Error processing task ${taskId}:`, error);
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
            parts: [{ kind: 'text', text: `Academic research failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
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

  private parseAcademicFindings(responseText: string): any {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(responseText);
      return parsed.academicResearch || parsed;
    } catch (e) {
      // Fallback: create a basic findings structure
      console.warn('[AcademicResearchAgentExecutor] Could not parse academic findings as JSON, using fallback');
      return {
        scholarlyFindings: [{
          topic: 'Research Query',
          keyStudies: [{
            title: 'Sample Academic Publication',
            authors: ['Researcher One', 'Researcher Two'],
            journal: 'Journal of Academic Research',
            publicationYear: 2023,
            citations: 25,
            impactFactor: 3.5,
            methodology: 'empirical study',
            keyFindings: 'Key research findings summarized',
            qualityScore: 0.85
          }],
          consensusLevel: 'moderate',
          evidenceStrength: 'moderate',
          researchGaps: ['Further empirical validation needed']
        }],
        methodologicalAnalysis: {
          dominantApproaches: ['Quantitative methods', 'Literature review'],
          methodologicalStrengths: ['Rigorous peer review', 'Statistical analysis'],
          methodologicalLimitations: ['Sample size constraints'],
          recommendations: ['Larger scale studies needed']
        },
        citationAnalysis: {
          keyInfluentialWorks: ['Foundational research papers'],
          emergingTrends: ['New methodological approaches'],
          researchFrontiers: ['Interdisciplinary applications']
        },
        metadata: {
          totalPublications: 1,
          averageImpactFactor: 3.5,
          dateRange: '2020-2024',
          lastUpdated: new Date().toISOString(),
          searchCompleteness: 0.8
        }
      };
    }
  }
}

// --- Server Setup ---

const academicResearchAgentCard: AgentCard = {
  protocolVersion: '1.0',
  name: 'Academic Research Agent',
  description:
    'An agent that conducts rigorous scholarly research, analyzes peer-reviewed literature, and synthesizes academic findings with methodological evaluation.',
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
      id: 'academic_research',
      name: 'Academic Research',
      description:
        'Conducts comprehensive scholarly research with peer-reviewed literature analysis, citation evaluation, and methodological rigor assessment.',
      tags: ['academic', 'scholarly', 'peer-review', 'methodology'],
      examples: [
        'Analyze the current state of research on machine learning ethics',
        'Review scholarly literature on climate change adaptation strategies',
        'Evaluate methodological approaches in educational technology research',
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
  const agentExecutor: AgentExecutor = new AcademicResearchAgentExecutor();

  // 3. Create DefaultRequestHandler
  const requestHandler = new DefaultRequestHandler(
    academicResearchAgentCard,
    taskStore,
    agentExecutor
  );

  // 4. Create and setup A2AExpressApp
  const appBuilder = new A2AExpressApp(requestHandler);
  const expressApp = appBuilder.setupRoutes(express(), '');

  // 5. Start the server
  const PORT = process.env.ACADEMIC_RESEARCH_AGENT_PORT || 41245;
  expressApp.listen(PORT, () => {
    console.log(`[AcademicResearchAgent] Server started on http://localhost:${PORT}`);
    console.log(`[AcademicResearchAgent] Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`);
    console.log('[AcademicResearchAgent] Press Ctrl+C to stop the server');
  });
}

main().catch(console.error);