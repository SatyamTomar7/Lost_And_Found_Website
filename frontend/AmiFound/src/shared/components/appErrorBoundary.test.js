import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_ERROR_FALLBACK_MESSAGE,
  getAppErrorRetryState,
} from "./appErrorBoundary.utils.js";

test("application error fallback uses safe public text", () => {
  assert.match(APP_ERROR_FALLBACK_MESSAGE, /Something went wrong/);
  assert.doesNotMatch(
    APP_ERROR_FALLBACK_MESSAGE,
    /stack|database|provider|Error:/i,
  );
});

test("application recovery state clears the error and increments the remount key", () => {
  assert.deepEqual(getAppErrorRetryState({ retryKey: 2 }), {
    hasError: false,
    retryKey: 3,
  });
});
