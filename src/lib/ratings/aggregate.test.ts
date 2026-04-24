import { describe, expect, it } from "vitest";

import { aggregateRatingRows, type RatingRow } from "./aggregate";

const PP_A = "00000000-0000-0000-0000-000000000aaa";
const PP_B = "00000000-0000-0000-0000-000000000bbb";

describe("aggregateRatingRows", () => {
  it("returns an empty map for no rows", () => {
    expect(aggregateRatingRows([]).size).toBe(0);
  });

  it("counts a single row as average === stars", () => {
    const rows: RatingRow[] = [{ pickup_point_id: PP_A, stars: 4 }];
    const summary = aggregateRatingRows(rows).get(PP_A);
    expect(summary).toEqual({ averageStars: 4, count: 1 });
  });

  it("computes the arithmetic mean for multiple rows", () => {
    const rows: RatingRow[] = [
      { pickup_point_id: PP_A, stars: 5 },
      { pickup_point_id: PP_A, stars: 4 },
      { pickup_point_id: PP_A, stars: 3 },
    ];
    const summary = aggregateRatingRows(rows).get(PP_A);
    expect(summary).toEqual({ averageStars: 4, count: 3 });
  });

  it("rounds to one decimal place", () => {
    // 4 + 4 + 5 = 13 / 3 = 4.333… → 4.3
    const rows: RatingRow[] = [
      { pickup_point_id: PP_A, stars: 4 },
      { pickup_point_id: PP_A, stars: 4 },
      { pickup_point_id: PP_A, stars: 5 },
    ];
    expect(aggregateRatingRows(rows).get(PP_A)?.averageStars).toBe(4.3);
  });

  it("rounds half-up at the tenths place", () => {
    // 5 + 4 = 9 / 2 = 4.5 → stays 4.5
    const rows: RatingRow[] = [
      { pickup_point_id: PP_A, stars: 5 },
      { pickup_point_id: PP_A, stars: 4 },
    ];
    expect(aggregateRatingRows(rows).get(PP_A)?.averageStars).toBe(4.5);
  });

  it("groups independently per pickup_point_id", () => {
    const rows: RatingRow[] = [
      { pickup_point_id: PP_A, stars: 5 },
      { pickup_point_id: PP_B, stars: 1 },
      { pickup_point_id: PP_A, stars: 3 },
    ];
    const map = aggregateRatingRows(rows);
    expect(map.get(PP_A)).toEqual({ averageStars: 4, count: 2 });
    expect(map.get(PP_B)).toEqual({ averageStars: 1, count: 1 });
    expect(map.size).toBe(2);
  });

  it("skips rows with a null pickup_point_id", () => {
    const rows: RatingRow[] = [
      { pickup_point_id: null, stars: 5 },
      { pickup_point_id: PP_A, stars: 4 },
    ];
    const map = aggregateRatingRows(rows);
    expect(map.size).toBe(1);
    expect(map.get(PP_A)?.count).toBe(1);
  });

  it("handles all five star values across many rows", () => {
    // 1 + 2 + 3 + 4 + 5 = 15 / 5 = 3.0
    const rows: RatingRow[] = [
      { pickup_point_id: PP_A, stars: 1 },
      { pickup_point_id: PP_A, stars: 2 },
      { pickup_point_id: PP_A, stars: 3 },
      { pickup_point_id: PP_A, stars: 4 },
      { pickup_point_id: PP_A, stars: 5 },
    ];
    expect(aggregateRatingRows(rows).get(PP_A)).toEqual({
      averageStars: 3,
      count: 5,
    });
  });
});
