# Requirements Document: Nurse Management

## Introduction

Nurse Management provides list, detail, create, edit, pipeline-stage, and delete workflows for nurse records while preserving two intentionally separate persistence modes. When the `SUPABASE_BACKEND` feature flag is enabled, Supabase is the sole nurse data source and Row-Level Security remains the authorization boundary. When the flag is disabled, the established localStorage and seven bundled sample nurses continue unchanged.

These requirements correct the diagnosed split-source flaw in which the nurse page reads localStorage directly and can display bundled samples even after the shared data layer has loaded an empty Supabase table. The requirements define deterministic pagination, server-confirmed state, explicit drafts, version-based optimistic concurrency, retry behavior, validation, security, and measurable loading, empty, conflict, not-found, storage, and failure outcomes.

## Glossary

- **Nurse_Management_System**: The nurse page, nurse controller, repository, data-layer facade, adapters, forms, dialogs, and state transitions that implement this feature.
- **Supabase_Mode**: The application mode selected when `SUPABASE_BACKEND` is enabled at module initialization.
- **Legacy_Mode**: The application mode selected when `SUPABASE_BACKEND` is disabled at module initialization.
- **Supabase**: The remote authentication and PostgreSQL-backed service containing the authoritative `nurses` table in Supabase_Mode.
- **Supabase_Response**: A successful or failed result returned from a request to Supabase under the active session.
- **Supabase_Nurse**: A Nurse decoded from a successful Supabase_Response in the current application load, or retained from an earlier successful Supabase_Response and explicitly marked stale after refresh failure.
- **Nurse**: The supported camelCase user-interface model for one nurse, including business fields and read-only metadata.
- **Nurse_Row**: The snake_case database representation of a Nurse in the Supabase `nurses` table.
- **Nurse_Codec**: The boundary component that validates, encodes, and decodes Nurse and Nurse_Row values.
- **Nurse_Repository**: The record-level abstraction that lists, reads, creates, updates, and deletes Nurse records through the selected adapter.
- **Data_Layer_Facade**: The module-initialized router that selects exactly one persistence adapter from the feature flag.
- **Storage_Adapter**: The adapter that reads and writes the established browser localStorage nurse representation in Legacy_Mode.
- **Bundled_Sample_Nurses**: The seven nurse records supplied by the existing `initializeData` nurse-seeding behavior.
- **Accepted_List**: The complete, internally consistent list accepted after a successful list operation, containing a number of distinct Nurse identifiers equal to the operation's reported total.
- **Reported_Total**: The exact count returned by the selected persistence adapter for an unfiltered nurse list operation.
- **Server_Confirmed_State**: Nurse list and detail data produced by the latest successful persistence response and accepted by the Nurse_Management_System.
- **Draft**: User-entered create or edit values held separately from Server_Confirmed_State until a write succeeds or the user explicitly discards the values.
- **Blank_Create_Draft**: A create Draft containing no copied sample identity or sample business content. `pipelineStage` is `Applied`; `readinessStatus` is `calculateReadinessStatus('Applied')`; `oetStatus` is `Not Started`; `submittedAt` is the current local date; all other supported string business fields are empty; `flags`, `efSetScore`, `englishPts`, `cvScore`, `finalScore`, and all seven scorecard criteria are 0; `agreementSigned` is false; and `additionalCertifications` and `communicationLog` are empty arrays.
- **Create_Draft_ID**: One cryptographically generated identifier in the form `nurse-<UUID>`, assigned once to a create Draft and reused for that Draft unless collision verification proves a genuine collision.
- **Normalized_Business_Values**: The supported create business fields after the exact validation, text normalization, enum normalization, numeric normalization, and derived-field helpers required by Requirement 8, excluding Authoritative_Metadata.
- **Authenticated_User**: The user represented by the active valid Supabase session and corresponding UUID.
- **Owner_ID**: The `owner_id` database value taken from the Authenticated_User UUID during creation.
- **Version**: The integer concurrency token returned by persistence and retained with each Nurse.
- **Base_Version**: The Version from the authoritative read on which an update, Pipeline_Change, or delete is based.
- **Original_Base**: The complete Nurse returned by the authoritative detail read that created the current edit Draft.
- **Latest_Nurse**: The current persisted Nurse returned after a version mismatch or an explicit detail reload.
- **Conflict**: A mutation result indicating that the target row exists but the submitted Base_Version differs from the current Version.
- **Already_Deleted**: A delete result indicating that the target row is absent when the version-gated delete is evaluated.
- **Row_Level_Security**: Supabase database policies, abbreviated RLS, that authorize every read and write using the active session token.
- **Expected_Operational_Role**: An Admin, Superadmin, or Recruiter role for which current product policy expects nurse mutation controls to be available.
- **Recoverable_Failure**: A network failure, adapter timeout, or Unknown_Error for which a manual retry can be offered without discarding user-entered values.
- **List_Consistency_Failure**: A retryable list failure caused by inconsistent Reported_Total values, duplicate Nurse identifiers, or a final distinct-row count different from Reported_Total.
- **Stale_Warning**: A persistent indication that displayed Supabase_Nurses may be out of date because a refresh failed.
- **Unknown_Error**: A safely normalized failure that does not match validation, authentication, permission, network, conflict, storage, database-rule, or not-found categories.
- **Pipeline_Change**: A change to a Nurse pipeline stage initiated through pipeline drag-and-drop or an equivalent pipeline control.
- **Empty_Table_State**: The successful, unfiltered Accepted_List state with Reported_Total equal to zero.
- **Filter_No_Match_State**: The state in which Accepted_List has a Reported_Total greater than zero but current search or filters produce zero visible results.
- **Authoritative_Metadata**: `id`, `ownerId`, `version`, `createdAt`, and `updatedAt` in a Nurse, corresponding to `id`, `owner_id`, `version`, `created_at`, and `updated_at` in a Nurse_Row.
- **UUID**: A universally unique identifier generated with the browser cryptographic UUID generator.
- **camelCase**: The user-interface field naming form in which later words begin with capital letters, such as `fullName`.
- **snake_case**: The database field naming form in which words are separated by underscores, such as `full_name`.
- **Attributes_Object**: The allowlisted JSON object stored in the Nurse_Row `attributes` column for supported business fields without dedicated typed columns.
- **Session_Token**: The active Authenticated_User credential automatically attached by the public Supabase client.
- **Adapter_Timeout**: The timeout duration exported and applied by the selected project adapter; the current Supabase adapter source of truth is `REQUEST_TIMEOUT_MS`.
- **Storage_Failure**: A localStorage read, serialization, quota, access, or write failure reported by the Storage_Adapter.
- **Telemetry**: Privacy-safe operational measurements containing operation name, outcome category, backend, duration, retry count, and an optional request identifier.
- **Text_Length_Limits**: The current shared `MAX_LENGTHS` values: 120 characters for names, 254 for email addresses, 200 for single-line short text, and 5,000 for multiline long text.
- **Configured_Option_Set**: The current exported project constant used by the corresponding nurse select control, including `PIPELINE_STAGES`, `NEXT_ACTION_VALUES`, `GENDERS`, `AGE_GROUPS`, `SANC_APC_STATUSES`, `QUALIFICATION_TYPES`, `YEARS_EXPERIENCE`, `SPECIALTIES`, `EMPLOYMENT_STATUSES`, `YES_NO`, `EFSET_LEVELS`, `OET_STATUSES`, `SHORTLIST_DECISIONS`, `COMMITMENT_FEE_STATUSES`, and `SOURCE_OPTIONS`.
- **Existing_Calculation_Helpers**: The current project functions `calculateReadinessStatus`, `calculateCVScore`, `calculateFinalScore`, and `calculateTier`; these functions are the authoritative formulas and mappings for derived nurse values.
- **Numeric_Score_Rules**: Each of the seven scorecard criteria is a finite integer from 0 through 5, where 0 is the unset value and interactive ratings use 1 through 5; `englishPts` is a finite number from 0 through 3; `efSetScore` is empty or a finite number greater than or equal to 0; derived score fields are outputs of Existing_Calculation_Helpers rather than user-entered values.

