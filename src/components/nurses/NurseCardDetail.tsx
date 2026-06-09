"use client";

import { Badge } from "@/components/ui/badge";
import { Nurse } from "@/types/nurse";
import { cn } from "@/lib/utils";
import { StarRating } from "./StarRating";
import { CollapsibleSection } from "./CollapsibleSection";
import { FieldDisplay } from "./FieldDisplay";
import { NextActionDropdown } from "./NextActionDropdown";
import { getReadinessColor, calculateCvScore, calculateFinalScore, getTier, getTierColor } from "@/lib/nurse-utils";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "--";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getPipelineStageColor(stage: string): string {
  if (stage === "Placed") return "bg-green-100 text-green-700";
  if (stage === "Placement Ready") return "bg-emerald-100 text-emerald-700";
  if (stage === "Dropped Out") return "bg-red-100 text-red-700";
  if (stage === "Deferred") return "bg-yellow-100 text-yellow-700";
  if (stage === "Not Selected" || stage === "Didn't Qualify")
    return "bg-gray-100 text-gray-600";
  if (stage.includes("Shortlisted")) return "bg-blue-100 text-blue-700";
  if (stage.includes("OET")) return "bg-purple-100 text-purple-700";
  if (stage.includes("Cohort") || stage.includes("Training"))
    return "bg-propela-purple-light text-propela-purple";
  return "bg-gray-100 text-gray-700";
}

interface NurseCardDetailProps {
  nurse: Nurse;
}

