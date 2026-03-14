// Score assessment based on type and rules

export interface ScoringResult {
  totalScore: number;
  resultSummary: string;
  resultDetail: string;
}

export function scoreAssessment(answers: number[], scoringRulesJson: string): ScoringResult {
  const rules = JSON.parse(scoringRulesJson);

  if (rules.type === "mbti") {
    return scoreMBTI(answers, rules);
  }

  // Standard threshold-based scoring (SDS, SAS, PHQ-9)
  return scoreThreshold(answers, rules);
}

function scoreThreshold(answers: number[], rules: any): ScoringResult {
  const reverseItems = new Set(rules.reverseItems || []);
  const maxScore = rules.optionScores[rules.optionScores.length - 1];
  const minScore = rules.optionScores[0];

  let rawTotal = 0;
  for (let i = 0; i < answers.length; i++) {
    const answerIndex = answers[i];
    let score = rules.optionScores[answerIndex] ?? 0;

    // Reverse scoring for positive items
    if (reverseItems.has(i)) {
      score = (maxScore + minScore) - score;
    }
    rawTotal += score;
  }

  // SDS and SAS use standard score = raw * 1.25 (rounded)
  let totalScore = rawTotal;
  if (rules.type === "sds" || rules.type === "sas") {
    totalScore = Math.round(rawTotal * 1.25);
  }

  // Find matching threshold
  const thresholds = rules.thresholds || [];
  let summary = "已完成";
  let detail = "感谢你完成测评。";

  for (const t of thresholds) {
    if (totalScore <= t.max) {
      summary = t.summary;
      detail = t.detail;
      break;
    }
  }

  return { totalScore, resultSummary: summary, resultDetail: detail };
}

function scoreMBTI(answers: number[], rules: any): ScoringResult {
  const dimensions = rules.dimensions;
  let type = "";
  const dimensionResults: string[] = [];

  for (const dim of dimensions) {
    let aCount = 0;
    let bCount = 0;

    for (const qi of dim.questions) {
      if (answers[qi] === 0) aCount++;
      else bCount++;
    }

    if (aCount >= bCount) {
      type += dim.aType;
      dimensionResults.push(`${dim.name}: ${dim.aType} (${aCount}/${aCount + bCount})`);
    } else {
      type += dim.bType;
      dimensionResults.push(`${dim.name}: ${dim.bType} (${bCount}/${aCount + bCount})`);
    }
  }

  const typeDesc = rules.typeDescriptions[type] || { name: type, desc: "独特的性格类型组合。" };

  return {
    totalScore: 0,
    resultSummary: `${type} - ${typeDesc.name}`,
    resultDetail: `你的 MBTI 类型是 **${type}（${typeDesc.name}）**\n\n${typeDesc.desc}\n\n维度分析：\n${dimensionResults.map(d => `• ${d}`).join("\n")}\n\n注意：MBTI 是一种性格偏好指标，不是能力测试。每种类型都有其独特的优势和发展方向。`,
  };
}