## Requirements

### Requirement 1: Select and Isolate the Authoritative Data Source

**User Story:** As an operator, I want nurse data to come from the configured backend only, so that the page cannot mix remote records with local samples.

#### Acceptance Criteria

1. THE Data_Layer_Facade SHALL select exactly one persistence adapter at module initialization and retain the selected adapter until the next application load.
2. WHERE Supabase_Mode is active, THE Data_Layer_Facade SHALL route every nurse list, detail, create, update, Pipeline_Change, and delete operation exclusively to Supabase.
3. WHERE Supabase_Mode is active, THE Nurse_Management_System SHALL render only Supabase_Nurses in nurse list and detail views.
4. WHERE Supabase_Mode is active, THE Nurse_Management_System SHALL exclude localStorage records and Bundled_Sample_Nurses from nurse reads, writes, fallback behavior, and state reconciliation.
5. WHERE Supabase_Mode is active, IF any Supabase nurse request fails, THEN THE Nurse_Management_System SHALL leave Server_Confirmed_State unchanged and surface the normalized failure.
6. WHERE Supabase_Mode is active, IF any Supabase nurse request fails, THEN THE Data_Layer_Facade SHALL invoke neither the Storage_Adapter nor nurse seed initialization for that operation.
7. WHERE Supabase_Mode is active, WHEN a refresh fails after an Accepted_List exists, THE Nurse_Management_System SHALL retain the prior Accepted_List and display a Stale_Warning.
8. WHERE Supabase_Mode is active, THE Nurse_Repository SHALL request nurse pages with no page larger than the adapter maximum of 100 rows until pagination completes or fails.
9. WHERE Supabase_Mode is active, WHEN every requested nurse page succeeds with one consistent Reported_Total, THE Nurse_Repository SHALL accept the result only when the number of distinct Nurse identifiers equals Reported_Total.
10. WHERE Supabase_Mode is active, IF a nurse page fails after one or more earlier pages succeeded, THEN THE Nurse_Repository SHALL discard the partial aggregate and return the categorized page failure.
11. WHERE Supabase_Mode is active, IF pagination contains duplicate Nurse identifiers, inconsistent reported totals, or a final distinct-row count different from Reported_Total, THEN THE Nurse_Repository SHALL discard the aggregate and return a List_Consistency_Failure.
12. WHERE Supabase_Mode is active, IF pagination returns a failure, THEN THE Nurse_Management_System SHALL leave the prior Accepted_List and Reported_Total unchanged.

