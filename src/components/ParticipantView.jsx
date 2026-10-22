import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Sparkles, 
  RotateCcw, 
  Users, 
  SplitSquareVertical, 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Shield
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/soundEffects';
import sjcLogo from '../assets/sjc-logo.png';
import { KBC_PRIZE_LADDER } from '../data/defaultQuestions';
import { 
  submitParticipantAnswer, 
  markLifelineUsed 
} from '../services/quizService';

export default function ParticipantView({ 
  gameState, 
  questions, 
  currentUser, 
  onOpenLogin,
  allResponses = {}
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState([]); // for 50:50
  const [showLocalPoll, setShowLocalPoll] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  const baseQuestion = questions[gameState.currentQuestionIndex] || questions[0];
  const activeQuestion = isFlipped && baseQuestion?.flipQuestion 
    ? { ...baseQuestion, ...baseQuestion.flipQuestion, isFlip: true } 
    : baseQuestion;

  const currentLadderItem = KBC_PRIZE_LADDER[gameState.currentQuestionIndex] || {
    level: gameState.currentQuestionIndex + 1,
    prize: "₹1,000",
    safe: false
  };

  const currentSafePrize = useMemo(() => {
    let safe = "₹0";
    for (let i = 0; i < gameState.currentQuestionIndex; i++) {
      if (KBC_PRIZE_LADDER[i]?.safe) {
        safe = KBC_PRIZE_LADDER[i].prize;
      }
    }
    return safe;
  }, [gameState.currentQuestionIndex]);

  useEffect(() => {
    setSelectedOption(null);
    setIsLocked(false);
    setIsFlipped(false);
    setHiddenOptions([]);
    setShowLocalPoll(false);
    setHasCelebrated(false);
  }, [gameState.currentQuestionIndex]);

  useEffect(() => {
    if (gameState.status !== 'QUESTION_ACTIVE') return;

    if (!gameState.timerStartedAt) {
      setTimeRemaining(activeQuestion?.timeLimit || 30);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameState.timerStartedAt) / 1000);
      const remaining = Math.max(0, (gameState.timerDuration || 30) - elapsed);
      setTimeRemaining(remaining);

      if (remaining > 0 && remaining <= 5) {
        sounds.playTick(true);
      } else if (remaining > 5) {
        sounds.playTick(false);
      }

      if (remaining === 0 && !isLocked) {
        handleLockAnswer(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.status, gameState.timerStartedAt, gameState.timerDuration, isLocked, selectedOption]);

  useEffect(() => {
    if (gameState.status === 'ANSWER_REVEALED' && !hasCelebrated) {
      const mySubmission = currentUser ? allResponses[currentUser.username?.toLowerCase()] : null;
      const isCorrect = mySubmission ? mySubmission.isCorrect : (selectedOption === activeQuestion.correctAnswer);

      if (isCorrect && (selectedOption !== null || mySubmission)) {
        sounds.playCorrect();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else if (selectedOption !== null) {
        sounds.playWrong();
      }
      setHasCelebrated(true);
    }
  }, [gameState.status, hasCelebrated, selectedOption, activeQuestion, currentUser, allResponses]);

  const handleSelectOption = (idx) => {
    if (isLocked || gameState.status !== 'QUESTION_ACTIVE' || hiddenOptions.includes(idx)) {
      return;
    }
    sounds.playTick(false);
    setSelectedOption(idx);
  };

  const handleLockAnswer = async (isAuto = false) => {
    if (isLocked || gameState.status !== 'QUESTION_ACTIVE') return;
    
    setIsLocked(true);
    sounds.playLock();

    if (!currentUser) return;

    const timeTakenMs = gameState.timerStartedAt 
      ? Math.max(100, Date.now() - gameState.timerStartedAt) 
      : 5000;

    const isCorrect = selectedOption === activeQuestion.correctAnswer;
    const basePoints = (gameState.currentQuestionIndex + 1) * 1000;
    const timeBonus = Math.max(0, Math.floor((timeRemaining / (activeQuestion.timeLimit || 30)) * 500));
    const pointsEarned = isCorrect ? (basePoints + timeBonus) : 0;

    await submitParticipantAnswer({
      userId: currentUser.username,
      username: currentUser.username,
      questionId: activeQuestion.id || `q-${gameState.currentQuestionIndex + 1}`,
      selectedOption: selectedOption !== null ? selectedOption : -1,
      timeTakenMs,
      isCorrect,
      pointsEarned
    });
  };

  const handleUseFiftyFifty = () => {
    if (currentUser?.lifelines?.fiftyFifty || hiddenOptions.length > 0 || isLocked || gameState.status !== 'QUESTION_ACTIVE') return;

    sounds.playLifeline();
    const correct = activeQuestion.correctAnswer;
    const incorrectIndices = [0, 1, 2, 3].filter(i => i !== correct);
    const shuffled = incorrectIndices.sort(() => 0.5 - Math.random());
    setHiddenOptions(shuffled.slice(0, 2));

    if (currentUser) {
      markLifelineUsed(currentUser.username, 'fiftyFifty');
    }
  };

  const handleUseAudiencePoll = () => {
    if (currentUser?.lifelines?.audiencePoll || showLocalPoll || gameState.status !== 'QUESTION_ACTIVE') return;

    sounds.playPoll();
    setShowLocalPoll(true);

    if (currentUser) {
      markLifelineUsed(currentUser.username, 'audiencePoll');
    }
  };

  const handleUseFlipQuestion = () => {
    if (currentUser?.lifelines?.flip || isFlipped || isLocked || gameState.status !== 'QUESTION_ACTIVE') return;

    sounds.playLifeline();
    setIsFlipped(true);
    setSelectedOption(null);
    setHiddenOptions([]);

    if (currentUser) {
      markLifelineUsed(currentUser.username, 'flip');
    }
  };

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

    const correct = activeQuestion?.correctAnswer ?? 0;
    const base = [10, 15, 12, 13];
    base[correct] += 50;
    return base;
  }, [allResponses, activeQuestion]);

  // Unauthenticated screen
  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 text-center samavaya-card rounded-3xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-[#EEC37D] via-[#D27D4F] to-[#4C1B56] p-1 shadow-md">
            <div className="w-full h-full rounded-2xl bg-[#1E0D33] p-1 flex items-center justify-center overflow-hidden">
              <img src={sjcLogo} alt="St. Joseph's College Allahabad" className="w-full h-full object-contain filter drop-shadow" />
            </div>
          </div>
          <span className="text-xs uppercase tracking-wider text-[#EEC37D] font-semibold block mb-0.5">
            St. Joseph's College, Allahabad
          </span>
          <h2 className="text-2xl font-bold text-gold-gradient font-serif">Josephest 2026</h2>
          <p className="text-[#E1DAE9]/80 text-xs mt-2 mb-6 leading-relaxed">
            Please log in with the team credentials issued by the Josephest organizing committee to enter the live quiz hot seat.
          </p>
          <button
            onClick={onOpenLogin}
            className="w-full py-3.5 btn-gold-primary text-sm font-bold shadow-md cursor-pointer"
          >
            Sign In with Assigned Team Account
          </button>
        </div>
      </div>
    );
  }

  // LOBBY VIEW
  if (gameState.status === 'LOBBY') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-3xl mx-auto w-full">
        <div className="w-full samavaya-card rounded-3xl p-6 md:p-10 text-center relative overflow-hidden">
          {/* Subtle top shimmer */}
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#EEC37D] to-transparent opacity-60" />

          {/* SJC Crest & College Name */}
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <img src={sjcLogo} alt="SJC" className="w-8 h-8 object-contain filter drop-shadow" />
            <span className="text-xs font-semibold text-[#EEC37D] tracking-wide">
              St. Joseph's College, Allahabad • Josephest 2026
            </span>
          </div>

          {/* User profile capsule */}
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-[#1E0D33]/80 border border-[#EEC37D]/25 rounded-2xl mb-6">
            <div className="w-8 h-8 rounded-xl bg-[#4C1B56] flex items-center justify-center text-[#FBE0A4] text-xs font-bold">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-[#FDF2E5]">{currentUser.displayName || currentUser.username}</p>
              <p className="text-[11px] text-[#E1DAE9]/60">{currentUser.college || "Team"}</p>
            </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-gold-gradient font-serif mb-2">
            Standing By for Host
          </h2>
          <p className="text-[#E1DAE9]/80 text-xs md:text-sm max-w-md mx-auto mb-8">
            The quiz master is preparing the next question. Your hot seat console will sync immediately when released.
          </p>

          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#1E0D33]/60 border border-[#EEC37D]/20 text-[#EEC37D] text-xs font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-[#EEC37D] animate-ping" />
            <span>Connected to Host Console</span>
          </div>

          {/* Minimal Lifelines preview */}
          <div className="border-t border-[#EEC37D]/15 pt-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#E1DAE9]/60 mb-3">
              Available Lifelines
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#1E0D33]/60 border border-[#EEC37D]/15 p-3 rounded-xl flex items-center gap-2.5">
                <SplitSquareVertical className="w-4 h-4 text-[#EEC37D]" />
                <span className="text-xs text-[#FDF2E5] font-medium">50:50</span>
              </div>
              <div className="bg-[#1E0D33]/60 border border-[#EEC37D]/15 p-3 rounded-xl flex items-center gap-2.5">
                <Users className="w-4 h-4 text-[#EEC37D]" />
                <span className="text-xs text-[#FDF2E5] font-medium">Audience Poll</span>
              </div>
              <div className="bg-[#1E0D33]/60 border border-[#EEC37D]/15 p-3 rounded-xl flex items-center gap-2.5">
                <RotateCcw className="w-4 h-4 text-[#EEC37D]" />
                <span className="text-xs text-[#FDF2E5] font-medium">Flip Question</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE / LOCKED / REVEALED
  const isQuestionLive = gameState.status === 'QUESTION_ACTIVE';
  const isAnswerLocked = gameState.status === 'ANSWER_LOCKED' || isLocked;
  const isAnswerRevealed = gameState.status === 'ANSWER_REVEALED';

  return (
    <div className="flex-1 flex flex-col p-3 md:p-6 max-w-4xl mx-auto w-full">
      {/* Top Banner: Minimalist Level, Prize, Timer */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 samavaya-card rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-[#4C1B56] border border-[#EEC37D]/30 text-[#FBE0A4] font-bold text-xs md:text-sm">
            Q{gameState.currentQuestionIndex + 1} of {questions.length}
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#E1DAE9]/60 block">Ladder Value</span>
            <span className="text-lg md:text-xl font-bold text-gold-metallic">
              {currentLadderItem.prize}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#1E0D33]/60 border border-[#EEC37D]/15 rounded-xl text-xs">
          <Shield className="w-3.5 h-3.5 text-[#EEC37D]" />
          <span className="text-[#E1DAE9]/70">Guaranteed:</span>
          <span className="font-bold text-[#FBE0A4]">{currentSafePrize}</span>
        </div>

        {/* Minimal Timer Ring */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1E0D33] border border-[#EEC37D]/30">
          <Clock className={`w-4 h-4 ${timeRemaining <= 5 ? 'text-[#B00070] animate-spin' : 'text-[#EEC37D]'}`} />
          <span className={`text-lg font-mono font-bold ${timeRemaining <= 5 ? 'text-[#B00070] animate-pulse' : 'text-[#FBE0A4]'}`}>
            {timeRemaining}s
          </span>
        </div>
      </div>

      {/* Minimal Lifelines Bar */}
      <div className="w-full flex items-center justify-between gap-2 mb-4 bg-[#31124A]/40 p-2 rounded-2xl border border-[#EEC37D]/15">
        <span className="text-xs text-[#E1DAE9]/60 px-2 hidden sm:inline">
          Lifelines:
        </span>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <button
            onClick={handleUseFiftyFifty}
            disabled={currentUser?.lifelines?.fiftyFifty || hiddenOptions.length > 0 || isLocked || !isQuestionLive}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentUser?.lifelines?.fiftyFifty || hiddenOptions.length > 0
                ? 'bg-[#1E0D33] text-[#E1DAE9]/30 border border-[#EEC37D]/10 line-through cursor-not-allowed'
                : 'btn-purple-secondary cursor-pointer'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5 text-[#EEC37D]" />
            <span>50:50</span>
          </button>

          <button
            onClick={handleUseAudiencePoll}
            disabled={currentUser?.lifelines?.audiencePoll || showLocalPoll || !isQuestionLive}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentUser?.lifelines?.audiencePoll || showLocalPoll
                ? 'bg-[#1E0D33] text-[#E1DAE9]/30 border border-[#EEC37D]/10 line-through cursor-not-allowed'
                : 'btn-purple-secondary cursor-pointer'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#EEC37D]" />
            <span>Audience Poll</span>
          </button>

          <button
            onClick={handleUseFlipQuestion}
            disabled={currentUser?.lifelines?.flip || isFlipped || isLocked || !isQuestionLive}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentUser?.lifelines?.flip || isFlipped
                ? 'bg-[#1E0D33] text-[#E1DAE9]/30 border border-[#EEC37D]/10 line-through cursor-not-allowed'
                : 'btn-purple-secondary cursor-pointer'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#EEC37D]" />
            <span>Flip Question</span>
          </button>
        </div>
      </div>

      {/* Minimalist Question Display Box */}
      <div className="relative my-auto py-3">
        {isFlipped && (
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#D27D4F] text-[#1E0D33] text-[10px] font-bold uppercase tracking-wider shadow-sm z-10">
            Flipped Question
          </div>
        )}

        <div className="kbc-question-minimal p-6 md:p-8 min-h-[130px] flex items-center justify-center text-center relative">
          <p className="text-base md:text-xl font-medium text-[#FDF2E5] leading-relaxed max-w-2xl">
            {activeQuestion?.question}
          </p>
        </div>
      </div>

      {/* 4 Minimalist Option Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
        {activeQuestion?.options.map((option, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = selectedOption === idx;
          const isHidden = hiddenOptions.includes(idx);
          const isCorrect = idx === activeQuestion.correctAnswer;
          const pollPercent = pollDistribution[idx] || 0;

          let optionClass = "kbc-option-minimal";
          if (isSelected) optionClass += " selected";
          if (isSelected && isLocked) optionClass += " locked";
          if (isAnswerRevealed && isCorrect) optionClass += " correct";
          if (isAnswerRevealed && isSelected && !isCorrect) optionClass += " wrong";

          if (isHidden) {
            return (
              <div 
                key={idx} 
                className="h-14 rounded-xl border border-[#EEC37D]/10 bg-[#1E0D33]/40 flex items-center justify-center opacity-30"
              >
                <span className="text-xs text-[#E1DAE9]/40 font-mono tracking-widest">— — —</span>
              </div>
            );
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelectOption(idx)}
              disabled={isLocked || !isQuestionLive || isHidden}
              className={`w-full min-h-[58px] px-5 py-3 flex items-center justify-between text-left cursor-pointer ${optionClass}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-[#EEC37D] font-bold text-xs md:text-sm font-mono w-5">
                  {letter}:
                </span>
                <span className="text-xs md:text-sm font-medium text-[#FDF2E5]">
                  {option}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {(showLocalPoll || gameState.showAudiencePoll) && (
                  <span className="text-[11px] font-mono text-[#FBE0A4] bg-[#1E0D33]/80 px-2 py-0.5 rounded border border-[#EEC37D]/20">
                    {pollPercent}%
                  </span>
                )}
                {isAnswerRevealed && isCorrect && (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                )}
                {isAnswerRevealed && isSelected && !isCorrect && (
                  <XCircle className="w-4 h-4 text-[#B00070]" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Lock Bar */}
      {isQuestionLive && !isLocked && selectedOption !== null && (
        <div className="p-3.5 bg-[#31124A]/90 border border-[#EEC37D]/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <span className="text-xs text-[#E1DAE9]">
            Selected Option <strong className="text-[#FBE0A4] font-bold">{String.fromCharCode(65 + selectedOption)}</strong>. Confirm choice?
          </span>
          <button
            onClick={() => handleLockAnswer(false)}
            className="px-5 py-2 btn-gold-primary text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            Lock Answer (Lock kiya jaye)
          </button>
        </div>
      )}

      {/* Locked message */}
      {isAnswerLocked && !isAnswerRevealed && (
        <div className="p-3 bg-[#31124A]/60 border border-[#EEC37D]/20 rounded-2xl text-center text-[#FBE0A4] text-xs font-medium">
          Answer Locked. Awaiting Host to reveal the outcome.
        </div>
      )}

      {/* Explanation Banner on Reveal */}
      {isAnswerRevealed && (
        <div className="p-4 bg-[#31124A]/80 border border-emerald-500/30 rounded-2xl mt-2 animate-fadeIn text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Correct Answer: Option {String.fromCharCode(65 + activeQuestion.correctAnswer)}
            </span>
            <span className="text-[#E1DAE9]/60">{activeQuestion.category}</span>
          </div>
          <p className="text-[#E1DAE9]/90 leading-relaxed">
            {activeQuestion.explanation || "No explanation provided for this question."}
          </p>
        </div>
      )}
    </div>
  );
}
