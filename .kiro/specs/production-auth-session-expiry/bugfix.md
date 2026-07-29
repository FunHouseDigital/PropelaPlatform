# Bugfix Requirements Document

## Introduction

This bugfix addresses a production authentication inconsistency at `https://propela-platform.vercel.app/nurses`. On 2026-07-29, a clean incognito browser accepted sign-in and represented the user as signed in through the application authentication context, but the nurse data flow immediately rejected the session as expired during its separate authorization check. Repeating sign-in did not restore nurse access. In contrast, an existing normal-browser session successfully created and persisted Emily Plaatjies, and production verification confirmed one recent nurse row with `exactly_one=true`, `owner_assigned=true`, `version_valid=true`, and `current_version=2`.

The bug condition is the observable inconsistency in Supabase-enabled mode where sign-in succeeds and the authentication context holds the resulting active session, yet the nurse repository's independent session lookup does not recognize that same session as active. This describes the condition to be corrected without asserting the underlying root cause. The fix must make nurse authorization consistent for a successfully established active session while preserving real session-expiry handling, database authorization, confidentiality, authoritative data, legacy behavior, and all established nurse operations.

## Bug Analysis

### Current Behavior (Defect)

The defect occurs only when the application has accepted a Supabase sign-in but the nurse data flow independently evaluates the same session as absent or expired.

1.1 WHERE Supabase-backed mode is enabled, WHILE the authentication context reports the Supabase session resulting from a successful sign-in as active and the nurse repository's independent session check reports that same session as absent or expired, WHEN the first nurse list operation is requested in a browser context that contained no Supabase session before that sign-in, THE system SHALL reject the operation as unauthenticated and SHALL return no nurse data.

1.2 WHERE Supabase-backed mode is enabled, WHILE the user is at `/nurses` and the session evaluations remain as specified in 1.1, WHEN the first nurse list operation is rejected as unauthenticated, THE system SHALL display `Authentication required` and `Your session has expired. Please sign in again.` and SHALL not display nurse data authorized for the signed-in user.

1.3 WHERE Supabase-backed mode is enabled, WHILE the authentication context reports the session resulting from the user's next successful sign-in as active and the nurse repository's independent session check reports that same session as absent or expired, WHEN the user requests the nurse list again in the same browser context after the rejection in 1.2, THE system SHALL repeat the unauthenticated rejection and SHALL not display the authorized production nurse data.

### Expected Behavior (Correct)

A session successfully established by Supabase sign-in and represented as active by the authentication context must be recognized consistently by the nurse data flow for the same application context.

2.1 WHEN Supabase-backed mode is enabled, the browser context contains no pre-existing authentication session before sign-in, Supabase sign-in succeeds, and the authentication context represents the resulting session as active, THE system SHALL recognize the signed-in user as authenticated when authorizing the first nurse list operation initiated after sign-in.

2.2 WHEN the first nurse list operation is initiated at `/nurses` while the authentication context represents the Supabase session as active, THE system SHALL issue the nurse list request using that active session, apply the result authorized by RLS, and display all server-confirmed nurse records returned for the signed-in user or an empty result if no records are returned, without presenting an expired-session error unless Supabase identifies the session as absent, invalid, or expired before the operation completes.

2.3 WHEN a user completes a successful Supabase sign-in after a nurse operation was rejected because of an inconsistent session, and the authentication context represents the newly established session as active, THE system SHALL use the newly established session for the next nurse operation, make the production nurse data returned under RLS available to the user, and avoid repeating the authentication rejection unless Supabase identifies the new session as absent, invalid, or expired before that operation completes.

### Unchanged Behavior (Regression Prevention)

The fix is limited to reconciling active-session recognition and must not weaken authorization or alter nurse persistence behavior.

3.1 WHILE Supabase-backed mode is disabled, THE system SHALL use the feature-off legacy authentication and local nurse-storage behavior, without requiring a Supabase session or sending any Supabase nurse request.

3.2 IF Supabase-backed mode is enabled and the public Supabase client provides no session credential, the credential has reached its expiration time, or Supabase rejects the credential as invalid, THEN THE system SHALL block the nurse database operation, display an authentication-failure indication, preserve the last server-confirmed nurse state without modification, and send no retry until the user successfully signs in and manually retries the operation.

3.3 WHEN a nurse operation is requested in Supabase-backed mode while the public Supabase client provides a session credential that has not reached its expiration time, THE system SHALL send the request through that client with the credential attached and accept only the nurse data or operation result permitted by RLS.

3.4 WHEN a frontend authentication or nurse operation executes, THE system SHALL exclude the complete session credential and every substring containing a session token from user-visible output, nurse data, telemetry, logs, and persistence not used for authentication.

3.5 WHILE an existing normal-browser session has a credential that has not reached its expiration time and has not been rejected by Supabase, THE system SHALL recognize the session as authenticated, permit only nurse operations allowed by RLS, and neither sign out nor invalidate the session as a side effect of this fix.

3.6 WHILE Supabase-backed mode is enabled, THE system SHALL display nurse list and detail state only from successful Supabase responses and SHALL NOT display localStorage nurse records or bundled sample nurses as substitutes following an authentication failure, permission denial, or data-request failure.

3.7 WHEN the production nurse row for Emily Plaatjies is read without an authorized mutation occurring between the start and completion of the read, THE system SHALL return exactly one persisted row and leave its owner and version metadata unchanged from their values at the start of the read, including a current version value of 2.

3.8 WHEN an authorized user initiates a nurse create, read, update, pipeline-change, delete, refresh, conflict, retry, validation, or error-handling workflow, THE system SHALL apply the established nurse CRUD outcome only after a successful server response, use the server-returned nurse state as the accepted state, enforce the established version check for mutation conflicts, and preserve the last server-confirmed state while indicating failure when validation, authorization, version checking, or the server rejects the operation.

3.9 IF RLS denies a nurse request submitted with a session credential that has not reached its expiration time, THEN THE system SHALL report a permission failure, return no denied nurse data, apply no requested nurse mutation, preserve the last server-confirmed nurse state, and neither retry the request as successful nor obtain the data through a non-Supabase source.
