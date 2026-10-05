const ERROR_RESPONSE_DEFINITIONS = {
  routeNotFound: {
    code: "route_not_found",
    publicMessage: "Route not found",
    developmentMessage: "No route matched this request.",
  },
  authenticationRequired: {
    code: "authentication_required",
    publicMessage: "Authentication required",
    developmentMessage: "A valid authentication cookie is required.",
  },
  parentZoneLocked: {
    code: "parent_zone_locked",
    publicMessage: "Parent zone is locked",
    developmentMessage: "A valid parent-zone session is required; unlock it with the parent PIN.",
  },
  parentZoneInvalidInput: {
    code: "parent_zone_invalid_input",
    publicMessage: "Invalid parent zone details",
    developmentMessage:
      "pin/newPin/currentPin must be exactly 4 digits, and a PIN change needs exactly one of currentPin or password",
  },
  parentZoneInvalidCredentials: {
    code: "parent_zone_invalid_credentials",
    publicMessage: "Incorrect PIN or password",
    developmentMessage: "The supplied PIN or account password did not match.",
  },
  parentZoneTooManyAttempts: {
    code: "parent_zone_too_many_attempts",
    publicMessage: "Too many attempts, try again in a minute",
    developmentMessage: "Failed parent-zone attempts reached the limit; locked out for one minute.",
  },
  parentZonePinNotSet: {
    code: "parent_zone_pin_not_set",
    publicMessage: "No parent PIN is set",
    developmentMessage: "The parent has not set a PIN yet.",
  },
  parentZoneFailed: {
    code: "parent_zone_failed",
    publicMessage: "Parent zone request failed",
    developmentMessage: "The parent zone request could not be completed.",
  },
  registerInvalidInput: {
    code: "register_invalid_input",
    publicMessage: "Invalid registration details",
    developmentMessage: "email must be a valid address and password must be at least 8 characters",
  },
  registerEmailTaken: {
    code: "register_email_taken",
    publicMessage: "A parent account with this email already exists",
    developmentMessage: "The requested email already belongs to a parent account.",
  },
  registerFailed: {
    code: "register_failed",
    publicMessage: "Failed to register parent account",
    developmentMessage: "The parent account could not be registered.",
  },
  loginInvalidInput: {
    code: "login_invalid_input",
    publicMessage: "Invalid login details",
    developmentMessage: "email and password are required",
  },
  loginInvalidCredentials: {
    code: "login_invalid_credentials",
    publicMessage: "Invalid email or password",
    developmentMessage: "The email/password pair did not match a parent account.",
  },
  loginFailed: {
    code: "login_failed",
    publicMessage: "Failed to log in",
    developmentMessage: "The login request could not be completed.",
  },
  childProfilesLoadFailed: {
    code: "child_profiles_load_failed",
    publicMessage: "Failed to load child profiles",
    developmentMessage: "The child profiles collection could not be loaded.",
  },
  childProfileProgressLoadFailed: {
    code: "child_profile_progress_load_failed",
    publicMessage: "Failed to load the progress report",
    developmentMessage: "The child's progress report could not be loaded.",
  },
  childProfileCreateInvalidInput: {
    code: "child_profile_create_invalid_input",
    publicMessage: "Invalid child profile details",
    developmentMessage:
      "name is required, grammaticalGender must be female/male, readingLevel must be beginner/intermediate/advanced, and interests must be a list of values from the allowed interests list",
  },
  parentNotFound: {
    code: "parent_not_found",
    publicMessage: "Parent not found",
    developmentMessage: "The authenticated parent record could not be found.",
  },
  childProfileCreateFailed: {
    code: "child_profile_create_failed",
    publicMessage: "Failed to create child profile",
    developmentMessage: "The child profile could not be created.",
  },
  childProfileInvalidName: {
    code: "child_profile_invalid_name",
    publicMessage: "Invalid child profile details",
    developmentMessage: "name must be a non-blank string",
  },
  childProfileInvalidGrammaticalGender: {
    code: "child_profile_invalid_grammatical_gender",
    publicMessage: "Invalid child profile details",
    developmentMessage: 'grammaticalGender must be "female" or "male"',
  },
  childProfileInvalidReadingLevel: {
    code: "child_profile_invalid_reading_level",
    publicMessage: "Invalid child profile details",
    developmentMessage: "readingLevel must be beginner, intermediate, or advanced",
  },
  childProfileInvalidInterests: {
    code: "child_profile_invalid_interests",
    publicMessage: "Invalid child profile details",
    developmentMessage: "interests must be a list of values from the allowed interests list",
  },
  childProfileInvalidAvatar: {
    code: "child_profile_invalid_avatar",
    publicMessage: "Invalid child profile details",
    developmentMessage: "avatarId must be one of the allowed avatars",
  },
  childProfileUpdateEmpty: {
    code: "child_profile_update_empty",
    publicMessage: "Invalid child profile details",
    developmentMessage: "At least one field must be provided",
  },
  childNotFound: {
    code: "child_not_found",
    publicMessage: "Child not found",
    developmentMessage: "No child profile matched this parent and child id.",
  },
  placementInvalidInput: {
    code: "placement_invalid_input",
    publicMessage: "Invalid placement request",
    developmentMessage: "itemId must be a non-blank string and selectedSentenceIndex a sentence position",
  },
  placementEstimateMissing: {
    code: "placement_estimate_missing",
    publicMessage: "The parent has not given a starting estimate yet",
    developmentMessage: "Save the parent's starting signal before starting placement.",
  },
  placementNotStarted: {
    code: "placement_not_started",
    publicMessage: "Placement has not started",
    developmentMessage: "Start placement before answering, skipping or asking for help.",
  },
  placementUnavailable: {
    code: "placement_unavailable",
    publicMessage: "Placement is not available right now",
    developmentMessage: "The mapper item bank does not have enough reviewed items for this child's starting band.",
  },
  placementFailed: {
    code: "placement_failed",
    publicMessage: "Placement request failed",
    developmentMessage: "The placement request could not be completed.",
  },
  learningJourneyInvalidInput: {
    code: "learning_journey_invalid_input",
    publicMessage: "Invalid learning journey details",
    developmentMessage: "startingSignal must be one of the allowed starting signals",
  },
  learningJourneyPlacementStarted: {
    code: "learning_journey_placement_started",
    publicMessage: "The starting estimate can no longer be changed",
    developmentMessage: "Placement has already started for this child, so the seed band is fixed.",
  },
  learningJourneyLoadFailed: {
    code: "learning_journey_load_failed",
    publicMessage: "Failed to load the learning journey",
    developmentMessage: "The learning journey could not be loaded.",
  },
  learningJourneySaveFailed: {
    code: "learning_journey_save_failed",
    publicMessage: "Failed to save the learning journey",
    developmentMessage: "The learning journey could not be saved.",
  },
  childProfileUpdateFailed: {
    code: "child_profile_update_failed",
    publicMessage: "Failed to update child profile",
    developmentMessage: "The child profile could not be updated.",
  },
  childProfileDeleteFailed: {
    code: "child_profile_delete_failed",
    publicMessage: "Failed to delete child profile",
    developmentMessage: "The child profile could not be archived.",
  },
  readingSessionChildIdRequired: {
    code: "reading_session_child_id_required",
    publicMessage: "Invalid reading session request",
    developmentMessage: "childId is required",
  },
  readingSessionPreviewFailed: {
    code: "reading_session_preview_failed",
    publicMessage: "Failed to generate a reading question",
    developmentMessage: "The reading-session preview could not be generated.",
  },
  readingSessionBusy: {
    code: "reading_session_busy",
    publicMessage: "This reading exercise is not accepting requests right now",
    developmentMessage: "The reading session is locked or already being mutated.",
  },
  readingSessionNotFound: {
    code: "reading_session_not_found",
    publicMessage: "Session not found",
    developmentMessage: "No active reading session matched the supplied sessionId.",
  },
  readingSessionAnswerInvalidInput: {
    code: "reading_session_answer_invalid_input",
    publicMessage: "Invalid answer request",
    developmentMessage: "sessionId and answerText are required, and answerText has a max length",
  },
  readingSessionAnswerFailed: {
    code: "reading_session_answer_failed",
    publicMessage: "Failed to evaluate the answer",
    developmentMessage: "The answer could not be evaluated.",
  },
  readingSessionSkipInvalidInput: {
    code: "reading_session_skip_invalid_input",
    publicMessage: "Invalid skip request",
    developmentMessage: "sessionId is required",
  },
  readingSessionSkipConflict: {
    code: "reading_session_skip_conflict",
    publicMessage: "This reading exercise has already been finalized",
    developmentMessage: "The reading session was already completed before this skip request.",
  },
  readingSessionSkipFailed: {
    code: "reading_session_skip_failed",
    publicMessage: "Failed to skip the reading exercise",
    developmentMessage: "The reading session could not be skipped.",
  },
  readingSessionNextQuestionInvalidInput: {
    code: "reading_session_next_question_invalid_input",
    publicMessage: "Invalid next-question request",
    developmentMessage: "sessionId is required",
  },
  readingSessionNextQuestionFailed: {
    code: "reading_session_next_question_failed",
    publicMessage: "Failed to generate the next reading question",
    developmentMessage: "The next reading question could not be generated.",
  },
  readingSessionQuestionInvalidInput: {
    code: "reading_session_question_invalid_input",
    publicMessage: "Invalid question request",
    developmentMessage: "sessionId is required",
  },
  readingSessionQuestionFailed: {
    code: "reading_session_question_failed",
    publicMessage: "Failed to generate the reading question",
    developmentMessage: "The initial reading question could not be generated or retrieved.",
  },
};

function isDevelopmentErrorDetailsEnabled() {
  return process.env.NODE_ENV === "development";
}

function buildDebugDetails(definition, cause) {
  const debug = {
    message: definition.developmentMessage,
  };

  if (cause instanceof Error) {
    debug.causeName = cause.name;
    debug.causeMessage = cause.message;
  }

  return debug;
}

function buildErrorResponseBody(errorResponseName, { cause } = {}) {
  const definition = ERROR_RESPONSE_DEFINITIONS[errorResponseName];

  if (!definition) {
    throw new Error(`Unknown error response: ${errorResponseName}`);
  }

  const body = {
    error: definition.publicMessage,
    errorCode: definition.code,
  };

  if (isDevelopmentErrorDetailsEnabled()) {
    body.debug = buildDebugDetails(definition, cause);
  }

  return body;
}

function sendErrorResponse(res, statusCode, errorResponseName, options) {
  return res.status(statusCode).json(buildErrorResponseBody(errorResponseName, options));
}

export { buildErrorResponseBody, sendErrorResponse };
