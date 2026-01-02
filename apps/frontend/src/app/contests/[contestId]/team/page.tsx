"use client";

import { useEffect, useState } from "react";
import { formatPoints } from "@/lib/utils";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LS_KEYS, ROUTES } from "@/common/consts";
import {
  PlayerCard,
  StepCard,
  ProgressIndicator,
  Button,
  Badge,
  Card,
  Avatar,
  CaptainSelectionCard,
} from "@/components";
import type { Player } from "@/components";
import {
  createTeam,
  getUserTeams,
  getTeam,
  updateTeam,
  type TeamResponse,
} from "@/lib/api/teams";
import {
  publicContestsApi,
  type EnrollmentResponse,
} from "@/lib/api/public/contests";
import { useTeamBuilderV2 } from "@/hooks/useTeamBuilderV2";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { LoadingScreen } from "./molecules/LoadingScreen";
import { EnrollmentBanner } from "./molecules/EnrollmentBanner";
import { TeamCard } from "./components/TeamCard";

export default function ContestTeamBuilderPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const contestId = Array.isArray((params as any)?.contestId)
    ? (params as any).contestId[0]
    : (params as any)?.contestId;

  // Enrolled contest
  const [enrolledHere, setEnrolledHere] = useState<boolean>(false);
  const [loadingEnrollment, setLoadingEnrollment] = useState(false);
  const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);

  // Existing team
  const [existingTeam, setExistingTeam] = useState<TeamResponse | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Enrollment gating state
  const [hasCheckedEnrollment, setHasCheckedEnrollment] = useState(false);

  const {
    // data
    players,
    loading,
    error,

    // selection state
    selectedMen,
    selectedWomen,
    allSelectedPlayers,
    captainId,
    viceCaptainId,
    currentStep,
    activeGender,

    // derived
    playersGroupedByTeam,
    menTeamCounts,
    womenTeamCounts,
    canProceedToStep2,
    LIMITS,

    // handlers
    setCurrentStep,
    setActiveGender,
    handleClearAll,
    handlePlayerSelect,
    handleSetCaptain,
    handleSetViceCaptain,
  } = useTeamBuilderV2(typeof contestId === "string" ? contestId : undefined, {
    enabled: hasCheckedEnrollment && !(enrolledHere || !!existingTeam),
  });

  // Team submission states
  const [submitting, setSubmitting] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState<string | undefined>(undefined);
  const showAlert = (message: string, title?: string) => {
    setAlertMessage(message);
    setAlertTitle(title);
    setAlertOpen(true);
  };

  const [selectedContestId, setSelectedContestId] = useState<string>("");

  useEffect(() => {
    if (!contestId) return;
    setSelectedContestId(contestId);
  }, [contestId]);

  // Auth protection
  useEffect(() => {
    if (isAuthenticated === false && contestId) {
      router.push(
        `${ROUTES.LOGIN}?next=${encodeURIComponent(`/contests/${contestId}/team`)}`
      );
    }
  }, [isAuthenticated, contestId, router]);

  // Detect if already enrolled
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!contestId) return;
      try {
        setLoadingEnrollment(true);
        const mine = await publicContestsApi.myEnrollments();
        if (!mounted) return;
        const e = Array.isArray(mine)
          ? mine.find(
            (x) => x.contest_id === contestId && x.status === "active"
          )
          : undefined;
        setEnrollment(e || null);
        const token = localStorage.getItem(LS_KEYS.ACCESS_TOKEN);
        let team: TeamResponse | null = null;
        if (e?.team_id && token) {
          try {
            setLoadingTeam(true);
            team = await getTeam(e.team_id, token);
          } catch {
            team = null;
          } finally {
            if (mounted) setLoadingTeam(false);
          }
        } else if (token) {
          try {
            setLoadingTeam(true);
            const list = await getUserTeams(token);
            team = list.teams.find((t) => t.contest_id === contestId) || null;
          } finally {
            if (mounted) setLoadingTeam(false);
          }
        }
        if (mounted) {
          setExistingTeam(team);
          setEnrolledHere(!!(e && team));
        }
      } catch {
        // ignore
      } finally {
        if (mounted) {
          setLoadingEnrollment(false);
          setHasCheckedEnrollment(true);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [contestId]);

  useEffect(() => {
    if (!existingTeam) return;
    setEditMode(false);
    setTeamName(existingTeam.team_name || "");
  }, [existingTeam]);

  const pageLoading =
    !hasCheckedEnrollment ||
    loadingEnrollment ||
    (enrolledHere && loadingTeam) ||
    (hasCheckedEnrollment && !(enrolledHere || !!existingTeam) && loading);

  if (pageLoading) {
    return <LoadingScreen />;
  }

  const handleSubmitTeam = async () => {
    if (!isAuthenticated) return;
    if (!teamName.trim()) {
      setShowNameDialog(true);
      return;
    }
    if (!captainId) {
      showAlert("Please select a captain", "Validation");
      return;
    }
    if (!viceCaptainId) {
      showAlert("Please select a vice-captain", "Validation");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem(LS_KEYS.ACCESS_TOKEN);
      if (!token) {
        throw new Error("Not authenticated");
      }

      const teamData = {
        team_name: teamName,
        player_ids: allSelectedPlayers,
        captain_id: captainId,
        vice_captain_id: viceCaptainId,
        contest_id: selectedContestId || undefined,
      };
      const gotoTeams = () => {
        const qs = selectedContestId
          ? `?contest_id=${encodeURIComponent(String(selectedContestId))}`
          : "";
        router.push(`/teams${qs}`);
      };

      if (editMode && existingTeam) {
        await updateTeam(existingTeam.id, teamData, token);
        gotoTeams();
      } else {
        const created = await createTeam(teamData, token);
        if (selectedContestId) {
          try {
            await publicContestsApi.enroll(selectedContestId, created.id);
          } catch (e: any) {
            showAlert(
              e?.response?.data?.detail ||
              e?.message ||
              "Failed to enroll in contest",
              "Enrollment failed"
            );
          }
        }
        gotoTeams();
      }
    } catch (err: any) {
      console.error("Failed to submit team:", err);
      showAlert(err.message || "Failed to submit team", "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const showViewOnly = !!existingTeam;

  const selectedPlayerObjs = players.filter((p) =>
    allSelectedPlayers.includes(p.id)
  ) as unknown as Player[];

  const currentTeamCounts = activeGender === "male" ? menTeamCounts : womenTeamCounts;
  const currentSelected = activeGender === "male" ? selectedMen : selectedWomen;

  return (
    <div className="min-h-screen bg-bg-body text-text-main">
      <AlertDialog
        open={alertOpen}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertOpen(false)}
      />

      {/* Team name dialog */}
      {showNameDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowNameDialog(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-bg-elevated shadow-xl border border-border-subtle">
            <div className="p-5 sm:p-6">
              <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-brand text-white text-xs font-semibold shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                Required
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-text-main">
                Please enter a team name
              </h3>
              <p className="mt-2 text-sm text-text-muted">
                You need a name to create and enroll your team.
              </p>

              <div className="mt-4">
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g., Golden Strikers"
                  className="w-full rounded-xl border border-border-subtle bg-bg-card px-4 py-2.5 text-text-main placeholder:text-text-muted focus:outline-none focus:ring-4 focus:ring-accent-pink-soft/30 focus:border-accent-pink-soft"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNameDialog(false)}
                  className="px-4 py-2 rounded-full text-sm font-medium text-text-main hover:bg-bg-elevated border border-border-subtle"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (teamName.trim()) {
                      setShowNameDialog(false);
                    }
                  }}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-brand shadow hover:shadow-pink-soft"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {enrolledHere && <EnrollmentBanner />}

      {/* Fixed Selected Players Bar */}
      {!showViewOnly && (
        <div className="sticky top-20 z-40 px-2 sm:px-4 py-2 sm:py-4">
          <div className="max-w-7xl mx-auto">
            <div className="bg-bg-card/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-border-subtle p-2 sm:p-3 md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h5 className="font-bold text-text-main text-sm sm:text-base">
                    Selected
                  </h5>
                  <Badge variant="primary" size="sm">
                    Men: {selectedMen.length}/{LIMITS.menPlayers}
                  </Badge>
                  <Badge variant="secondary" size="sm">
                    Women: {selectedWomen.length}/{LIMITS.womenPlayers}
                  </Badge>
                </div>
                <div className="text-xs sm:text-sm font-semibold text-text-main">
                  Total: {allSelectedPlayers.length}/{LIMITS.totalPlayers}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="container-responsive py-3 sm:py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
          {showViewOnly ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                You have already created a team for this contest.
              </p>
              <Button
                variant="primary"
                onClick={() =>
                  router.push(
                    `/teams?contest_id=${encodeURIComponent(String(contestId || ""))}`
                  )
                }
              >
                View Your Team
              </Button>
            </div>
          ) : (
            <>
              {/* Progress */}
              <div className="max-w-3xl mx-auto mb-4 sm:mb-8">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 mr-2">
                    <ProgressIndicator
                      currentStep={currentStep === 1 ? 0 : currentStep - 1}
                      totalSteps={3}
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleClearAll}
                    className="flex-shrink-0 text-xs sm:text-sm px-2.5 sm:px-4"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Step 1: Player Selection */}
              <StepCard
                stepNumber={1}
                title="Select Players"
                description={`Select ${LIMITS.menPlayers} men and ${LIMITS.womenPlayers} women (max ${LIMITS.maxPerTeam} per team)`}
                isActive={currentStep === 1}
                isCompleted={currentStep > 1}
              >
                {currentStep === 1 ? (
                  <div className="space-y-4">
                    {/* Gender Tabs */}
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant={activeGender === "male" ? "primary" : "ghost"}
                        onClick={() => setActiveGender("male")}
                        className="flex-1 sm:flex-none"
                      >
                        Men ({selectedMen.length}/{LIMITS.menPlayers})
                      </Button>
                      <Button
                        variant={activeGender === "female" ? "primary" : "ghost"}
                        onClick={() => setActiveGender("female")}
                        className="flex-1 sm:flex-none"
                      >
                        Women ({selectedWomen.length}/{LIMITS.womenPlayers})
                      </Button>
                    </div>

                    {loading ? (
                      <div className="text-center text-gray-500 py-6">
                        Loading players...
                      </div>
                    ) : error ? (
                      <div className="text-center text-red-600 py-6">
                        {error}
                      </div>
                    ) : (
                      <>
                        {/* Team Grid (n × 3) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                          {playersGroupedByTeam.map((team) => (
                            <TeamCard
                              key={team.name}
                              teamName={team.name}
                              players={team.players as unknown as Player[]}
                              selectedPlayerIds={currentSelected}
                              onPlayerSelect={handlePlayerSelect}
                              teamSelectionCount={currentTeamCounts[team.name] || 0}
                              maxPerTeam={LIMITS.maxPerTeam}
                            />
                          ))}
                        </div>

                        <div className="flex justify-center mt-6">
                          <Button
                            variant="primary"
                            onClick={() => setCurrentStep(2)}
                            disabled={!canProceedToStep2}
                          >
                            Continue to Captain Selection
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Player selection complete
                  </div>
                )}
              </StepCard>

              {/* Step 2: Captain Selection */}
              <StepCard
                stepNumber={2}
                title="Choose Captain & Vice-Captain"
                description="Select captain (2x points) and vice-captain (1.5x points)"
                isActive={currentStep === 2}
                isCompleted={currentStep > 2}
              >
                {currentStep === 2 ? (
                  <div className="space-y-4">
                    {selectedPlayerObjs.length > 0 ? (
                      <>
                        {/* Mobile: Compact Cards */}
                        <div className="md:hidden space-y-2">
                          {selectedPlayerObjs.map((player: Player) => (
                            <CaptainSelectionCard
                              key={player.id}
                              player={player}
                              isCaptain={player.id === captainId}
                              isViceCaptain={player.id === viceCaptainId}
                              onSetCaptain={handleSetCaptain}
                              onSetViceCaptain={handleSetViceCaptain}
                            />
                          ))}
                        </div>

                        {/* Desktop: Regular Cards */}
                        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {selectedPlayerObjs.map((player: Player) => (
                            <PlayerCard
                              key={player.id}
                              player={player}
                              isSelected={true}
                              isCaptain={player.id === captainId}
                              isViceCaptain={player.id === viceCaptainId}
                              onSelect={() => { }}
                              onSetCaptain={handleSetCaptain}
                              onSetViceCaptain={handleSetViceCaptain}
                              showActions={true}
                              variant="captain"
                            />
                          ))}
                        </div>

                        <div className="flex justify-center mt-6">
                          <Button
                            variant="primary"
                            onClick={() => setCurrentStep(3)}
                            disabled={!captainId || !viceCaptainId}
                          >
                            Finalize Team
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Please select players first
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Continue from Step 1 to configure Captain & Vice-Captain
                  </div>
                )}
              </StepCard>

              {/* Step 3: Team Summary */}
              <StepCard
                stepNumber={3}
                title="Team Summary"
                description="Review your final team selection"
                isActive={currentStep === 3}
                isCompleted={false}
              >
                {currentStep === 3 ? (
                  <div className="space-y-6">
                    {selectedPlayerObjs.length > 0 ? (
                      <>
                        {/* Team Name Input */}
                        <div className="mb-6">
                          <label
                            htmlFor="teamName"
                            className="block text-sm font-medium text-text-main mb-2"
                          >
                            Team Name
                          </label>
                          <input
                            type="text"
                            id="teamName"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-border-subtle bg-bg-card text-text-main placeholder:text-text-muted focus:ring-2 focus:ring-accent-pink-soft/40 focus:border-accent-pink-soft"
                            placeholder="Enter your team name"
                            maxLength={50}
                          />
                        </div>

                        {/* Team Preview */}
                        <Card className="p-6 bg-bg-card border border-border-subtle text-text-main">
                          <h4 className="text-lg font-semibold text-text-main mb-4">
                            Your Dream Team
                          </h4>
                          <div className="space-y-3">
                            {selectedPlayerObjs.map((player: Player) => (
                              <div
                                key={player.id}
                                className="flex items-center justify-between py-2 px-3 bg-bg-elevated rounded-lg border border-border-subtle"
                              >
                                <div>
                                  <div className="font-medium text-text-main text-sm">
                                    {player.name}
                                  </div>
                                  <div className="text-xs text-text-muted">
                                    {player.team}
                                  </div>
                                </div>
                                <div className="self-end">
                                  {player.id === captainId && (
                                    <Badge
                                      variant="warning"
                                      size="sm"
                                      className="text-[10px] px-1.5 py-0 shadow-sm"
                                    >
                                      C
                                    </Badge>
                                  )}
                                  {player.id === viceCaptainId && (
                                    <Badge
                                      variant="secondary"
                                      size="sm"
                                      className="text-[10px] px-1.5 py-0 shadow-sm"
                                    >
                                      VC
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No team selected
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Finalize team in Step 2 to view summary
                  </div>
                )}
              </StepCard>

              {/* Submit Button */}
              <div className="flex justify-center mt-6">
                <Button
                  variant="primary"
                  size="lg"
                  className="shadow-glow"
                  disabled={currentStep !== 3 || submitting}
                  onClick={handleSubmitTeam}
                >
                  {submitting
                    ? editMode
                      ? "Saving..."
                      : "Submitting..."
                    : editMode
                      ? "Save Changes"
                      : "Submit Team"}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
