import { describe, expect, it } from "vitest";
import { completedWindow, validInactivityPolicy } from "./tenant-inactivity";

const policy={enabled:true,automaticSuspension:false,windowDays:7,minimumUsers:10,graceDays:14,warningDays:2,cooldownDays:7,suspensionMessage:"This Mini App is temporarily unavailable while its activity status is reviewed."};
describe("tenant inactivity policy",()=>{
 it("accepts the requested safe defaults",()=>expect(validInactivityPolicy(policy)).toBe(true));
 it("rejects unsafe ranges",()=>{
  expect(validInactivityPolicy({...policy,windowDays:0})).toBe(false);
  expect(validInactivityPolicy({...policy,graceDays:3})).toBe(false);
  expect(validInactivityPolicy({...policy,minimumUsers:-1})).toBe(false);
 });
 it("uses a completed UTC window rather than a partial current day",()=>{
  const window=completedWindow(new Date("2026-07-28T14:30:00Z"),7);
  expect(window.end.toISOString()).toBe("2026-07-28T00:00:00.000Z");
  expect(window.start.toISOString()).toBe("2026-07-21T00:00:00.000Z");
 });
});
