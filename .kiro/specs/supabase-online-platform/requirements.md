# Requirements Document

## Introduction

Propela Ops is a nurse recruitment and placement management platform built as a React 19 + Vite single-page application. Today it has no backend: all of its data (across roughly 48 domains such as nurses, facilities, cohorts, placements, documents, communications, audit trail, automations, and help content) is persisted to browser `localStorage` through a storage abstraction layer (`src/lib/storage.js`) consumed by a single React context (`src/context/AppContext.jsx`).

This feature moves Propela Ops to an online, multi-user platform backed by Supabase. Supabase Postgres becomes the single authoritative source of truth for application data, replacing browser `localStorage` as the system of record. Supabase Auth provides real user logins and role-based access enforced by Postgres Row Level Security (RLS). The frontend is deployed on Vercel with environment-variable-driven configuration and automatic deployment on push.

A central goal, in the user's words, is that "everything still works fine" regardless of how data changes: through the application UI, through bulk/mass updates, or through manual edits made directly in the Supabase database. No stale client-side copy may override the authoritative data. The existing storage abstraction (`src/lib/storage.js`) is the intended integration seam so that pages and the application context can adopt the cloud data layer without a full rewrite.

This document defines the requirements for that migration. It focuses on WHAT the system must do; technical design decisions are deferred to the design phase.

## Glossary

- **Propela_Ops**: The nurse recruitment and placement management web application being migrated online.
- **Frontend**: The React single-page application served to the browser, deployed on Vercel.
- **Data_Layer**: The client-side data-access module that replaces or augments the existing `src/lib/storage.js`, reading from and writing to Supabase instead of browser `localStorage`.
- **Supabase**: The managed backend platform providing the Postgres database, authentication, and file storage.
- **Database**: The Supabase-hosted Postgres database that serves as the authoritative store of application data.
- **Source_Of_Truth**: The authoritative record of a data value; after this feature, the Source_Of_Truth is the Database.
- **Auth_Service**: Supabase Authentication, which manages user identities, credentials, and sessions.
- **Session**: An authenticated user session issued by the Auth_Service, represented by an access token.
- **RLS**: Row Level Security, the Postgres mechanism that restricts row access based on the authenticated user and role.
- **Role**: A named authorization level assigned to a user. Defined roles are `Recruiter` and `Admin`.
- **Recruiter**: A Role granted access to operational recruitment data required to perform placements.
- **Admin**: A Role granted full access, including configuration, user management, and integration data.
- **Data_Domain**: One logical collection of records (for example nurses, facilities, placements) corresponding to a table or set of tables in the Database.
- **Mass_Update**: A change that creates, modifies, or deletes many records at once, whether performed through the Frontend or directly against the Database.
- **Manual_Edit**: A change made directly in the Database (for example through the Supabase table editor or SQL) outside the Frontend.
- **Anon_Key**: The Supabase public anonymous API key, safe to embed in the Frontend and constrained by RLS.
- **Service_Role_Key**: The Supabase privileged key that bypasses RLS; a secret that MUST NOT be exposed to the Frontend.
- **Config_Value**: An environment-variable-driven configuration value (for example the Supabase URL or Anon_Key).
- **Vercel**: The hosting platform for the Frontend, providing CI/CD and environment management.
- **Migration_Process**: The one-time process that transforms and loads existing data model content into the relational Database schema.
- **Optimistic_Update**: A Frontend state change applied before the Database confirms the write.
- **Record**: A single row of a Data_Domain in the Database, identified by a unique primary key.

## Requirements

### Requirement 1: Cloud Persistence as Source of Truth

**User Story:** As an operations user, I want all application data stored in Supabase Postgres, so that my data is durable, shared across devices and users, and not confined to a single browser.

#### Acceptance Criteria

