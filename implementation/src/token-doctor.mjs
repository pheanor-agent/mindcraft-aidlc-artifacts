function tokens(value) {
  return [...String(value).toLocaleLowerCase().matchAll(/[\p{L}\p{N}]+/gu)].map(([token]) => token).filter((token) => token.length >= 2);
}

function dimension(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function analyzePrompt(prompt = "") {
  const text = String(prompt);
  const promptTokens = tokens(text);
  const uniqueTokens = new Set(promptTokens);
  const duplicateCount = Math.max(0, promptTokens.length - uniqueTokens.size);
  const hasGoal = /(?:^|\s)(?:fix|build|create|implement|analyze|review|summarize|write|design|update|정리|수정|구현|분석|검토|작성|설계|업데이트)(?:\s|$)/iu.test(text);
  const hasConstraints = /(?:must|should|only|avoid|include|exclude|조건|제약|반드시|제외|포함|금지)/iu.test(text);
  const hasFormat = /(?:json|yaml|markdown|table|bullet|checklist|format|형식|표|목록|체크리스트)/iu.test(text);
  const dimensions = {
    goalClarity: dimension(text.length === 0 ? 0 : hasGoal ? 100 : text.length >= 12 ? 65 : 35),
    contextRelevance: dimension(text.length === 0 ? 0 : promptTokens.length >= 3 ? 85 : 55),
    constraintCompleteness: dimension(text.length === 0 ? 0 : hasConstraints ? 100 : 45),
    outputFormatSpecificity: dimension(text.length === 0 ? 0 : hasFormat ? 100 : 40),
    ambiguityRisk: dimension(text.length === 0 ? 100 : hasGoal && promptTokens.length >= 3 ? 20 : 65),
    redundancy: dimension(promptTokens.length === 0 ? 0 : Math.min(100, duplicateCount * 25)),
    actionability: dimension(text.length === 0 ? 0 : hasGoal ? 90 : 50),
  };
  const score = dimension(
    dimensions.goalClarity * 0.2 +
    dimensions.contextRelevance * 0.15 +
    dimensions.constraintCompleteness * 0.15 +
    dimensions.outputFormatSpecificity * 0.1 +
    (100 - dimensions.ambiguityRisk) * 0.15 +
    (100 - dimensions.redundancy) * 0.1 +
    dimensions.actionability * 0.15,
  );
  const suggestions = [];
  if (!hasGoal) suggestions.push("목표를 동작 중심의 문장으로 시작하세요.");
  if (!hasConstraints) suggestions.push("필수 조건과 제외 조건을 짧게 명시하세요.");
  if (!hasFormat) suggestions.push("원하는 출력 형식이나 성공 기준을 지정하세요.");
  if (duplicateCount > 0) suggestions.push("반복되는 표현을 제거해 prompt를 줄이세요.");
  if (!suggestions.length) suggestions.push("현재 prompt 구조가 명확합니다. 불필요한 배경 설명만 계속 점검하세요.");
  const estimatedSavingsPercent = Math.max(0, Math.min(40, Math.round((duplicateCount * 5) + (text.length > 240 ? 10 : 0))));
  return {
    score,
    dimensions,
    suggestions,
    estimatedSavingsPercent,
    usageType: "estimate",
    estimateMethod: "heuristic_prompt_structure",
  };
}