### Requirement 2: Present List, Loading, Empty, and Refresh States

**User Story:** As an operator, I want the nurse list to distinguish loading, empty, filtered, stale, and failed states, so that I can understand the data shown and take the correct next action.

#### Acceptance Criteria

1. WHILE the initial nurse list request is pending without an Accepted_List, THE Nurse_Management_System SHALL display an initial loading indicator and no Empty_Table_State.
2. WHEN an initial nurse list request succeeds, THE Nurse_Management_System SHALL establish the returned complete result as Accepted_List and display Reported_Total as the total nurse count.
3. WHEN an unfiltered Accepted_List has Reported_Total equal to zero, THE Nurse_Management_System SHALL display Empty_Table_State with zero nurse cards, pipeline items, cohort rows, or Bundled_Sample_Nurses.
4. WHEN Empty_Table_State is displayed and creation is available to the current user, THE Nurse_Management_System SHALL display an Add Nurse action.
5. WHEN Accepted_List has Reported_Total greater than zero and current search or filters produce zero visible Nurses, THE Nurse_Management_System SHALL display Filter_No_Match_State with a Clear Filters action.
6. WHEN Filter_No_Match_State is displayed, THE Nurse_Management_System SHALL retain Reported_Total as the total nurse count and distinguish the zero visible matches from Empty_Table_State.
7. IF the initial nurse list request fails without an Accepted_List, THEN THE Nurse_Management_System SHALL display a persistent categorized error and a Retry action without displaying nurse records.
8. WHILE a refresh is pending after an Accepted_List exists, THE Nurse_Management_System SHALL retain the Accepted_List and Reported_Total and display refresh progress.
9. WHILE a refresh is pending, THE Nurse_Management_System SHALL prevent a second refresh request and return or reuse the pending refresh result for duplicate refresh activation.
10. IF a refresh fails after an Accepted_List exists, THEN THE Nurse_Management_System SHALL retain the Accepted_List and Reported_Total, display the categorized error, and display a Stale_Warning with a Retry action.
11. WHEN a list retry succeeds, THE Nurse_Management_System SHALL replace the prior Accepted_List and Reported_Total with the complete returned result and clear the list error and Stale_Warning.
12. WHEN a list refresh succeeds, THE Nurse_Management_System SHALL replace Server_Confirmed_State with the complete returned result, including confirmed creates, updates, and deletions.

### Requirement 3: Create and Persist a Nurse

**User Story:** As an operator with an Expected_Operational_Role, I want to add a nurse through a visible form, so that the new record is committed to the configured backend and remains after refresh.

#### Acceptance Criteria

