import * as parentRepository from "../../src/repositories/parentRepository.js";
import { generateToken, AUTH_COOKIE_NAME } from "../../src/services/tokenService.js";

let parentCounter = 0;

// Lets tests authenticate without repeating the register/login flow.
async function createAuthenticatedParent({ children = [] } = {}) {
  parentCounter += 1;

  const parent = await parentRepository.create({
    email: `test-parent-${parentCounter}@example.com`,
    passwordHash: "unused-in-these-tests",
    children,
  });

  return { parent, cookie: `${AUTH_COOKIE_NAME}=${generateToken(parent)}` };
}

// Common case: one child id for requests and the subdocument for assertions.
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