1. THE Data_Layer SHALL read all Data_Domain records from the Database.
2. THE Data_Layer SHALL write all Data_Domain create, update, and delete operations to the Database.
3. THE Database SHALL be the Source_Of_Truth for all Data_Domain records.
4. WHEN a user completes a create, update, or delete action in the Frontend, THE Data_Layer SHALL persist the change to the Database and receive a success acknowledgement from the Database within 10 seconds before treating the change as committed.
5. IF a write to the Database fails or no success acknowledgement is received within 10 seconds, THEN THE Frontend SHALL display an error message indicating the change was not saved, SHALL retain the Database record in its prior unmodified state, and SHALL preserve the user's unsaved input so it remains available for resubmission.
6. IF a read from the Database fails or no response is received within 10 seconds, THEN THE Frontend SHALL display an error message indicating the data could not be loaded and SHALL NOT display stale browser `localStorage` records as authoritative Data_Domain records.
7. THE Frontend SHALL treat browser `localStorage` as a non-authoritative cache only, and SHALL NOT use browser `localStorage` as the Source_Of_Truth for Data_Domain records.

### Requirement 2: Consistency Across Update Paths

**User Story:** As an operations user, I want the platform to stay correct whether data changes through the UI, a mass update, or a manual database edit, so that I can trust what I see regardless of how the data was changed.

#### Acceptance Criteria

1. WHEN the Frontend loads a Data_Domain, THE Data_Layer SHALL retrieve the current committed values from the Database rather than from a previously cached browser copy.
2. WHEN a Manual_Edit commits a change to a Record in the Database, THE Frontend SHALL display the changed value on the first subsequent load or refresh of the affected Data_Domain that occurs after the change is committed.
3. WHEN a Mass_Update commits changes to multiple Records in the Database, THE Frontend SHALL display all committed changed values on the first subsequent load or refresh of the affected Data_Domain that occurs after the Mass_Update completes, with no changed Record omitted.
4. THE Data_Layer SHALL NOT overwrite a Database Record with a client-side value that was read before an intervening committed Database change to that Record.
5. IF a user submits an update to a Record whose committed Database state has changed since the user last read that Record, THEN THE Data_Layer SHALL reject the submitted update, SHALL leave the newer Database value unchanged, and SHALL return a conflict indication to the Frontend.
6. WHEN the Data_Layer returns a conflict indication for a submitted update, THE Frontend SHALL notify the user that the Record changed since it was last read, SHALL display the current committed Database value of the Record, and SHALL retain the user's unsaved input rather than discarding it.

### Requirement 3: Authentication

**User Story:** As an organization administrator, I want users to log in with real credentials, so that only authorized people can access recruitment data.

#### Acceptance Criteria

1. WHEN an unauthenticated user requests any application data view, THE Frontend SHALL redirect the user to a login screen within 2 seconds.
2. WHEN a user submits credentials that match a registered account, THE Auth_Service SHALL establish a Session within 5 seconds.
3. WHEN the Auth_Service establishes a Session for a user, THE Frontend SHALL grant the user access to the views authorized for that account.
4. IF a user submits credentials that do not match any registered account, THEN THE Frontend SHALL deny access and SHALL display an authentication error message indicating that the credentials are invalid, without disclosing whether the username or the password was incorrect.
5. IF a user submits a login form in which the username field or the password field is empty, THEN THE Frontend SHALL reject the submission and SHALL display an error message indicating that the required fields must be completed.
6. IF the Auth_Service does not return a response within 5 seconds or is unavailable when a user submits credentials, THEN THE Frontend SHALL deny access, SHALL display an error message indicating that authentication is temporarily unavailable, and SHALL preserve the entered username.
7. WHILE a Session is active, THE Data_Layer SHALL include the Session access token with every Database request.
8. WHEN a user selects logout, THE Frontend SHALL end the Session and SHALL remove all Session tokens from the browser within 2 seconds.
9. WHEN a Session access token has reached its 60-minute expiration limit, THE Frontend SHALL require the user to authenticate again before performing any further Database operations.

### Requirement 4: Role-Based Authorization