1. WHERE the user has an Expected_Operational_Role, THE Nurse_Management_System SHALL display a visible Add Nurse action in the nurse page header.
2. WHEN the user activates Add Nurse, THE Nurse_Management_System SHALL open a Blank_Create_Draft built without reading or copying Bundled_Sample_Nurses.
3. WHEN a Blank_Create_Draft is created, THE Nurse_Management_System SHALL generate exactly one Create_Draft_ID and retain the Create_Draft_ID for the lifetime of that Draft.
4. WHERE Supabase_Mode is active, WHEN a valid Draft is submitted by an Authenticated_User, THE Nurse_Repository SHALL create a Nurse_Row with the retained Create_Draft_ID and an Owner_ID equal to the Authenticated_User UUID.
5. WHILE a create request is pending, THE Nurse_Management_System SHALL preserve every Draft value and disable additional create submissions.
6. WHEN a create request succeeds, THE Nurse_Management_System SHALL add the returned committed Nurse with database-provided Version and timestamps to Server_Confirmed_State.
7. WHEN a create request succeeds, THE Nurse_Management_System SHALL close the create form and communicate successful creation.
8. IF a create request encounters a Recoverable_Failure, THEN THE Nurse_Management_System SHALL keep the create form open with unchanged Draft values and provide a manual Retry action.
9. WHEN a create Draft is retried after an ambiguous create outcome, THE Nurse_Repository SHALL read the retained Create_Draft_ID before issuing another insert.
10. WHEN collision verification finds the retained Create_Draft_ID with the same Owner_ID and equivalent Normalized_Business_Values, THE Nurse_Repository SHALL return the existing Nurse as the committed create result without issuing another insert.
11. IF collision verification finds the retained Create_Draft_ID with a different Owner_ID or different Normalized_Business_Values, THEN THE Nurse_Repository SHALL report an identifier collision and issue no insert during collision handling.
12. WHEN the user explicitly retries after a verified identifier collision, THE Nurse_Management_System SHALL assign one new `nurse-<UUID>` Create_Draft_ID to the unchanged Draft before issuing the create request.
13. WHERE Supabase_Mode is active, IF no Authenticated_User exists when a create is submitted, THEN THE Nurse_Management_System SHALL return an authentication error, preserve the Draft, and issue no create request.
14. WHEN a successfully created Nurse is followed by a successful refresh, THE Nurse_Management_System SHALL display exactly one Nurse with the committed Create_Draft_ID and committed values.

### Requirement 4: Map Nurse Models and Protect Metadata

**User Story:** As a developer, I want an explicit nurse data boundary, so that database rows and user-interface models remain compatible without exposing editable metadata.

#### Acceptance Criteria

1. WHERE Supabase_Mode is active, WHEN a Nurse_Row is decoded, THE Nurse_Codec SHALL map `id`, `owner_id`, `full_name`, `preferred_name`, `pipeline_stage`, `readiness_status`, `cohort_assigned`, `oet_status`, `final_score`, `tier`, `email`, `scorecard_fields`, `additional_certifications`, `communication_log`, `version`, `created_at`, and `updated_at` to `id`, `ownerId`, `fullName`, `preferredName`, `pipelineStage`, `readinessStatus`, `cohortAssigned`, `oetStatus`, `finalScore`, `tier`, `email`, `scorecardFields`, `additionalCertifications`, `communicationLog`, `version`, `createdAt`, and `updatedAt`, respectively.
2. WHERE Supabase_Mode is active, WHEN Nurse business fields are encoded, THE Nurse_Codec SHALL map `fullName`, `preferredName`, `pipelineStage`, `readinessStatus`, `cohortAssigned`, `oetStatus`, `finalScore`, `tier`, `email`, `scorecardFields`, `additionalCertifications`, and `communicationLog` to `full_name`, `preferred_name`, `pipeline_stage`, `readiness_status`, `cohort_assigned`, `oet_status`, `final_score`, `tier`, `email`, `scorecard_fields`, `additional_certifications`, and `communication_log`, respectively.
3. THE Nurse_Codec SHALL restrict Attributes_Object to `nextAction`, `flags`, `contactNumber`, `gender`, `ageGroup`, `province`, `city`, `registeredWithSANC`, `registeredNurseInSA`, `sancNumber`, `sancAPCExpiry`, `sancAPCStatus`, `highestQualification`, `qualificationInstitution`, `yearsOfClinicalExperience`, `primaryClinicalSpecialty`, `employmentStatus`, `currentEmployer`, `validPassport`, `passportExpiryDate`, `efSetScore`, `efSetLevel`, `englishPts`, `cvScore`, `shortlistDecision`, `agreementSigned`, `commitmentFeeStatus`, `source`, `motivations`, `questions`, `notesFlags`, `photoURL`, `submittedAt`, `nextActionDueDate`, and `lastContacted`.
4. WHEN `attributes` contains a key represented by a typed Nurse_Row column or Authoritative_Metadata, THE Nurse_Codec SHALL use the typed Nurse_Row column or Authoritative_Metadata value and ignore the conflicting attribute value.
5. WHEN documented nullable typed columns contain null, THE Nurse_Codec SHALL decode text fields to the documented empty string, `final_score` to null, and array or object fields to their validated documented defaults.
6. WHEN `final_score` or another supported numeric database value is a valid finite numeric string, THE Nurse_Codec SHALL decode the value to the equivalent finite number.
7. IF a Nurse_Row is not a plain object or has an invalid identifier, metadata type, Attributes_Object type, scorecard object, certification array, or communication array structure, THEN THE Nurse_Codec SHALL return a validation failure without returning a partial Nurse.
8. IF any row in a list response fails Nurse_Row validation, THEN THE Nurse_Repository SHALL reject the complete list response and leave Server_Confirmed_State unchanged.
9. IF a create or update Draft contains a field outside the typed fields in Requirement 4.1 and the Attributes_Object allowlist in Requirement 4.3, THEN THE Nurse_Codec SHALL return a validation error without issuing a write.
10. IF a create or update Draft attempts to set or change Authoritative_Metadata, THEN THE Nurse_Codec SHALL return a validation error without issuing a write or partially changing Server_Confirmed_State.
11. WHEN an update patch is encoded, THE Nurse_Codec SHALL exclude Authoritative_Metadata from the database change object and carry identifier and Base_Version only through the mutation contract.
12. WHEN a valid Nurse is encoded and then decoded, THE Nurse_Codec SHALL preserve every supported business field subject only to the documented null, empty-string, finite-number, array, and text normalization rules.
13. THE Nurse_Management_System SHALL present Authoritative_Metadata as read-only values outside editable Draft fields.

