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
const webResearchPrompt = ai.prompt('web_research');

/**
 * WebResearchAgentExecutor implements the agent's core logic for web-based research.
 */
class WebResearchAgentExecutor implements AgentExecutor {
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
          parts: [{ kind: 'text', text: 'Web research cancelled.' }],
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
      `[WebResearchAgentExecutor] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId}, research: ${researchId})`
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
          parts: [{ kind: 'text', text: 'Conducting comprehensive web research...' }],
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
        `[WebResearchAgentExecutor] No valid text messages found in history for task ${taskId}.`
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
      // 4. Call Genkit prompt
      const response = await webResearchPrompt({
        messages: messages,
      });

      // 5. Parse the response
      const researchFindings = this.parseResearchFindings(response.text);

      // 6. Publish success status with findings
      const successUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId: taskId,
        contextId: contextId,
        status: {
          state: 'completed',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ kind: 'text', text: 'Web research completed successfully.' }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(successUpdate);

      // 7. Publish artifacts
      if (researchFindings && researchFindings.sources) {
        const artifact: Task = {
          kind: 'task',
          id: `${taskId}-findings`,
          contextId: contextId,
          status: {
            state: 'completed',
            timestamp: new Date().toISOString(),
          },
          history: [],
          metadata: {
            type: 'research-findings',
            researchId: researchId,
          },
          artifacts: [],
        };
        eventBus.publish(artifact);
      }

    } catch (error) {
      console.error(`[WebResearchAgentExecutor] Error processing task ${taskId}:`, error);
      const errorUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId: taskId,
        contextId: contextId,
        status: {
          state: 'failed',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ kind: 'text', text: `Research failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(errorUpdate);
    }
  }

  private parseResearchFindings(responseText: string): any {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(responseText.trim());
      // The prompt returns { researchFindings: {...} } so extract the researchFindings
      return parsed.researchFindings || parsed;
    } catch (e) {
      console.error('[WebResearchAgentExecutor] Failed to parse JSON response:', e);
      console.error('[WebResearchAgentExecutor] Raw response:', responseText);
      // Don't use fake fallback - return error information
      throw new Error(`Failed to parse research findings: ${e instanceof Error ? e.message : 'Invalid JSON response'}`);
    }
  }
}

// --- Server Setup ---

const webResearchAgentCard: AgentCard = {
  protocolVersion: '1.0',
  name: 'Web Research Agent',
  description:
    'An agent that conducts comprehensive web-based research with credibility assessment and source verification.',
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
      id: 'web_research',
      name: 'Web Research',
      description:
        'Conducts comprehensive web-based research with credibility assessment and source verification.',
      tags: ['web', 'research', 'credibility', 'sources'],
      examples: [
        'Research the latest developments in artificial intelligence',
        'Find reliable sources on climate change solutions',
        'Investigate current trends in renewable energy',
      ],
      inputModes: ['text'],
      outputModes: ['text'],
    },
  ],
  supportsAuthenticatedExtendedCard: false,
};

// Create the agent executor
const agentExecutor = new WebResearchAgentExecutor();

// Create the task store
const taskStore: TaskStore = new InMemoryTaskStore();

// Create the request handler
const requestHandler = new DefaultRequestHandler(
  webResearchAgentCard,
  taskStore,
  agentExecutor
);

// 4. Create and setup A2AExpressApp
const appBuilder = new A2AExpressApp(requestHandler);
const expressApp = appBuilder.setupRoutes(express(), '');

const PORT = process.env.WEB_RESEARCH_AGENT_PORT || 41243;

expressApp.listen(PORT, () => {
  console.log(`Web Research Agent listening on port ${PORT}`);
  console.log(`Agent Card available at http://localhost:${PORT}/.well-known/agent-card.json`);
});
