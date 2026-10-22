import React, { useEffect, useState, useMemo } from 'react';
import { Clock, Trophy, CheckCircle, XCircle, Lock, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import sjcLogo from '../assets/sjc-logo.png';
import { KBC_PRIZE_LADDER } from '../data/defaultQuestions';
import { sounds } from '../utils/soundEffects';

export default function AuditoriumView({ gameState, questions, allResponses = {}, participants = [] }) {
  const [timeRemaining, setTimeRemaining] = useState(30);

  const currentQ = questions[gameState.currentQuestionIndex] || questions[0];
  const ladderItem = KBC_PRIZE_LADDER[gameState.currentQuestionIndex] || { prize: "₹1,000" };

  useEffect(() => {
    if (gameState.status !== 'QUESTION_ACTIVE') return;

    if (!gameState.timerStartedAt) {
      setTimeRemaining(currentQ?.timeLimit || 30);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameState.timerStartedAt) / 1000);
      const remaining = Math.max(0, (gameState.timerDuration || 30) - elapsed);
      setTimeRemaining(remaining);

      if (remaining > 0 && remaining <= 5) {
        sounds.playTick(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.status, gameState.timerStartedAt, gameState.timerDuration, currentQ]);

  useEffect(() => {
    if (gameState.status === 'ANSWER_REVEALED') {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 }
      });
    }
  }, [gameState.status]);

  const pollDistribution = useMemo(() => {
    const counts = [0, 0, 0, 0];
    let total = 0;
    Object.values(allResponses).forEach(r => {
      if (r.selectedOption >= 0 && r.selectedOption <= 3) {
        counts[r.selectedOption]++;
        total++;
      }
    });

    if (total > 0) {
      return counts.map(c => Math.round((c / total) * 100));
    }
    const correct = currentQ?.correctAnswer ?? 0;
    const base = [12, 16, 14, 18];
    base[correct] += 40;
    return base;
  }, [allResponses, currentQ]);

  const topContestants = useMemo(() => {
    return [...participants].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);
  }, [participants]);

  // Compute team response tracking
  const contestantLockedList = useMemo(() => {
    return participants.map(p => {
      const submission = allResponses[p.username.toLowerCase()];
      return {
        username: p.username,
        displayName: p.displayName || p.username,
        college: p.college,
        hasLocked: !!submission,
        selectedOption: submission ? submission.selectedOption : -1,
        timeTakenMs: submission ? submission.timeTakenMs : null,
        isCorrect: submission ? submission.isCorrect : false,
        pointsEarned: submission ? submission.pointsEarned : 0
      };
    });
  }, [participants, allResponses]);

  const lockedCount = contestantLockedList.filter(c => c.hasLocked).length;
  const isRevealed = gameState.status === 'ANSWER_REVEALED';

  // AUDITORIUM LOBBY
  if (gameState.status === 'LOBBY') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-28 h-28 md:w-36 md:h-36 mx-auto mb-6 rounded-3xl bg-gradient-to-tr from-[#EEC37D] via-[#D27D4F] to-[#4C1B56] p-1 shadow-2xl">
          <div className="w-full h-full rounded-3xl bg-[#1E0D33] p-2 flex items-center justify-center overflow-hidden">
            <img 
              src={sjcLogo} 
              alt="St. Joseph's College Allahabad" 
              className="w-full h-full object-contain filter drop-shadow-lg"
            />
          </div>
        </div>

        <span className="text-xs md:text-sm font-semibold tracking-widest uppercase text-[#EEC37D] mb-1">
          St. Joseph's College, Allahabad
        </span>
        <h1 className="text-4xl md:text-6xl font-black text-gold-gradient font-serif uppercase tracking-widest mb-3">
          Josephest 2026
        </h1>
        <p className="text-base md:text-xl text-[#E1DAE9]/80 font-medium mb-8">
          Kaun Banega Crorepati Championship
        </p>

        <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-[#31124A]/80 border border-[#EEC37D]/30 rounded-2xl text-[#EEC37D] font-semibold text-sm shadow-md animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EEC37D] animate-ping" />
          <span>Stage Projector Ready • Waiting for Quiz Master</span>
        </div>
      </div>
    );
  }

  // LEADERBOARD
  if (gameState.status === 'LEADERBOARD' || gameState.status === 'COMPLETED') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-3xl mx-auto w-full">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-[#4C1B56] border border-[#EEC37D]/30 p-1 flex items-center justify-center">
            <img src={sjcLogo} alt="SJC" className="w-full h-full object-contain" />
          </div>
          <span className="text-xs text-[#EEC37D] tracking-wider uppercase font-semibold">
            St. Joseph's College • Josephest 2026
          </span>
          <h2 className="text-2xl md:text-4xl font-bold text-gold-gradient font-serif mt-1">
            Tournament Standings
          </h2>
        </div>

        <div className="w-full samavaya-card rounded-3xl p-6 shadow-xl space-y-2.5">
          {topContestants.length === 0 ? (
            <p className="text-center text-[#E1DAE9]/50 text-xs py-6">No scores registered yet.</p>
          ) : (
            topContestants.map((user, idx) => {
              const isFirst = idx === 0;
              return (
                <div
                  key={user.username}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    isFirst 
                      ? 'bg-[#4C1B56]/50 border-[#EEC37D]/50 shadow-md' 
                      : 'bg-[#1E0D33]/50 border-[#EEC37D]/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isFirst ? 'bg-[#EEC37D] text-[#1E0D33]' : 'bg-[#1E0D33] text-[#E1DAE9]/70'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#FDF2E5]">{user.displayName || user.username}</p>
                      <p className="text-[11px] text-[#E1DAE9]/60">{user.college || "Team"}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-bold text-gold-metallic">
                      {user.score || 0} pts
                    </span>
                    <span className="block text-[10px] text-[#EEC37D]">
                      Level {user.currentLevel || 1}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // AUDITORIUM QUESTION SCREEN WITH CONTESTANT ANSWERS
  return (
    <div className="flex-1 flex flex-col justify-between p-4 md:p-8 max-w-6xl mx-auto w-full">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 samavaya-card rounded-3xl p-4 md:p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#4C1B56] border border-[#EEC37D]/30 p-1 flex items-center justify-center">
            <img src={sjcLogo} alt="SJC" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#EEC37D] font-semibold block">
              Josephest 2026 • Question {gameState.currentQuestionIndex + 1}
            </span>
            <span className="text-xl md:text-3xl font-bold text-gold-metallic">
              {ladderItem.prize}
            </span>
          </div>
        </div>

        {/* Live Lock Counter */}
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#1E0D33]/80 border border-[#EEC37D]/20 rounded-2xl text-xs">
          <Users className="w-4 h-4 text-[#EEC37D]" />
          <span className="text-[#E1DAE9]/70">Teams Responded:</span>
          <span className="font-bold text-[#FBE0A4]">{lockedCount} / {participants.length}</span>
        </div>

        <div className="flex items-center gap-2.5 px-5 py-2 rounded-2xl bg-[#1E0D33] border border-[#EEC37D]/30">
          <Clock className={`w-6 h-6 ${timeRemaining <= 5 ? 'text-[#B00070] animate-spin' : 'text-[#EEC37D]'}`} />
          <span className={`text-2xl md:text-3xl font-mono font-bold ${timeRemaining <= 5 ? 'text-[#B00070] animate-pulse' : 'text-[#FBE0A4]'}`}>
            {timeRemaining}s
          </span>
        </div>
      </div>

      {/* Main Big Question Box */}
      <div className="my-5">
        <div className="kbc-question-minimal p-6 md:p-10 min-h-[140px] flex items-center justify-center text-center">
          <h2 className="text-xl md:text-3xl font-semibold text-[#FDF2E5] leading-relaxed max-w-3xl">
            {currentQ?.question}
          </h2>
        </div>
      </div>

      {/* 4 Minimalist Option Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">
        {currentQ?.options.map((option, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isCorrect = idx === currentQ.correctAnswer;
          const pollPct = pollDistribution[idx] || 0;

          let cardClass = "kbc-option-minimal";
          if (isRevealed && isCorrect) cardClass += " correct";

          return (
            <div
              key={idx}
              className={`min-h-[64px] px-6 py-3.5 flex items-center justify-between ${cardClass}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-[#EEC37D] font-bold text-base md:text-lg font-mono">
                  {letter}:
                </span>
                <span className="text-sm md:text-base font-medium text-[#FDF2E5]">
                  {option}
                </span>
              </div>

              {gameState.showAudiencePoll && (
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-[#1E0D33] rounded-full overflow-hidden border border-[#EEC37D]/20">
                    <div
                      className="h-full bg-[#EEC37D] transition-all duration-500"
                      style={{ width: `${pollPct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-[#FBE0A4]">
                    {pollPct}%
                  </span>
                </div>
              )}

              {isRevealed && isCorrect && (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              )}
            </div>
          );
        })}
      </div>

      {/* STAGE AUDITORIUM: LIVE CONTESTANT LOCKED ANSWERS PANEL */}
      {contestantLockedList.length > 0 && (
        <div className="samavaya-card rounded-2xl p-4 mt-2">
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[#EEC37D]/15">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#EEC37D]" />
              <h3 className="text-xs font-bold text-[#FDF2E5]">
                {isRevealed ? "Contestant Answers Revealed" : "Contestant Lock Status"}
              </h3>
            </div>
            <span className="text-[11px] text-[#EEC37D] font-mono">
              {lockedCount} of {participants.length} locked
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {contestantLockedList.map((team) => {
              if (isRevealed) {
                // When answer is revealed: Show team's selected option and correctness
                const optionLetter = team.selectedOption >= 0 ? String.fromCharCode(65 + team.selectedOption) : "None";
                const isCorrect = team.selectedOption === currentQ.correctAnswer;

                return (
                  <div
                    key={team.username}
                    className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      isCorrect 
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200' 
                        : team.hasLocked 
                          ? 'bg-[#4C1B56]/60 border-[#B00070]/50 text-[#F9E8E0]' 
                          : 'bg-[#1E0D33]/40 border-[#EEC37D]/10 text-[#E1DAE9]/40'
                    }`}
                  >
                    <div className="truncate max-w-[80px]">
                      <span className="font-semibold block truncate">{team.displayName || team.username}</span>
                      <span className="text-[10px] font-mono opacity-70">
                        {team.hasLocked ? `Option ${optionLetter}` : "No Answer"}
                      </span>
                    </div>
                    {isCorrect ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : team.hasLocked ? (
                      <XCircle className="w-4 h-4 text-[#B00070] shrink-0" />
                    ) : (
                      <span className="text-[10px] text-[#E1DAE9]/40 shrink-0">—</span>
                    )}
                  </div>
                );
              }

              // While question is active / locked: Show who has locked their answer
              return (
                <div
                  key={team.username}
                  className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    team.hasLocked 
                      ? 'bg-[#31124A] border-[#EEC37D]/40 text-[#FBE0A4]' 
                      : 'bg-[#1E0D33]/40 border-[#EEC37D]/10 text-[#E1DAE9]/40'
                  }`}
                >
                  <div className="truncate max-w-[85px]">
                    <span className="font-semibold block truncate">{team.displayName || team.username}</span>
                    <span className="text-[10px] font-mono opacity-70">
                      {team.hasLocked ? `${(team.timeTakenMs / 1000).toFixed(1)}s` : "Thinking..."}
                    </span>
                  </div>
                  {team.hasLocked ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#4C1B56] border border-[#EEC37D]/30 text-[#EEC37D] font-bold">
                      🔒 Locked
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#E1DAE9]/40 animate-pulse">
                      ⏳ ...
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