### Requirement 5: Load Detail and Manage Explicit Drafts

**User Story:** As an operator, I want detail editing to start from the current persisted record and use explicit Save and Cancel actions, so that stale snapshots and accidental autosaves do not overwrite data.

#### Acceptance Criteria

1. WHEN a user selects a Nurse from any list view, THE Nurse_Management_System SHALL store the selected Nurse identifier and request authoritative detail for that identifier.
2. WHILE the authoritative detail request is pending, THE Nurse_Management_System SHALL display detail loading state and disable editable controls and persistence actions.
3. WHEN the authoritative detail request succeeds for the currently selected Nurse identifier, THE Nurse_Management_System SHALL create Original_Base, an edit Draft, and Base_Version from the returned Nurse before enabling edits.
4. IF a detail response arrives for an identifier that is no longer selected or for an older request generation, THEN THE Nurse_Management_System SHALL ignore the response without changing the current detail context.
5. WHEN the user changes an editable detail field, THE Nurse_Management_System SHALL update only the edit Draft.
6. WHILE the user has not activated Save, THE Nurse_Management_System SHALL issue no update or Pipeline_Change write for edit Draft changes.
7. WHEN the user activates Cancel for a Draft equal to Original_Base, THE Nurse_Management_System SHALL close the detail edit session without a discard confirmation or write.
8. WHEN the user activates Cancel for a Draft different from Original_Base, THE Nurse_Management_System SHALL display a discard confirmation and keep the Draft unchanged until the user decides.
9. WHEN the user declines discard confirmation, THE Nurse_Management_System SHALL keep the detail edit session and Draft unchanged.
10. WHEN the user confirms discard, THE Nurse_Management_System SHALL discard the Draft and close the edit session without issuing a write.
11. IF authoritative detail returns not found for the currently selected Nurse, THEN THE Nurse_Management_System SHALL remove the stale list item, disable editing, close or replace the unusable detail view, and communicate that the Nurse no longer exists.
12. IF authoritative detail returns a Recoverable_Failure, THEN THE Nurse_Management_System SHALL keep the selected identifier and detail context open, keep editing disabled, and provide Retry and Close actions.
13. WHEN a detail retry is activated, THE Nurse_Management_System SHALL request the same selected identifier and enable editing only after a successful authoritative response.

### Requirement 6: Save Edits and Pipeline Changes with Optimistic Concurrency

**User Story:** As an operator, I want edits and pipeline movements to detect concurrent changes, so that newer work is not silently overwritten.

#### Acceptance Criteria