**User Story:** As an organization administrator, I want access controlled by user role, so that recruiters and admins see and change only what their role permits.

#### Acceptance Criteria

1. WHEN a user account is created, THE Auth_Service SHALL associate the user with exactly one Role from the set {Recruiter, Admin}.
2. WHEN a Data_Domain request is submitted, THE Database SHALL enforce RLS policies so that the request returns only Records the authenticated user's Role is permitted to access.
3. WHERE a user holds the Recruiter Role, THE Database SHALL deny all read and write operations on the configuration, user management, and integration Data_Domains.
4. WHERE a user holds the Admin Role, THE Database SHALL grant read and write access to all Data_Domains.
5. IF a user attempts an operation not permitted by the user's Role, THEN THE Database SHALL reject the operation without modifying any Records, and THE Frontend SHALL display within 2 seconds an authorization error indicating that access was denied due to insufficient Role permissions.
6. THE Database SHALL apply RLS enforcement to requests authenticated with the Anon_Key regardless of whether the request originates from the Frontend.
7. IF an authenticated user has no Role associated, THEN THE Database SHALL deny all Data_Domain requests and THE Frontend SHALL display an authorization error.

### Requirement 5: Data Model Migration

**User Story:** As an operations user, I want my existing data model migrated into relational tables, so that current information is available in the online platform without manual re-entry.

#### Acceptance Criteria

1. THE Database SHALL define a relational schema that includes a table for each Data_Domain currently persisted by the storage abstraction, with each persisted attribute of the Data_Domain represented as a column.
2. WHEN the Migration_Process runs, THE Migration_Process SHALL load 100% of the existing seed and sample Records from each Data_Domain into the corresponding Database table.
3. WHEN the Migration_Process loads a Record, THE Migration_Process SHALL preserve the Record's unique identifier so that references between Data_Domains remain valid.
4. THE Database SHALL enforce referential integrity for defined relationships between Data_Domains.
5. IF the Migration_Process encounters a Record that violates a schema constraint, THEN THE Migration_Process SHALL roll back every Record belonging to the same related set so that no partial or inconsistent set remains persisted, and SHALL produce an error indication identifying the failing Record and the violated constraint.
6. WHEN the Migration_Process completes, THE Migration_Process SHALL report, for each Data_Domain, the count of Records successfully loaded and the count of Records that failed to load.
7. IF the count of Records loaded for a Data_Domain does not equal the count of source Records for that Data_Domain, THEN THE Migration_Process SHALL report the mismatch per Data_Domain and SHALL mark the migration as failed.
8. WHEN the Migration_Process is executed more than once against the same Database, THE Migration_Process SHALL NOT create duplicate Records for any Data_Domain.

### Requirement 6: Data-Access Layer Replacement

**User Story:** As a developer, I want a clean data-access layer that replaces the localStorage storage module, so that existing pages continue to work against Supabase without a full rewrite.

#### Acceptance Criteria

1. THE Data_Layer SHALL expose at least one data-retrieval operation and at least one data-persistence operation for every Data_Domain currently served by `src/lib/storage.js`.
2. WHEN a page or the application context calls a Data_Layer retrieval operation, THE Data_Layer SHALL return the matching Data_Domain Records from the Database within 5 seconds.
3. WHEN a Data_Layer retrieval operation finds no matching Records, THE Data_Layer SHALL return an empty collection rather than null or an error.
4. WHEN a page or the application context calls a Data_Layer persistence operation with Records that satisfy Data_Domain validation, THE Data_Layer SHALL persist the provided Records to the Database within 5 seconds.
5. IF a Data_Layer persistence operation receives Records that fail Data_Domain validation, THEN THE Data_Layer SHALL reject the operation, return an error to the caller indicating the validation failure, and leave the Database unchanged.
6. WHILE a Data_Layer asynchronous operation is in progress, THE Data_Layer SHALL expose a loading state value of true to the caller and set it to false upon completion or failure.
7. IF a Data_Layer Database operation fails, THEN THE Data_Layer SHALL return an error to the caller indicating the failure cause and expose an error state to the caller rather than discarding the error.

