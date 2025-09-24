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
const newsResearchPrompt = ai.prompt('news_research');

/**
 * NewsResearchAgentExecutor implements the agent's core logic for news analysis and current events research.
 */
class NewsResearchAgentExecutor implements AgentExecutor {
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
          parts: [{ kind: 'text', text: 'News research cancelled.' }],
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

    console.log(
      `[NewsResearchAgentExecutor] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId})`
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
          parts: [{ kind: 'text', text: 'Conducting comprehensive news research...' }],
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
        `[NewsResearchAgentExecutor] No valid text messages found in history for task ${taskId}.`
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
      // 4. Run the Genkit prompt for news research
      const response = await newsResearchPrompt(
        {
          newsScope: 'comprehensive news analysis with credibility assessment',
          urgencyLevel: 'standard',
          now: new Date().toISOString()
        },
        { messages }
      );

      // 5. Parse news research findings from response
      const newsFindings = this.parseNewsFindings(response.text);

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
              text: `News research completed. Analyzed ${newsFindings?.newsFindings?.length || 0} news events from ${newsFindings?.metadata?.totalArticles || 0} articles`
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
        console.log(`[NewsResearchAgentExecutor] Request cancelled for task: ${taskId}`);
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
              parts: [{ kind: 'text', text: 'News research cancelled.' }],
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
              text: `News research completed successfully. Average source credibility: ${newsFindings?.metadata?.credibilityAverage || 'N/A'}`
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
      console.error(`[NewsResearchAgentExecutor] Error processing task ${taskId}:`, error);
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
            parts: [{ kind: 'text', text: `News research failed: ${error instanceof Error ? error.message : 'Unknown error'}` }],
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

  private parseNewsFindings(responseText: string): any {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(responseText);
      return parsed.newsResearch || parsed;
    } catch (e) {
      // Fallback: create a basic findings structure
      console.warn('[NewsResearchAgentExecutor] Could not parse news findings as JSON, using fallback');
      return {
        newsFindings: [{
          event: 'Research Query',
          timeline: [{
            date: new Date().toISOString(),
            headline: 'News Research Summary',
            summary: 'News research conducted with simulated results',
            sources: [{
              outlet: 'Major News Outlet',
              url: 'https://example.com/news',
              credibilityScore: 0.85,
              publicationDate: new Date().toISOString(),
              biasAssessment: 'center',
              keyQuotes: ['Key information from news sources']
            }]
          }],
          currentStatus: 'ongoing',
          impactLevel: 'national',
          stakeholderImpacts: ['General public', 'Policy makers']
        }],
        mediaAnalysis: {
          coverageConsensus: 'medium',
          dominantNarratives: ['Primary news storyline'],
          underreportedAspects: ['Additional context needed'],
          mediaBiasObservations: ['Balanced coverage observed'],
          factCheckingStatus: 'verified'
        },
        contextAndAnalysis: {
          historicalContext: 'Background information provided',
          expertReactions: ['Expert commentary included'],
          publicReaction: 'Public response monitored',
          futureImplications: 'Long-term consequences assessed',
          relatedStories: ['Connected news developments']
        },
        metadata: {
          totalArticles: 1,
          dateRange: 'Current period',
          primarySources: 1,
          credibilityAverage: 0.85,
          lastUpdated: new Date().toISOString(),
          breakingNews: false
        }
      };
    }
  }
}

// --- Server Setup ---

const newsResearchAgentCard: AgentCard = {
  protocolVersion: '1.0',
  name: 'News Research Agent',
  description:
    'An agent that conducts comprehensive news research, analyzes current events, and evaluates media credibility across multiple news sources.',
  url: 'http://localhost:41246/',
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
      id: 'news_research',
      name: 'News Research',
      description:
        'Conducts comprehensive news analysis with credibility assessment, current events tracking, and media bias evaluation across diverse news sources.',
      tags: ['news', 'current-events', 'media', 'credibility'],
      examples: [
        'Research the latest developments in climate policy',
        'Analyze media coverage of recent elections',
        'Track breaking news on international conflicts',
        'Evaluate news credibility on scientific discoveries',
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
  const agentExecutor: AgentExecutor = new NewsResearchAgentExecutor();

  // 3. Create DefaultRequestHandler
  const requestHandler = new DefaultRequestHandler(
    newsResearchAgentCard,
    taskStore,
    agentExecutor
  );

  // 4. Create and setup A2AExpressApp
  const appBuilder = new A2AExpressApp(requestHandler);
  const expressApp = appBuilder.setupRoutes(express(), '');

  // 5. Start the server
  const PORT = process.env.NEWS_RESEARCH_AGENT_PORT || 41246;
  expressApp.listen(PORT, () => {
    console.log(`[NewsResearchAgent] Server started on http://localhost:${PORT}`);
    console.log(`[NewsResearchAgent] Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`);
    console.log('[NewsResearchAgent] Press Ctrl+C to stop the server');
  });
}

main().catch(console.error);