1. WHEN an edit Draft is submitted, THE Nurse_Repository SHALL require both a non-empty Nurse identifier and Base_Version before constructing the update.
2. WHEN a Pipeline_Change is submitted, THE Nurse_Repository SHALL require both a non-empty Nurse identifier and Base_Version before constructing the update.
3. IF an update or Pipeline_Change lacks a Nurse identifier or Base_Version, THEN THE Nurse_Repository SHALL return a validation error without issuing a write.
4. WHILE an edit mutation is pending, THE Nurse_Management_System SHALL preserve the Draft and disable additional Save submissions for that edit session.
5. WHILE a Pipeline_Change mutation is pending for a Nurse, THE Nurse_Management_System SHALL disable additional Pipeline_Change submissions for that Nurse.
6. WHEN a version-gated update succeeds, THE Nurse_Management_System SHALL replace the matching list and detail values with the returned committed Nurse.
7. WHEN a version-gated update succeeds, THE Nurse_Management_System SHALL use the returned greater Version as Base_Version and Original_Base for the next edit state.
8. IF a submitted Base_Version differs from the persisted Version, THEN THE Nurse_Repository SHALL perform no persisted field change and return Latest_Nurse.
9. IF an update returns a Conflict, THEN THE Nurse_Management_System SHALL preserve the Draft and leave Server_Confirmed_State at the last confirmed value.
10. WHEN an update Conflict is displayed, THE Nurse_Management_System SHALL present Latest_Nurse and actions to review field differences, apply local changes to Latest_Nurse, discard local changes, or keep editing.
11. WHEN the user applies local changes to Latest_Nurse, THE Nurse_Management_System SHALL identify locally changed fields by comparing the Draft with Original_Base and copy only those fields onto Latest_Nurse.
12. WHEN a field-level rebase completes, THE Nurse_Management_System SHALL retain Latest_Nurse values for fields unchanged from Original_Base, adopt Latest_Nurse Version as Base_Version, and issue no write.
13. WHEN a rebased Draft is ready, THE Nurse_Management_System SHALL require another explicit Save before issuing a version-gated update.
14. WHEN the user chooses to discard local changes after a Conflict, THE Nurse_Management_System SHALL require confirmation before replacing the Draft and Original_Base with Latest_Nurse.
15. WHEN the user confirms discard after a Conflict, THE Nurse_Management_System SHALL replace the Draft and Original_Base with Latest_Nurse and issue no write.
16. IF a Pipeline_Change fails or returns a Conflict, THEN THE Nurse_Management_System SHALL restore the exact pipeline stage and readiness status displayed before the attempted Pipeline_Change.
17. IF a Pipeline_Change returns a Conflict, THEN THE Nurse_Management_System SHALL present Latest_Nurse and require an explicit reload or rebase followed by a new Pipeline_Change action.
18. IF a version-gated update or Pipeline_Change targets an absent row, THEN THE Nurse_Management_System SHALL preserve any edit Draft, remove the stale list item, and communicate that the Nurse no longer exists.
19. IF an update or Pipeline_Change fails with authentication, permission, network, validation, or Unknown_Error, THEN THE Nurse_Management_System SHALL preserve the Draft and leave Server_Confirmed_State unchanged.
20. IF an update or Pipeline_Change fails, THEN THE Nurse_Management_System SHALL display the normalized failure category and offer manual Retry only for a Recoverable_Failure.
21. THE Nurse_Repository SHALL require explicit user action before retrying a failed or conflicting update or Pipeline_Change.

### Requirement 7: Confirm and Resolve Delete Outcomes

**User Story:** As an authorized operator, I want deletion to be confirmed and concurrency-safe, so that I can distinguish a completed delete from stale or already-removed data.

#### Acceptance Criteria

1. WHEN a user activates Delete from nurse detail, THE Nurse_Management_System SHALL display an accessible confirmation naming the Nurse and warning that related records may be affected by database rules.
2. WHEN the user cancels delete confirmation before a delete request starts, THE Nurse_Management_System SHALL close the confirmation and issue no delete request.
3. WHEN the user confirms deletion, THE Nurse_Repository SHALL require both the Nurse identifier and Base_Version before constructing the delete.
4. IF a delete lacks a Nurse identifier or Base_Version, THEN THE Nurse_Repository SHALL return a validation error without issuing the delete.
5. WHILE a delete request is pending, THE Nurse_Management_System SHALL retain the Nurse and detail context, display delete progress, and disable duplicate delete confirmation.
6. WHEN a delete returns a successful deleted result, THE Nurse_Management_System SHALL remove the Nurse from Server_Confirmed_State, close detail, close confirmation, and communicate “Nurse deleted.”
7. IF a delete returns a Conflict with Latest_Nurse, THEN THE Nurse_Management_System SHALL keep the Nurse and detail open and provide Reload Details and Cancel actions without offering an unconditional delete.
8. IF a delete returns Already_Deleted, THEN THE Nurse_Management_System SHALL remove the stale Nurse, close detail, close confirmation, and communicate “This nurse was already deleted.”
9. IF a delete fails because of a database validation, check, or foreign-key rule, THEN THE Nurse_Management_System SHALL keep detail open, leave Server_Confirmed_State unchanged, and display a safe database-rule failure without naming an unconfirmed relationship.
10. IF a delete fails with an authentication failure, THEN THE Nurse_Management_System SHALL keep detail open, leave Server_Confirmed_State unchanged, and require a valid session before another delete attempt.
11. IF a delete fails with a permission failure, THEN THE Nurse_Management_System SHALL keep detail open, leave Server_Confirmed_State unchanged, and omit Retry until permission state can be re-established.
12. IF a delete encounters a Recoverable_Failure, THEN THE Nurse_Management_System SHALL keep detail open, leave Server_Confirmed_State unchanged, and provide an explicit Retry action.
13. WHEN a user chooses to retry after a delete Conflict, THE Nurse_Management_System SHALL reload authoritative detail and close the stale confirmation before permitting another delete confirmation.
14. WHEN authoritative detail reload succeeds after a delete Conflict, THE Nurse_Management_System SHALL require a fresh delete confirmation using the newly read Version.
15. IF authoritative detail reload after a delete Conflict returns not found, THEN THE Nurse_Management_System SHALL resolve the outcome as Already_Deleted without issuing another delete.