### Requirement 7: Secrets and Configuration Management

**User Story:** As a developer, I want configuration driven by environment variables with secrets kept out of the frontend, so that credentials are never exposed and environments are easy to manage.

#### Acceptance Criteria

1. WHEN the Frontend initializes at startup, THE Frontend SHALL read the Supabase URL and Anon_Key from environment variables prefixed with `VITE_`.
2. THE Frontend SHALL NOT include the Service_Role_Key or the Database password in any client-side bundle or any runtime-accessible client variable.
3. IF one or more required Config_Values (the Supabase URL and Anon_Key) are missing or empty at startup, THEN THE Frontend SHALL display within 2 seconds of initialization a configuration error identifying each missing Config_Value by name, SHALL NOT render the main application, and SHALL NOT attempt any Database operations.
4. THE system SHALL provide a documented `.env.example` file listing every required Config_Value name (including the Supabase URL and Anon_Key) with placeholder text and no actual secret values.
5. WHERE the environment is local development, THE Frontend SHALL load Config_Values from a local `.env` file that is excluded from version control.
6. WHERE the environment is production, THE Frontend SHALL load Config_Values from Vercel environment settings.

### Requirement 8: Deployment on Vercel

**User Story:** As a developer, I want the frontend hosted on Vercel with automatic deployment, so that updates go live reliably over HTTPS without manual steps.

#### Acceptance Criteria

1. THE Frontend SHALL build and deploy on Vercel from the project's Git repository.
2. WHEN a commit is pushed to the production branch, THE Vercel pipeline SHALL build and deploy the Frontend automatically within 15 minutes.
3. IF a Vercel build does not complete within 20 minutes or returns a build error, THEN THE Vercel pipeline SHALL classify the build as failed.
4. IF a Vercel build fails, THEN THE Vercel pipeline SHALL retain the previously deployed version as the live version.
5. WHEN a Vercel build fails, THE Vercel pipeline SHALL record the failure in the deployment history.
6. THE Vercel deployment SHALL serve the Frontend over HTTPS.
7. WHEN a client requests the Frontend over HTTP, THE Vercel deployment SHALL redirect the request to HTTPS.
8. WHEN a client requests a client-side route path, THE Vercel deployment SHALL resolve the request to the application entry point, except for requests for static assets.
9. WHERE environment-specific Config_Values are set in Vercel, THE Vercel pipeline SHALL apply those Config_Values to the build for the corresponding deployment.
10. IF a required Config_Value is missing at build time, THEN THE Vercel pipeline SHALL fail the build and SHALL retain the previously deployed version.

### Requirement 9: Phased Rollout and Offline Behavior

**User Story:** As an operations user, I want a safe transition to the online platform with clear behavior when connectivity is lost, so that I understand the system state and avoid data loss.

#### Acceptance Criteria

1. WHERE a migration feature flag is disabled, THE Frontend SHALL route all read and write operations to the existing storage abstraction and SHALL NOT issue any requests to the Data_Layer.
2. WHERE the migration feature flag is enabled, THE Frontend SHALL route all read and write operations to the Data_Layer backed by the Database and SHALL NOT issue any requests to the existing storage abstraction.
3. IF the Database does not return a read response within 10 seconds, or returns a connection failure, THEN THE Frontend SHALL classify the Database as unreachable, SHALL display an error message indicating that connectivity to the Database was lost, and SHALL visually mark any displayed data as potentially stale.
4. IF the Database does not acknowledge a write within 10 seconds, or returns a connection failure, THEN THE Frontend SHALL classify the write as failed, SHALL NOT indicate that the data was saved, SHALL retain the unsaved input values in the form without clearing them, and SHALL display an error message indicating the write did not complete.
5. WHILE a write is in the failed state, THE Frontend SHALL display a retry control to the user.
6. WHEN the user activates the retry control and the Database acknowledges the write within 10 seconds, THE Frontend SHALL indicate that the data was saved and SHALL clear the failed state.

