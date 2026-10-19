import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import {
  allowedRecaptchaHostnames,
  recaptchaErrorStatus,
  verifyRecaptchaToken,
} from "../server/utils/recaptcha.ts";

const PRODUCTION_HOST = "mathearchaia.gr";
const SECRET = "super-secret-value";

const originalFetch = globalThis.$fetch;
const originalError = console.error;

afterEach(() => {
  globalThis.$fetch = originalFetch;
  console.error = originalError;
});

describe("verifyRecaptchaToken", () => {
  it("rejects a blank token before calling siteverify", async () => {
    let called = false;
    globalThis.$fetch = async () => {
      called = true;
      return { success: true, hostname: PRODUCTION_HOST };
    };

    const result = await verifyRecaptchaToken("  ", SECRET, [PRODUCTION_HOST]);

    assert.equal(called, false);
    assert.deepEqual(result, {
      ok: false,
      errorCodes: ["missing-input-response"],
    });
  });

  it("accepts a solved checkbox only for an allowed hostname", async () => {
    globalThis.$fetch = async () => ({
      success: true,
      hostname: "WWW.Mathearchaia.GR",
    });

    const result = await verifyRecaptchaToken("token", SECRET, [
      "www.mathearchaia.gr",
    ]);

    assert.deepEqual(result, { ok: true });
  });

  it("rejects a token minted on a hostname outside the allowlist", async () => {
    globalThis.$fetch = async () => ({
      success: true,
      hostname: "localhost",
    });

    const result = await verifyRecaptchaToken("token", SECRET, [
      PRODUCTION_HOST,
    ]);

    assert.deepEqual(result, {
      ok: false,
      errorCodes: ["hostname-mismatch"],
    });
  });

  it("rejects success when siteverify omits the hostname", async () => {
    globalThis.$fetch = async () => ({ success: true });

    const result = await verifyRecaptchaToken("token", SECRET, [
      PRODUCTION_HOST,
    ]);

    assert.deepEqual(result, {
      ok: false,
      errorCodes: ["hostname-mismatch"],
    });
  });

  it("keeps string error codes from a normal rejection", async () => {
    globalThis.$fetch = async () => ({
      success: false,
      "error-codes": ["invalid-input-response", 12],
    });

    const result = await verifyRecaptchaToken("token", SECRET, [
      PRODUCTION_HOST,
    ]);

    assert.deepEqual(result, {
      ok: false,
      errorCodes: ["invalid-input-response"],
    });
  });

  it("times out siteverify and reports it unavailable without logging the secret", async () => {
    const logged = [];
    console.error = (...args) => {
      logged.push(args);
    };
    const failure = new Error("network down");
    failure.body = `secret=${SECRET}&response=token`;
    let timeout;
    globalThis.$fetch = async (_url, options) => {
      timeout = options.timeout;
      throw failure;
    };

    const result = await verifyRecaptchaToken("token", SECRET, [
      PRODUCTION_HOST,
    ]);

    assert.equal(timeout, 5000);
    assert.deepEqual(result, {
      ok: false,
      errorCodes: ["siteverify-unavailable"],
    });
    assert.equal(logged.length, 1);
    assert.equal(logged[0][1], "network down");
    assert.equal(JSON.stringify(logged).includes(SECRET), false);
  });
});

describe("recaptcha host policy", () => {
  it("allows localhost only outside production", () => {
    assert.deepEqual(allowedRecaptchaHostnames("production"), [
      PRODUCTION_HOST,
      "www.mathearchaia.gr",
    ]);
    assert.equal(
      allowedRecaptchaHostnames("development").includes("localhost"),
      true,
    );
    assert.equal(
      allowedRecaptchaHostnames("production").includes("localhost"),
      false,
    );
  });

  it("maps an unreachable siteverify to 503 and every other failure to 400", () => {
    assert.equal(recaptchaErrorStatus(["siteverify-unavailable"]), 503);
    assert.equal(recaptchaErrorStatus(["hostname-mismatch"]), 400);
    assert.equal(recaptchaErrorStatus(["invalid-input-response"]), 400);
    assert.equal(recaptchaErrorStatus([]), 400);
  });
});

describe("contact route captcha wiring", () => {
  const source = readFileSync(
    new URL("../server/api/contact.post.ts", import.meta.url),
    "utf8",
  );
  const docs = readFileSync(new URL("../DEV_SETUP.md", import.meta.url), "utf8");

  it("uses the host allowlist and the status helper", () => {
    assert.match(source, /allowedRecaptchaHostnames\(\)/);
    assert.match(source, /recaptchaErrorStatus\(/);
  });

  it("tells the visitor verification is unavailable when the secret is missing", () => {
    const secretAt = source.indexOf("missing recaptcha secret");
    const block = source.slice(
      secretAt,
      source.indexOf("verifyRecaptchaToken(", secretAt),
    );
    assert.match(
      source,
      /Η επαλήθευση δεν είναι διαθέσιμη\. Δοκίμασε ξανά αργότερα\./,
    );
    assert.match(block, /RECAPTCHA_UNAVAILABLE/);
    assert.doesNotMatch(block, /recaptcha:\s*true/);
  });

  it("keeps localhost off the production key instructions", () => {
    assert.match(docs, /separate key pair/i);
    assert.doesNotMatch(
      docs,
      /domains `mathe-paidi-mou-archaia\.com` and `localhost`/,
    );
  });
});