### Requirement 8: Validate Inputs and Maintain Derived Fields

**User Story:** As an operator, I want invalid data caught before persistence and calculated fields kept consistent, so that nurse records remain usable.

#### Acceptance Criteria

1. WHEN a create or edit Draft is submitted, THE Nurse_Management_System SHALL normalize `fullName` with the current `sanitizeText` name-length behavior and require a resulting length from 1 through `MAX_LENGTHS.NAME` characters.
2. WHEN a non-empty email is submitted, THE Nurse_Management_System SHALL trim the email, require a length no greater than `MAX_LENGTHS.EMAIL`, and require `validateEmail` to return true.
3. WHEN `pipelineStage` is submitted, THE Nurse_Management_System SHALL require an exact member of `PIPELINE_STAGES`.
4. WHEN a nurse select field is submitted, THE Nurse_Management_System SHALL require an empty value or exact membership in the field's current option set: `nextAction` in `NEXT_ACTION_VALUES`; `gender` in `GENDERS`; `ageGroup` in `AGE_GROUPS`; `registeredWithSANC`, `registeredNurseInSA`, and `validPassport` in `YES_NO`; `sancAPCStatus` in `SANC_APC_STATUSES`; `highestQualification` in `QUALIFICATION_TYPES`; `yearsOfClinicalExperience` in `YEARS_EXPERIENCE`; `primaryClinicalSpecialty` in `SPECIALTIES`; `employmentStatus` in `EMPLOYMENT_STATUSES`; `efSetLevel` in `EFSET_LEVELS`; `oetStatus` in `OET_STATUSES`; `shortlistDecision` in `SHORTLIST_DECISIONS`; `commitmentFeeStatus` in `COMMITMENT_FEE_STATUSES`; and `source` in `SOURCE_OPTIONS`.
5. WHEN scorecard criteria are submitted, THE Nurse_Management_System SHALL require each of `hospitalExp`, `sancStatus`, `qualifications`, `specialisation`, `financialReadiness`, `motivation`, and `passport` to be a finite integer from 0 through 5.
6. WHEN `englishPts` is submitted, THE Nurse_Management_System SHALL require an empty value or a finite number from 0 through 3 inclusive.
7. WHEN `efSetScore` is submitted, THE Nurse_Management_System SHALL require an empty value or a finite number greater than or equal to 0.
8. WHEN a single-line text value is submitted, THE Nurse_Management_System SHALL remove C0 and DEL control characters, trim leading and trailing whitespace, and enforce the applicable `MAX_LENGTHS.NAME`, `MAX_LENGTHS.EMAIL`, or `MAX_LENGTHS.SHORT_TEXT` limit through current validation helpers.
9. WHEN a multiline text value is submitted, THE Nurse_Management_System SHALL normalize CRLF and CR to LF, preserve tab and LF, remove other C0 and DEL control characters, trim leading and trailing whitespace, and enforce `MAX_LENGTHS.LONG_TEXT` through `sanitizeText`.
10. WHEN `additionalCertifications` is submitted, THE Nurse_Management_System SHALL require an array of non-empty strings normalized as single-line text with each string no longer than `MAX_LENGTHS.SHORT_TEXT`.
11. WHEN a new communication entry is submitted, THE Nurse_Management_System SHALL require a non-empty normalized summary no longer than `MAX_LENGTHS.LONG_TEXT`, an optional normalized next action no longer than `MAX_LENGTHS.SHORT_TEXT`, and a channel from `Email`, `WhatsApp`, `Phone`, `LinkedIn`, or `In-person`.
12. IF Draft validation fails, THEN THE Nurse_Management_System SHALL issue no write, display inline field errors, focus the first invalid field, preserve the Draft, and leave Server_Confirmed_State unchanged.
13. WHEN `pipelineStage` changes in a valid Draft or Pipeline_Change, THE Nurse_Management_System SHALL set `readinessStatus` to the exact output of `calculateReadinessStatus` for the submitted stage before persistence.
14. WHEN `scorecardFields` or `englishPts` changes in a valid Draft, THE Nurse_Management_System SHALL set `cvScore` to the exact output of `calculateCVScore`, `finalScore` to the exact output of `calculateFinalScore`, and `tier` to the exact output of `calculateTier(finalScore)` before persistence.
15. THE Nurse_Management_System SHALL treat Existing_Calculation_Helpers as authoritative for readiness, CV score, final score, and tier instead of implementing alternate formulas or thresholds in the nurse workflow.

