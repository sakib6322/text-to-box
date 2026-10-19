import { describe, expect, it } from "vitest";
import type { PracticeQuestionFull } from "@/components/PracticeQuestionBlock";
import { getQuestionFillStatus, getQuestionUnitDetail, summarizePracticeRun } from "./practiceProgress";
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
      { id: "d", statement: "D", correct: "false" },
      { id: "e", statement: "E", correct: "true" },
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

  it("builds per-unit dots for mixed MCQ outcomes", () => {
    const answers: PracticeAnswer[] = [
      { questionId: "q1:a", answer: { value: "true" }, isCorrect: true, answeredAt: "" },
      { questionId: "q1:b", answer: { value: "true" }, isCorrect: false, answeredAt: "" },
      { questionId: "q1:c", answer: { value: "true" }, isCorrect: true, answeredAt: "" },
      { questionId: "q1:d", answer: { value: "false" }, isCorrect: true, answeredAt: "" },
      // e skipped
    ];
    const detail = getQuestionUnitDetail(mcq, answers);
    expect(detail.status).toBe("partial");
    expect(detail.units).toEqual(["correct", "wrong", "correct", "correct", "skip"]);
    expect(detail.mode).toBe("mcq");
    expect(detail.correct).toBe(3);
    expect(detail.wrong).toBe(1);
    expect(detail.skip).toBe(1);
    expect(detail.total).toBe(5);
    expect(detail.pctCorrect).toBe(60);
  });

  it("marks SBA mode without multi-unit partial math", () => {
    const answers: PracticeAnswer[] = [
      { questionId: "q2", answer: { selectedIndex: 1 }, isCorrect: true, answeredAt: "" },
    ];
    const detail = getQuestionUnitDetail(sba, answers);
    expect(detail.mode).toBe("sba");
    expect(detail.status).toBe("full");
    expect(detail.total).toBe(1);
  });

  it("summarizes full / partial / empty", () => {
    const answers: PracticeAnswer[] = [
      { questionId: "q1:a", answer: { value: "true" }, isCorrect: true, answeredAt: "" },
      { questionId: "q1:b", answer: { value: "false" }, isCorrect: true, answeredAt: "" },
      { questionId: "q1:c", answer: { value: "true" }, isCorrect: true, answeredAt: "" },
      { questionId: "q1:d", answer: { value: "false" }, isCorrect: true, answeredAt: "" },
      { questionId: "q1:e", answer: { value: "true" }, isCorrect: true, answeredAt: "" },
    ];
    const summary = summarizePracticeRun([mcq, sba], answers);
    expect(summary.full).toBe(1);
    expect(summary.empty).toBe(1);
    expect(summary.partial).toBe(0);
    expect(summary.correct).toBe(5);
    expect(summary.details).toHaveLength(2);
  });
});