### Requirement 10: Security and Data Protection (Non-Functional)

**User Story:** As an organization administrator, I want data protected in transit and access tightly controlled, so that sensitive recruitment information stays confidential.

#### Acceptance Criteria

1. THE Data_Layer SHALL communicate with the Database exclusively over HTTPS.
2. IF the Data_Layer cannot establish an HTTPS connection to the Database, THEN THE Data_Layer SHALL reject the request without transmitting any Data_Domain Records and SHALL return an error indication that a secure connection could not be established.
3. THE Database SHALL enable RLS on every table containing Data_Domain Records.
4. IF a table containing Data_Domain Records has no applicable RLS policy for a request, THEN THE Database SHALL deny access to that table by default and SHALL return zero Data_Domain Records for that request.
5. THE system SHALL exclude all secret Config_Values from version control.
6. THE system SHALL exclude all secret Config_Values from client-delivered bundles.
7. WHEN the Auth_Service stores user credentials, THE Auth_Service SHALL store them using the Auth_Service's managed credential storage rather than in application Data_Domain tables.

### Requirement 11: Data Integrity Correctness (Non-Functional)

**User Story:** As an operations user, I want writes and reads to remain consistent and free of lost updates, so that the platform's data can be trusted for placement decisions.

#### Acceptance Criteria

1. WHEN the Data_Layer writes a Record value and subsequently reads the same Record with no intervening write, THE Data_Layer SHALL return a value byte-for-byte equal across all fields to the value written (write-then-read consistency).
2. WHEN two updates target the same Record, THE Database SHALL commit a final value equal to one of the submitted updates and SHALL NOT commit a value reflecting neither update (no lost updates).
3. IF a submitted update would overwrite a Record whose committed state changed after the update's base value was read, THEN THE Database SHALL detect the conflict, reject the update, and leave the committed value unchanged.
4. WHEN the same idempotent update is applied to a Record two or more times with no intervening change, THE Database SHALL leave the Record in a byte-for-byte equal final state to applying the update once (idempotence).
5. WHEN a Mass_Update completes, THE Data_Layer SHALL return, on a subsequent read, either all post-update values or none of them, with no mix of pre-update and post-update values for that operation (atomic visibility).
6. IF a Mass_Update fails before completion, THEN THE Database SHALL leave no partially applied values from that Mass_Update (rollback on failure).
7. THE Migration_Process SHALL preserve the record count per Data_Domain such that the source and migrated counts are equal, each source Record maps to exactly one migrated Record with distinct identity, with zero duplicates and zero omissions (round-trip preservation of identity).

### Requirement 12: Performance for List-Heavy Views (Non-Functional)

**User Story:** As a recruiter, I want list pages to load quickly even with many records, so that I can work efficiently across large data sets.

#### Acceptance Criteria

1. WHEN the Frontend requests a list Data_Domain, THE Data_Layer SHALL retrieve Records in pages with a default size of 25 Records and a maximum size of 100 Records rather than requiring all Records in a single response.
2. WHILE a list retrieval has been in progress for longer than 300 milliseconds, THE Frontend SHALL display a loading indicator for the affected view.
3. WHEN a user applies a filter or search to a list Data_Domain, THE Data_Layer SHALL request only the filtered Records from the Database rather than filtering a full client-side copy of all Records.
4. WHERE a Data_Domain is queried by a common filter field, THE Database SHALL define an index supporting that filter.
5. WHEN the Frontend requests a page of a list Data_Domain over datasets of up to 100,000 Records, THE Data_Layer SHALL return the requested page within 2000 milliseconds for at least 95% of such requests.
6. IF a list retrieval fails or does not respond within 10 seconds, THEN THE Frontend SHALL remove the loading indicator, display an error message, and preserve the previously displayed Records.
