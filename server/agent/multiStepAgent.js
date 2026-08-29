import { toolDefinitions, executeTool } from "./agentTools.js";
import eventBus from "../events/eventBus.js";

export async function runMultiStepAgent(prompt) {
  const executionSteps = [];
  const startTime = Date.now();

  eventBus.publish("AGENT_TASK_STARTED", { prompt });

  // Step 1: Analyze prompt & determine appropriate tool
  const promptLower = prompt.toLowerCase();
  let selectedTool = "search_knowledge_base";
  let toolArgs = { query: prompt };

  if (promptLower.includes("user") || promptLower.includes("directory") || promptLower.includes("who")) {
    selectedTool = "get_user_directory";
    toolArgs = { filter: "" };
  } else if (promptLower.includes("chat") || promptLower.includes("message") || promptLower.includes("history")) {
    selectedTool = "get_chat_history_summary";
    toolArgs = { limit: 5 };
  } else if (promptLower.includes("cache") || promptLower.includes("metric") || promptLower.includes("analytics") || promptLower.includes("performance")) {
    selectedTool = "calculate_analytics";
    toolArgs = { metricType: promptLower.includes("cache") ? "cache" : "performance" };
  }

  // Record Step 1: Reasoning & Planning
  const step1 = {
    step: 1,
    phase: "PLANNING",
    thought: `Analyzed prompt "${prompt}". Identified primary intent requiring tool execution. Selected tool '${selectedTool}'.`,
    timestamp: new Date().toISOString()
  };
  executionSteps.push(step1);
  eventBus.publish("AGENT_STEP_EXECUTED", step1);

  // Record Step 2: Function Calling / Tool Execution
  let toolResult = null;
  let toolError = null;

  try {
    const step2 = {
      step: 2,
      phase: "TOOL_CALL",
      toolName: selectedTool,
      arguments: toolArgs,
      timestamp: new Date().toISOString()
    };
    executionSteps.push(step2);
    eventBus.publish("AGENT_TOOL_CALLED", step2);

    toolResult = await executeTool(selectedTool, toolArgs);

    const step3 = {
      step: 3,
      phase: "OBSERVATION",
      output: toolResult,
      timestamp: new Date().toISOString()
    };
    executionSteps.push(step3);
    eventBus.publish("AGENT_STEP_EXECUTED", step3);
  } catch (err) {
    toolError = err.message;
  }

  // Step 3: Synthesis & Final Answer
  let finalAnswer = "";
  if (selectedTool === "get_user_directory") {
    finalAnswer = `Directory Analysis complete. Found ${toolResult.totalUsers} registered users in the platform system.`;
  } else if (selectedTool === "get_chat_history_summary") {
    finalAnswer = `Chat Analysis complete. Processed ${toolResult.retrievedCount} messages with an average message length of ${toolResult.averageMessageLength} characters.`;
  } else if (selectedTool === "calculate_analytics") {
    finalAnswer = `System Analytics generated. ${toolResult.metric}: Mode = ${toolResult.mode || 'Active'}, Cache Hit Rate = ${toolResult.hitRate || 'N/A'}.`;
  } else {
    finalAnswer = `Knowledge query result: ${toolResult.result}`;
  }

  const step4 = {
    step: 4,
    phase: "SYNTHESIS",
    finalAnswer,
    timestamp: new Date().toISOString()
  };
  executionSteps.push(step4);

  const durationMs = Date.now() - startTime;

  const resultPayload = {
    prompt,
    durationMs,
    totalSteps: executionSteps.length,
    steps: executionSteps,
    toolsUsed: [selectedTool],
    toolDefinitions,
    finalAnswer
  };

  eventBus.publish("AGENT_TASK_COMPLETED", { prompt, durationMs, toolsUsed: [selectedTool] });

  return resultPayload;
}
