import { streamText, stepCountIs } from 'ai';
import { getAgentModel } from '../llm.js';
import { agentMemory } from '../memory.js';
import { getAssistantSystemPrompt } from '../prompts.js';
import { getMonthSnapshot } from '../context.js';
import { createUserTools } from '../tools/index.js';

const MAX_STEPS = 4;
const HISTORY_CHAR_BUDGET = 12000;

export async function prepareChatContext({ userId, sessionId }) {
  const history = await agentMemory.getHistoryByBudget(sessionId, HISTORY_CHAR_BUDGET);
  const tools = createUserTools(userId);
  let snapshot = null;
  try {
    snapshot = await getMonthSnapshot(userId);
  } catch {
    snapshot = null;
  }
  return { history, tools, snapshot };
}

export async function runAssistant({ userId, sessionId, message, modelOverride, gateway = 'primary', chatContext = null, abortSignal }) {
  const model = getAgentModel(modelOverride, gateway);
  const context = chatContext ?? (await prepareChatContext({ userId, sessionId }));

  return streamText({
    model,
    system: getAssistantSystemPrompt(context.snapshot),
    messages: [...context.history, { role: 'user', content: message }],
    tools: context.tools,
    stopWhen: stepCountIs(MAX_STEPS),
    maxRetries: 2,
    maxOutputTokens: 1200,
    abortSignal,
  });
}