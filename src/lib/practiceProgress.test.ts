import { describe, expect, it } from "vitest";
import type { PracticeQuestionFull } from "@/components/PracticeQuestionBlock";
import { getQuestionFillStatus, summarizePracticeRun } from "./practiceProgress";
import type { PracticeAnswer } from "./userProgress";

const mcq: PracticeQuestionFull = {
  id: "q1",
  questionMode: "mcq",
  mcq: {
    stem: "CAP",
    trueFalse: [
      { id: "a", statement: "A", correct: "true" },
      { id: "b", statement: "B", correct: "false" },
      { id: "c", statement: "C", correct: "true" },
    ],
  },
};

const sba: PracticeQuestionFull = {
  id: "q2",
  questionMode: "sba",
  sba: { stem: "SBA", options: ["a", "b", "c"], correctIndex: 1 },
};

describe("practiceProgress", () => {
  it("marks MCQ partial when some statements skipped", () => {
    const answers: PracticeAnswer[] = [
      { questionId: "q1:a", answer: { value: "true" }, isCorrect: true, answeredAt: "" },
    ];
    expect(getQuestionFillStatus(mcq, answers)).toBe("partial");
  });

  it("summarizes full / partial / empty", () => {
    const answers: PracticeAnswer[] = [
      { questionId: "q1:a", answer: { value: "true" }, isCorrect: true, answeredAt: "" },
      { questionId: "q1:b", answer: { value: "false" }, isCorrect: true, answeredAt: "" },
      { questionId: "q1:c", answer: { value: "true" }, isCorrect: true, answeredAt: "" },
    ];
    const summary = summarizePracticeRun([mcq, sba], answers);
    expect(summary.full).toBe(1);
    expect(summary.empty).toBe(1);
    expect(summary.partial).toBe(0);
    expect(summary.correct).toBe(3);
  });
});