export function NurseCardDetail({ nurse }: NurseCardDetailProps) {
  const cvScore = calculateCvScore(nurse);
  const finalScore = calculateFinalScore(nurse);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Column - Scrollable Sections */}
      <div className="flex-1 lg:w-2/3 space-y-4">
        {/* PERSONAL */}
        <CollapsibleSection title="Personal Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldDisplay
              label="Email"
              value={nurse.email}
              type="link"
              href={nurse.email ? `mailto:${nurse.email}` : undefined}
            />
            <FieldDisplay
              label="Contact Number"
              value={nurse.contactNumber}
              type="link"
              href={
                nurse.contactNumber
                  ? `tel:${nurse.contactNumber}`
                  : undefined
              }
            />
            <FieldDisplay label="Gender" value={nurse.gender} />
            <FieldDisplay label="Age Group" value={nurse.ageGroup} />
            <FieldDisplay label="Province / City" value={nurse.provinceCity} />
          </div>
        </CollapsibleSection>

        {/* PROFESSIONAL */}
        <CollapsibleSection title="Professional">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldDisplay
              label="SANC Registered"
              value={nurse.sancRegistered}
              type="boolean"
            />
            <FieldDisplay label="RN in SA" value={nurse.rnInSA} type="boolean" />
            <FieldDisplay label="SANC Number" value={nurse.sancNumber} />
            <FieldDisplay
              label="SANC APC Expiry"
              value={nurse.sancApcExpiry}
              type="date"
            />
            <FieldDisplay label="SANC APC Status" value={nurse.sancApcStatus} />
            <FieldDisplay
              label="Highest Qualification"
              value={nurse.highestQualification}
            />
            <FieldDisplay label="Institution" value={nurse.institution} />
            <FieldDisplay
              label="Years Experience"
              value={nurse.yearsExperience}
            />
            <FieldDisplay
              label="Primary Clinical Specialty"
              value={nurse.primaryClinicalSpecialty}
            />
            <FieldDisplay
              label="Additional Certifications"
              value={nurse.additionalCertifications}
            />
            <FieldDisplay
              label="Employment Status"
              value={nurse.employmentStatus}
            />
            <FieldDisplay
              label="Current Employer"
              value={nurse.currentEmployer}
            />
            <FieldDisplay
              label="Valid Passport"
              value={nurse.validPassport}
              type="boolean"
            />
            <FieldDisplay
              label="Passport Expiry"
              value={nurse.passportExpiry}
              type="date"
            />
          </div>
        </CollapsibleSection>

        {/* ENGLISH - EF SET */}
        <CollapsibleSection title="English (EF SET)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldDisplay
              label="Previously Taken Test"
              value={nurse.previouslyTakenTest}
              type="boolean"
            />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                EF SET Score
              </span>
              {nurse.efSetScore !== null ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-propela-purple rounded-full transition-all"
                      style={{ width: `${nurse.efSetScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {nurse.efSetScore}/100
                  </span>
                </div>
              ) : (
                <span className="text-gray-400">--</span>
              )}
            </div>
            <FieldDisplay label="EF SET Level" value={nurse.efSetLevel} />
            <FieldDisplay label="English Pts" value={nurse.englishPts} />
            <FieldDisplay
              label="Proficiency Level"
              value={nurse.proficiencyLevel}
              type="badge"
              badgeClassName="bg-propela-purple-light text-propela-purple border-0"
            />
          </div>
        </CollapsibleSection>

        {/* ENGLISH - OET */}
        <CollapsibleSection title="English (OET)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldDisplay label="OET Status" value={nurse.oetStatus} />
            <FieldDisplay
              label="Exam Date"
              value={nurse.oetExamDate}
              type="date"
            />
            <FieldDisplay label="Exam Centre" value={nurse.oetExamCentre} />
            <div className="sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                OET Scores
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-xs text-muted-foreground">Writing</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {nurse.oetWriting ?? "--"}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-xs text-muted-foreground">Speaking</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {nurse.oetSpeaking ?? "--"}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-xs text-muted-foreground">Listening</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {nurse.oetListening ?? "--"}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-xs text-muted-foreground">Reading</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {nurse.oetReading ?? "--"}
                  </div>
                </div>
              </div>
            </div>
            <FieldDisplay
              label="Overall Result"
              value={nurse.oetOverallResult}
              type="badge"
              badgeClassName={cn(
                "border-0",
                nurse.oetOverallResult === "B" ||
                  nurse.oetOverallResult === "Pass"
                  ? "bg-green-100 text-green-700"
                  : nurse.oetOverallResult === "Fail"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-600"
              )}
            />
            <FieldDisplay
              label="Retake Required"
              value={nurse.oetRetakeRequired}
              type="boolean"
            />
            <FieldDisplay
              label="Retake Components"
              value={nurse.oetRetakeComponents}
            />
          </div>
        </CollapsibleSection>

        {/* SELECTION */}
        <CollapsibleSection title="Selection">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldDisplay
              label="Shortlist Decision"
              value={nurse.shortlistDecision}
            />
            <FieldDisplay
              label="First Interview Date"
              value={nurse.firstInterviewDate}
              type="date"
            />
            <FieldDisplay
              label="Non-Selection Reason"
              value={nurse.nonSelectionReason}
            />
            <FieldDisplay
              label="Recommended Pathway"
              value={nurse.recommendedPathway}
            />
          </div>
        </CollapsibleSection>

        {/* COHORT */}
        <CollapsibleSection title="Cohort">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldDisplay
              label="Cohort Assigned"
              value={nurse.cohortAssigned}
            />
            <FieldDisplay
              label="Agreement Sent"
              value={nurse.agreementSent}
              type="boolean"
            />
            <FieldDisplay
              label="Agreement Sent Date"
              value={nurse.agreementSentDate}
              type="date"
            />
            <FieldDisplay
              label="Agreement Signed"
              value={nurse.agreementSigned}
              type="boolean"
            />
            <FieldDisplay
              label="Agreement Signed Date"
              value={nurse.agreementSignedDate}
              type="date"
            />
            <FieldDisplay
              label="Commitment Fee Status"
              value={nurse.commitmentFeeStatus}
            />
            <FieldDisplay
              label="Commitment Fee Date"
              value={nurse.commitmentFeeDate}
              type="date"
            />
          </div>
        </CollapsibleSection>

        {/* PLACEMENT */}
        <CollapsibleSection title="Placement">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldDisplay
              label="Placement Status"
              value={nurse.placementStatus}
            />
            <FieldDisplay
              label="Destination Country"
              value={nurse.destinationCountry}
            />
            <FieldDisplay label="Employer" value={nurse.employer} />
            <FieldDisplay
              label="Placement Date"
              value={nurse.placementDate}
              type="date"
            />
            <FieldDisplay
              label="Placement Fee Invoiced"
              value={nurse.placementFeeInvoiced}
              type="boolean"
            />
            <FieldDisplay
              label="Placement Fee Received"
              value={nurse.placementFeeReceived}
              type="boolean"
            />
          </div>
        </CollapsibleSection>

        {/* NOTES */}
        <CollapsibleSection title="Notes">
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Motivations
              </span>
              <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                {nurse.motivations || "--"}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Questions
              </span>
              <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                {nurse.questions || "--"}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Notes / Flags
              </span>
              <p
                className={cn(
                  "text-sm whitespace-pre-wrap rounded-lg p-3",
                  nurse.notesFlags
                    ? "bg-red-50 text-red-700"
                    : "bg-gray-50 text-gray-900"
                )}
              >
                {nurse.notesFlags || "--"}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldDisplay label="Source" value={nurse.source} />
              <FieldDisplay label="Source Record" value={nurse.sourceRecord} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Communication Log
              </span>
              <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                {nurse.communicationLog || "--"}
              </p>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* Right Column - Sticky Header + Scorecard */}
      <div className="lg:w-1/3">
        <div className="lg:sticky lg:top-6 space-y-4">
          {/* HEADER SECTION */}
          <div className="rounded-lg border border-gray-100 bg-white shadow-sm p-5">
            <div className="flex flex-col items-center text-center">
              {/* Profile Photo */}
              {nurse.profilePhoto ? (
                <div className="h-24 w-24 rounded-full overflow-hidden border-3 border-propela-purple-light">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={nurse.profilePhoto}
                    alt={nurse.fullName}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-propela-purple text-white text-2xl font-semibold">
                  {getInitials(nurse.fullName)}
                </div>
              )}

              {/* Name */}
              <h2 className="mt-3 text-2xl font-bold text-gray-900">
                {nurse.fullName}
              </h2>
              {nurse.preferredName && (
                <p className="text-sm text-muted-foreground">
                  &ldquo;{nurse.preferredName}&rdquo;
                </p>
              )}

              {/* Pipeline Stage Badge */}
              <Badge
                variant="secondary"
                className={cn(
                  "mt-3 border-0",
                  getPipelineStageColor(nurse.pipelineStage)
                )}
              >
                {nurse.pipelineStage}
              </Badge>

              {/* Next Action Dropdown */}
              <div className="mt-3 w-full">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Next Action
                </span>
                <NextActionDropdown
                  nurseId={nurse.id}
                  currentAction={nurse.nextAction}
                />
              </div>

              {/* Readiness Status */}
              <div className="mt-3">
                <Badge
                  variant="secondary"
                  className={cn(
                    "border-0",
                    getReadinessColor(nurse.readinessStatus)
                  )}
                >
                  {nurse.readinessStatus}
                </Badge>
              </div>

              {/* Flag Count */}
              {nurse.flagCount > 0 && (
                <div className="mt-2">
                  <Badge className="bg-red-500 text-white border-0 hover:bg-red-600">
                    {nurse.flagCount} {nurse.flagCount === 1 ? "Flag" : "Flags"}
                  </Badge>
                </div>
              )}

              {/* Meta Info */}
              <div className="mt-3 w-full space-y-1.5 text-left">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Last Contacted</span>
                  <span className="text-gray-900">
                    {formatDate(nurse.lastContacted)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Cohort</span>
                  <span className="text-gray-900">
                    {nurse.cohort || "--"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="text-gray-900">
                    {formatDate(nurse.submittedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SCORECARD SECTION */}
          <div className="rounded-lg border border-gray-100 bg-white shadow-sm p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Scorecard
            </h3>

            <div className="space-y-2">
              {/* Score Dimensions */}
              <ScorecardRow
                label="Hospital Exp"
                weight={3}
                score={nurse.hospitalExp}
              />
              <ScorecardRow
                label="SANC Status"
                weight={3}
                score={nurse.sancStatusScore}
              />
              <ScorecardRow
                label="English Proficiency"
                weight={2}
                score={nurse.englishProficiency}
              />
              <ScorecardRow
                label="Qualifications"
                weight={2}
                score={nurse.qualifications}
              />
              <ScorecardRow
                label="Specialisation"
                weight={1}
                score={nurse.specialisation}
              />
              <ScorecardRow
                label="Valid Passport"
                weight={1}
                score={nurse.validPassportScore}
              />
              <ScorecardRow
                label="Financial Readiness"
                weight={1}
                score={nurse.financialReadiness}
              />
              <ScorecardRow
                label="Motivation"
                weight={2}
                score={nurse.motivationScore}
              />

              {/* Separator */}
              <div className="border-t border-gray-100 my-3" />

              {/* CV Score */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  CV Score
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    {cvScore.toFixed(1)} / 5.0
                  </span>
                </div>
              </div>
              <div className="flex justify-end">
                <StarRating rating={cvScore} />
              </div>

              {/* Final Score */}
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-medium text-gray-700">
                  Final Score
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {finalScore.toFixed(1)} / 10.0
                </span>
              </div>

              {/* Tier */}
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-medium text-gray-700">Tier</span>
                <Badge
                  className={cn("border-0", getTierColor(finalScore))}
                >
                  {getTier(finalScore)}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScorecardRow({
  label,
  weight,
  score,
}: {
  label: string;
  weight: number;
  score: number;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">{label}</span>
        <Badge
          variant="secondary"
          className="h-5 px-1.5 text-[10px] bg-gray-100 text-gray-500 border-0"
        >
          x{weight}
        </Badge>
      </div>
      <span className="text-sm font-semibold text-gray-900">
        {score} / 10
      </span>
    </div>
  );
}