### Requirement 9: Enforce Authorization and Safe Error Handling

**User Story:** As a security-conscious operator, I want database authorization and categorized errors to remain authoritative, so that the interface cannot fabricate successful access or lose work after a failure.

#### Acceptance Criteria

1. WHERE Supabase_Mode is active, THE Nurse_Management_System SHALL issue every Supabase request through the public client with the active Session_Token so that RLS evaluates the request.
2. WHERE Supabase_Mode is active, THE Nurse_Management_System SHALL treat RLS as authoritative regardless of visible, hidden, enabled, or disabled frontend controls.
3. WHERE the current user lacks an Expected_Operational_Role, THE Nurse_Management_System SHALL hide or disable Add Nurse, Save, Pipeline_Change, and Delete controls without treating the frontend decision as authorization.
4. WHERE Supabase_Mode is active, IF no Supabase session exists before an operation, THEN THE Nurse_Management_System SHALL return an authentication failure without issuing the operation.
5. WHERE Supabase_Mode is active, IF Supabase reports an expired or invalid session, THEN THE Nurse_Management_System SHALL categorize the result as authentication failure and require sign-in before a manual retry.
6. WHERE Supabase_Mode is active, IF RLS or Supabase reports insufficient permission for a valid session, THEN THE Nurse_Management_System SHALL categorize the result as permission failure.
7. IF a nurse operation returns an authentication or permission failure, THEN THE Nurse_Management_System SHALL preserve the relevant Draft and leave Server_Confirmed_State unchanged.
8. WHERE Supabase_Mode is active, IF a nurse request exceeds Adapter_Timeout, THEN THE Nurse_Management_System SHALL categorize the result as a network failure using the adapter-configured timeout rather than a nurse-specific duration.
9. IF a nurse operation encounters a network failure or Unknown_Error, THEN THE Nurse_Management_System SHALL preserve the relevant Draft or prior Accepted_List and leave Server_Confirmed_State unchanged.
10. IF a nurse operation fails, THEN THE Nurse_Management_System SHALL perform no automatic retry and expose manual Retry only when the failure category permits another attempt.
11. WHEN a conflict or failure requires a user decision, THE Nurse_Management_System SHALL keep the decision state visible inline or in a dialog until the user resolves or closes the state.
12. THE Nurse_Management_System SHALL exclude nurse payloads, nurse names, email addresses, communication content, access tokens, raw database errors, and clinical data from telemetry.
13. THE Nurse_Management_System SHALL accept Server_Confirmed_State mutation only after the selected persistence adapter confirms the operation.

### Requirement 10: Preserve Legacy Mode

**User Story:** As an existing user, I want the feature flag rollback path to preserve current browser storage behavior, so that adopting Supabase does not regress the established local workflow.

#### Acceptance Criteria

1. WHERE Legacy_Mode is active, THE Data_Layer_Facade SHALL route every nurse list, detail, create, update, Pipeline_Change, delete, and refresh operation exclusively to the Storage_Adapter.
2. WHERE Legacy_Mode is active, THE Nurse_Management_System SHALL preserve the existing `initializeData`, `getNurses`, and `saveNurses` nurse initialization, retrieval, persistence, and refresh semantics.
3. WHERE Legacy_Mode is active, WHEN existing nurse initialization conditions call `seedNurses`, THE Nurse_Management_System SHALL preserve creation and display of the seven Bundled_Sample_Nurses without redefining the storage conditions that trigger the call.
4. WHERE Legacy_Mode is active, THE Nurse_Management_System SHALL preserve the existing camelCase Nurse representation without Supabase row conversion.
5. WHERE Legacy_Mode is active, WHEN a local nurse operation persists successfully, THE Storage_Adapter SHALL make the resulting camelCase nurse collection available to the next existing localStorage read and browser refresh.
6. WHERE Legacy_Mode is active, IF a nurse localStorage operation encounters a Storage_Failure, THEN THE Storage_Adapter SHALL return an explicit Storage_Failure and leave the last successfully persisted nurse collection unchanged.
7. WHERE Legacy_Mode is active, IF a nurse localStorage operation encounters a Storage_Failure, THEN THE Data_Layer_Facade SHALL invoke neither Supabase nor any Supabase fallback.
8. WHERE Supabase_Mode is active, THE Nurse_Management_System SHALL keep Supabase nurse data and Legacy_Mode nurse data independent during enablement, rollback, reads, writes, and refresh.
9. WHEN application loads use different persistence modes, THE Nurse_Management_System SHALL preserve each nurse store independently without copying, merging, or reconciling one store into the other.
