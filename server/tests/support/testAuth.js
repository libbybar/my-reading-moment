import * as parentRepository from "../../src/repositories/parentRepository.js";
import { generateToken, AUTH_COOKIE_NAME } from "../../src/services/tokenService.js";
import { generateParentZoneToken, PARENT_ZONE_COOKIE_NAME } from "../../src/services/parentZoneSession.js";

let parentCounter = 0;

function buildParentZoneCookie(parentId) {
  return `${PARENT_ZONE_COOKIE_NAME}=${generateParentZoneToken(parentId.toString())}`;
}

// Login-flow tests get only the auth cookie back; this adds an unlocked parent-zone session.
async function addParentZoneSession(loginCookies, email) {
  const parent = await parentRepository.findByEmail(email);

  return [...loginCookies, buildParentZoneCookie(parent._id)];
}

// Lets tests authenticate without repeating the register/login flow.
// `cookie` includes an unlocked parent-zone session; `authCookie` is the login cookie alone.
async function createAuthenticatedParent({ children = [] } = {}) {
  parentCounter += 1;

  const parent = await parentRepository.create({
    email: `test-parent-${parentCounter}@example.com`,
    passwordHash: "unused-in-these-tests",
    children,
  });

  const authCookie = `${AUTH_COOKIE_NAME}=${generateToken(parent)}`;

  return { parent, authCookie, cookie: `${authCookie}; ${buildParentZoneCookie(parent._id)}` };
}

// Common case: one child id for requests and the subdocument for assertions.
async function createAuthenticatedParentWithChild(child) {
  const { parent, cookie, authCookie } = await createAuthenticatedParent({ children: [child] });

  return {
    parentId: parent._id.toString(),
    childId: parent.children[0]._id.toString(),
    cookie,
    authCookie,
    child: parent.children[0],
  };
}

export { createAuthenticatedParent, createAuthenticatedParentWithChild, addParentZoneSession, buildParentZoneCookie };
