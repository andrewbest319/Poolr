import assert from "node:assert/strict";
import test from "node:test";

const BASE_URL = process.env.POOLR_SECURITY_BASE_URL || "";
const RUN_LIVE_SECURITY_TESTS = process.env.POOLR_RUN_LIVE_SECURITY_TESTS === "1";
const ALLOW_REMOTE_SECURITY_TARGET =
  process.env.POOLR_SECURITY_ALLOW_REMOTE === "1";
const SECURITY_SESSION_SECRET = process.env.POOLR_SECURITY_SESSION_SECRET || "";

function isLocalSecurityTarget(baseUrl = BASE_URL) {
  if (!baseUrl) return false;

  const host = new URL(baseUrl).hostname;

  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".test")
  );
}

function liveSecurityTargetSkipReason({
  runLiveSecurityTests = RUN_LIVE_SECURITY_TESTS,
  baseUrl = BASE_URL,
  securitySessionSecret = SECURITY_SESSION_SECRET,
  allowRemoteSecurityTarget = ALLOW_REMOTE_SECURITY_TARGET,
} = {}) {
  if (!runLiveSecurityTests) {
    return "Set POOLR_RUN_LIVE_SECURITY_TESTS=1 for live security authorization tests.";
  }

  if (!baseUrl) {
    return "POOLR_SECURITY_BASE_URL is not set.";
  }

  if (!securitySessionSecret) {
    return "POOLR_SECURITY_SESSION_SECRET is not set.";
  }

  if (!isLocalSecurityTarget(baseUrl) && !allowRemoteSecurityTarget) {
    return "Remote security targets require POOLR_SECURITY_ALLOW_REMOTE=1 and an isolated test system.";
  }

  return null;
}

test("live security tests require explicit opt-in and a throwaway session secret", () => {
  assert.equal(
    liveSecurityTargetSkipReason(),
    "Set POOLR_RUN_LIVE_SECURITY_TESTS=1 for live security authorization tests."
  );
  assert.equal(
    liveSecurityTargetSkipReason({ runLiveSecurityTests: true }),
    "POOLR_SECURITY_BASE_URL is not set."
  );
  assert.equal(
    liveSecurityTargetSkipReason({
      runLiveSecurityTests: true,
      baseUrl: "http://localhost:3000",
    }),
    "POOLR_SECURITY_SESSION_SECRET is not set."
  );
});

test("live security tests require explicit remote target approval", () => {
  assert.equal(isLocalSecurityTarget("http://localhost:3000"), true);
  assert.equal(isLocalSecurityTarget("http://poolr.test"), true);
  assert.equal(isLocalSecurityTarget("https://poolrgolf.com"), false);

  assert.equal(
    liveSecurityTargetSkipReason({
      runLiveSecurityTests: true,
      baseUrl: "https://poolrgolf.com",
      securitySessionSecret: "throwaway-test-secret",
    }),
    "Remote security targets require POOLR_SECURITY_ALLOW_REMOTE=1 and an isolated test system."
  );
  assert.equal(
    liveSecurityTargetSkipReason({
      runLiveSecurityTests: true,
      baseUrl: "https://poolrgolf.com",
      securitySessionSecret: "throwaway-test-secret",
      allowRemoteSecurityTarget: true,
    }),
    null
  );
});
