import * as parentRepository from "../../src/repositories/parentRepository.js";
import { generateToken, AUTH_COOKIE_NAME } from "../../src/services/tokenService.js";

let parentCounter = 0;

// Test-only: mints a real parent (with optional embedded children) and a
// valid auth cookie for it, so reading-session tests can authenticate
// without going through the full register/login HTTP flow — auth itself is
// already covered by authLogin.test.js/authMiddleware.test.js.
async function createAuthenticatedParent({ children = [] } = {}) {
  parentCounter += 1;

  const parent = await parentRepository.create({
    email: `test-parent-${parentCounter}@example.com`,
    passwordHash: "unused-in-these-tests",
    children,
  });

  return { parent, cookie: `${AUTH_COOKIE_NAME}=${generateToken(parent)}` };
}

// Convenience for the common case: exactly one child, needed as both an id
// (for request bodies) and the full subdocument (for assertions).
async function createAuthenticatedParentWithChild(child) {
  const { parent, cookie } = await createAuthenticatedParent({ children: [child] });

  return {
    parentId: parent._id.toString(),
    childId: parent.children[0]._id.toString(),
    cookie,
    child: parent.children[0],
  };
}

export { createAuthenticatedParent, createAuthenticatedParentWithChild };
