import { describe, expect, it } from "vitest";
import { conceptProgressPct, conceptStepRatios, currentConceptStep } from "./progressEngine";

const empty = {
  step1Completed: false,
  step1MaxSlideIndex: 0,
  step1SlideTotal: 0,
  studiedKeyPointIds: [] as string[],
  totalKeyPoints: 4,
  step2Completed: false,
  selfQaSeenIds: [] as string[],
  totalSelfQa: 10,
  step3Completed: false,
  passedConceptSetIds: [] as string[],
  totalConceptSets: 2,
  step4Completed: false,
};

describe("additive conceptProgressPct", () => {
  it("sums independent step contributions (5% + 10% = 15%)", () => {
    // Learn: 1 of 5 slides → 20% of step → 5% total
    // Self-test: 4 of 10 → 40% of step → 10% total
    const pct = conceptProgressPct({
      ...empty,
      step1MaxSlideIndex: 0,
      step1SlideTotal: 5,
      studiedKeyPointIds: [],
      totalKeyPoints: 4,
      selfQaSeenIds: ["a", "b", "c", "d"],
      totalSelfQa: 10,
    });
    expect(pct).toBe(15);
  });

  it("adds more Learn progress on top (15% → 20%)", () => {
    const pct = conceptProgressPct({
      ...empty,
      step1MaxSlideIndex: 1, // 2/5 → 10%
      step1SlideTotal: 5,
      selfQaSeenIds: ["a", "b", "c", "d"], // 10%
      totalSelfQa: 10,
    });
    expect(pct).toBe(20);
  });

  it("gives only step1 25% when later steps have empty totals (no auto-100%)", () => {
    const pct = conceptProgressPct({
      ...empty,
      step1Completed: true,
      step1MaxSlideIndex: 0,
      step1SlideTotal: 10,
      totalKeyPoints: 0,
      totalSelfQa: 0,
      totalConceptSets: 0,
    });
    // Empty KP/QA/sets stay 0 until explicitly completed
    expect(pct).toBe(25);
  });

  it("empty step totals stay at 0% until marked complete", () => {
    const r = conceptStepRatios({
      ...empty,
      step1Completed: true,
      totalKeyPoints: 0,
      totalSelfQa: 0,
      totalConceptSets: 0,
    });
    expect(r.r1).toBe(1);
    expect(r.r2).toBe(0);
    expect(r.r3).toBe(0);
    expect(r.r4).toBe(0);
  });

  it("explicit complete marks empty steps as 100% local", () => {
    const pct = conceptProgressPct({
      ...empty,
      step1Completed: true,
      step2Completed: true,
      step3Completed: true,
      totalKeyPoints: 0,
      totalSelfQa: 0,
      totalConceptSets: 0,
    });
    expect(pct).toBe(75);
  });

  it("exports step-local ratios for mini bars", () => {
    const r = conceptStepRatios({
      ...empty,
      step1MaxSlideIndex: 0,
      step1SlideTotal: 5,
      selfQaSeenIds: ["a", "b", "c", "d"],
      totalSelfQa: 10,
    });
    expect(r.r1).toBeCloseTo(0.2);
    expect(r.r3).toBeCloseTo(0.4);
    expect(r.c1).toBeCloseTo(5);
    expect(r.c3).toBeCloseTo(10);
  });

  it("currentConceptStep prefers first incomplete", () => {
    expect(
      currentConceptStep({
        ...empty,
        step1Completed: true,
        totalKeyPoints: 2,
        studiedKeyPointIds: ["x"],
      }),
    ).toBe(2);
  });
});
