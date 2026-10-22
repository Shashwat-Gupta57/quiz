import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Lock, 
  Eye, 
  Users, 
  Trophy, 
  SkipForward, 
  RotateCcw, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  Key, 
  UserPlus, 
  CheckCircle, 
  Clock, 
  BarChart3,
  HelpCircle,
  Database,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import sjcLogo from '../assets/sjc-logo.png';
import { sounds } from '../utils/soundEffects';
import { KBC_PRIZE_LADDER } from '../data/defaultQuestions';
import { 
  updateGameState, 
  saveQuestions, 
  registerOrUpdateUser, 
  bulkRegisterUsers, 
  deleteUserAccount,
  resetAllScores,
  updateAdminPassword
} from '../services/quizService';
import { 
  getSavedFirebaseConfig, 
  saveFirebaseConfig, 
  isFirebaseActive 
} from '../services/firebaseConfig';

export default function AdminPanel({ 
  gameState, 
  questions, 
  participants, 
  allResponses = {},
  adminPassword
}) {
  const [activeTab, setActiveTab] = useState('controller'); // controller | questions | users | settings
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  
  // Contestant forms (Admin only)
  const [newUser, setNewUser] = useState({ username: '', password: '', displayName: '', college: '' });
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkPrefix, setBulkPrefix] = useState('team');
  const [bulkPass, setBulkPass] = useState('fest2026');

  // Change Admin Password state
  const [newAdminPass, setNewAdminPass] = useState('');
  const [passNotice, setPassNotice] = useState('');

  // Firebase config form
  const [fbConfig, setFbConfig] = useState(getSavedFirebaseConfig());

  const currentQ = questions[gameState.currentQuestionIndex] || questions[0];
  const ladderItem = KBC_PRIZE_LADDER[gameState.currentQuestionIndex] || { prize: "₹1,000" };

  // -------------------------------------------------------------
  // CONTROLLER ACTIONS
  // -------------------------------------------------------------
  const handleLaunchQuestion = async () => {
    sounds.playTick(false);
    await updateGameState({
      status: 'QUESTION_ACTIVE',
      timerStartedAt: Date.now(),
      timerDuration: currentQ.timeLimit || 30,
      showAudiencePoll: false,
      revealOption: false
    });
  };

  const handleLockAnswers = async () => {
    sounds.playLock();
    await updateGameState({
      status: 'ANSWER_LOCKED'
    });
  };

  const handleRevealAnswer = async () => {
    sounds.playCorrect();
    await updateGameState({
      status: 'ANSWER_REVEALED',
      revealOption: true
    });
  };

  const handleToggleAudiencePoll = async () => {
    sounds.playPoll();
    await updateGameState({
      showAudiencePoll: !gameState.showAudiencePoll
    });
  };

  const handleShowLeaderboard = async () => {
    sounds.playCorrect();
    await updateGameState({
      status: 'LEADERBOARD'
    });
  };

  const handleNextQuestion = async () => {
    if (gameState.currentQuestionIndex < questions.length - 1) {
      sounds.playTick(false);
      const nextIndex = gameState.currentQuestionIndex + 1;
      await updateGameState({
        currentQuestionIndex: nextIndex,
        activeQuestionId: questions[nextIndex]?.id || `q-${nextIndex + 1}`,
        status: 'LOBBY',
        timerStartedAt: null,
        showAudiencePoll: false,
        revealOption: false
      });
    } else {
      await updateGameState({
        status: 'COMPLETED'
      });
    }
  };

  const handleJumpToQuestion = async (idx) => {
    await updateGameState({
      currentQuestionIndex: idx,
      activeQuestionId: questions[idx]?.id || `q-${idx + 1}`,
      status: 'LOBBY',
      timerStartedAt: null,
      showAudiencePoll: false,
      revealOption: false
    });
  };

  const handleResetSession = async () => {
    if (window.confirm("Reset the live session back to Lobby for Question 1?")) {
      await updateGameState({
        status: 'LOBBY',
        currentQuestionIndex: 0,
        activeQuestionId: questions[0]?.id || 'q-1',
        timerStartedAt: null,
        showAudiencePoll: false,
        revealOption: false
      });
    }
  };

  // Change Admin Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newAdminPass.trim()) return;
    await updateAdminPassword(newAdminPass.trim());
    setPassNotice("Admin password updated successfully!");
    setNewAdminPass('');
    setTimeout(() => setPassNotice(''), 4000);
  };

  // Compute live submission stats
  const submissionStats = useMemo(() => {
    const totalParticipants = participants.length;
    const currentSubmissions = Object.values(allResponses);
    const answeredCount = currentSubmissions.length;
    const percentage = totalParticipants > 0 ? Math.round((answeredCount / totalParticipants) * 100) : 0;

    const optionCounts = [0, 0, 0, 0];
    currentSubmissions.forEach(s => {
      if (s.selectedOption >= 0 && s.selectedOption <= 3) {
        optionCounts[s.selectedOption]++;
      }
    });

    return {
      totalParticipants,
      answeredCount,
      percentage,
      optionCounts,
      submissions: currentSubmissions.sort((a, b) => a.timeTakenMs - b.timeTakenMs)
    };
  }, [participants, allResponses]);

  // -------------------------------------------------------------
  // QUESTION MANAGEMENT ACTIONS
  // -------------------------------------------------------------
  const handleOpenAddQuestion = () => {
    setEditingQuestion({
      id: `q-${questions.length + 1}`,
      level: questions.length + 1,
      prize: KBC_PRIZE_LADDER[questions.length]?.prize || `₹${(questions.length + 1) * 1000}`,
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      timeLimit: 30,
      category: 'General',
      explanation: '',
      flipQuestion: {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: ''
      }
    });
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    const list = [...questions];
    const idx = list.findIndex(q => q.id === editingQuestion.id);
    if (idx >= 0) {
      list[idx] = editingQuestion;
    } else {
      list.push(editingQuestion);
    }
    await saveQuestions(list);
    setIsQuestionModalOpen(false);
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = async (id) => {
    if (window.confirm("Delete this question?")) {
      const updated = questions.filter(q => q.id !== id);
      await saveQuestions(updated);
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "kbc-fest-questions.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed)) {
            await saveQuestions(parsed);
            alert("Questions imported successfully!");
          }
        } catch (err) {
          alert("Invalid JSON file format.");
        }
      };
      reader.readAsText(file);
    }
  };

  // -------------------------------------------------------------
  // USER MANAGEMENT ACTIONS (ADMIN ONLY)
  // -------------------------------------------------------------
  const handleAddSingleUser = async (e) => {
    e.preventDefault();
    if (!newUser.username.trim() || !newUser.password.trim()) return;
    await registerOrUpdateUser(newUser);
    setNewUser({ username: '', password: '', displayName: '', college: '' });
  };

  const handleGenerateBulk = async () => {
    const generated = [];
    for (let i = 1; i <= bulkCount; i++) {
      generated.push({
        username: `${bulkPrefix}${i}`,
        password: `${bulkPass}`,
        displayName: `Team ${i}`,
        college: "St. Joseph's College, Allahabad"
      });
    }
    await bulkRegisterUsers(generated);
  };

  const handleDeleteUser = async (uname) => {
    if (window.confirm(`Remove team account "${uname}"?`)) {
      await deleteUserAccount(uname);
    }
  };

  const handleResetScores = async () => {
    if (window.confirm("Reset all participants' scores and lifelines back to zero?")) {
      await resetAllScores();
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-6xl mx-auto w-full">
      {/* Admin Title & Tab Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[#EEC37D]/15">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#4C1B56] border border-[#EEC37D]/30 p-1 flex items-center justify-center">
            <img src={sjcLogo} alt="SJC" className="w-full h-full object-contain filter drop-shadow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-[#4C1B56] border border-[#EEC37D]/30 text-[#FBE0A4] text-[10px] font-semibold tracking-wide">
                Host Console
              </span>
              <span className="text-xs text-[#E1DAE9]/60">St. Joseph's College, Allahabad</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gold-gradient font-serif mt-0.5">
              Josephest 2026 Coordinator
            </h2>
          </div>
        </div>

        {/* Minimalist Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-[#31124A]/60 p-1.5 rounded-2xl border border-[#EEC37D]/15">
          <button
            onClick={() => setActiveTab('controller')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'controller'
                ? 'bg-[#EEC37D] text-[#1E0D33] font-bold shadow-sm'
                : 'text-[#E1DAE9]/70 hover:text-[#FDF2E5] hover:bg-[#4C1B56]/50'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Live Controller</span>
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'questions'
                ? 'bg-[#EEC37D] text-[#1E0D33] font-bold shadow-sm'
                : 'text-[#E1DAE9]/70 hover:text-[#FDF2E5] hover:bg-[#4C1B56]/50'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Questions ({questions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#EEC37D] text-[#1E0D33] font-bold shadow-sm'
                : 'text-[#E1DAE9]/70 hover:text-[#FDF2E5] hover:bg-[#4C1B56]/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Accounts ({participants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#EEC37D] text-[#1E0D33] font-bold shadow-sm'
                : 'text-[#E1DAE9]/70 hover:text-[#FDF2E5] hover:bg-[#4C1B56]/50'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Security & Firebase</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: LIVE GAME CONTROLLER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'controller' && (
        <div className="space-y-6">
          <div className="samavaya-card rounded-3xl p-5 md:p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-3 border-b border-[#EEC37D]/15">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-xl bg-[#4C1B56] border border-[#EEC37D]/30 text-[#FBE0A4] font-bold text-xs">
                  Question {gameState.currentQuestionIndex + 1} / {questions.length}
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#E1DAE9]/60 block">Prize Value</span>
                  <span className="text-lg font-bold text-gold-metallic">{ladderItem.prize}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#E1DAE9]/60">Phase:</span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#1E0D33] border border-[#EEC37D]/30 text-[#FBE0A4]">
                  {gameState.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Question Preview Box */}
            <div className="p-4 bg-[#1E0D33]/60 border border-[#EEC37D]/15 rounded-2xl mb-5 text-center">
              <span className="text-[10px] uppercase tracking-wider text-[#EEC37D] font-semibold block mb-1">
                {currentQ?.category || "Trivia"}
              </span>
              <p className="text-sm md:text-base font-medium text-[#FDF2E5] max-w-2xl mx-auto">
                {currentQ?.question}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                {currentQ?.options.map((opt, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between ${
                      i === currentQ.correctAnswer
                        ? 'bg-[#4C1B56]/80 border-[#EEC37D]/60 text-[#FBE0A4] font-bold'
                        : 'bg-[#1E0D33]/40 border-[#EEC37D]/10 text-[#E1DAE9]/80'
                    }`}
                  >
                    <span>{String.fromCharCode(65 + i)}: {opt}</span>
                    {i === currentQ.correctAnswer && <CheckCircle className="w-3 h-3 text-[#EEC37D]" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Broadcast Control Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <button
                onClick={handleLaunchQuestion}
                className="p-3 rounded-xl btn-gold-primary text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>1. Launch Q</span>
              </button>

              <button
                onClick={handleLockAnswers}
                className="p-3 rounded-xl bg-[#8B4A5A] hover:bg-[#B00070] text-[#FDF2E5] font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>2. Lock Answers</span>
              </button>

              <button
                onClick={handleRevealAnswer}
                className="p-3 rounded-xl bg-[#4C1B56] hover:bg-[#543C5B] text-[#FBE0A4] border border-[#EEC37D]/30 font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>3. Reveal Answer</span>
              </button>

              <button
                onClick={handleToggleAudiencePoll}
                className={`p-3 rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  gameState.showAudiencePoll 
                    ? 'bg-[#EEC37D] text-[#1E0D33]' 
                    : 'bg-[#31124A] text-[#E1DAE9] border border-[#EEC37D]/20 hover:bg-[#4C1B56]'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>{gameState.showAudiencePoll ? 'Hide Poll' : 'Show Poll'}</span>
              </button>

              <button
                onClick={handleShowLeaderboard}
                className="p-3 rounded-xl bg-[#31124A] hover:bg-[#4C1B56] text-[#FBE0A4] border border-[#EEC37D]/30 font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <Trophy className="w-4 h-4" />
                <span>Leaderboard</span>
              </button>

              <button
                onClick={handleNextQuestion}
                className="p-3 rounded-xl bg-[#1E0D33] hover:bg-[#31124A] text-[#FDF2E5] border border-[#EEC37D]/25 font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
                <span>Next Question &gt;</span>
              </button>
            </div>

            {/* Jump Question & Emergency Reset Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-3 border-t border-[#EEC37D]/15 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#E1DAE9]/60">Jump to:</span>
                <div className="flex flex-wrap gap-1">
                  {questions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleJumpToQuestion(idx)}
                      className={`w-6 h-6 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        gameState.currentQuestionIndex === idx
                          ? 'bg-[#EEC37D] text-[#1E0D33]'
                          : 'bg-[#1E0D33] text-[#E1DAE9]/60 hover:text-[#FDF2E5] hover:bg-[#4C1B56]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleResetSession}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#4C1B56]/50 hover:bg-[#4C1B56] border border-[#8B4A5A]/50 text-[#FDF2E5] font-medium transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-[#EEC37D]" />
                <span>Reset to Lobby</span>
              </button>
            </div>
          </div>

          {/* Submissions & Fastest Finger Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="samavaya-card rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#FDF2E5] flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-[#EEC37D]" />
                  Option Vote Distribution
                </h3>
                <span className="text-[11px] text-[#E1DAE9]/60 font-mono">
                  {submissionStats.answeredCount} / {submissionStats.totalParticipants} answered
                </span>
              </div>

              <div className="w-full h-1.5 bg-[#1E0D33] rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-[#D27D4F] to-[#EEC37D] transition-all duration-300"
                  style={{ width: `${submissionStats.percentage}%` }}
                />
              </div>

              <div className="space-y-2.5">
                {currentQ?.options.map((opt, i) => {
                  const count = submissionStats.optionCounts[i] || 0;
                  const pct = submissionStats.answeredCount > 0 
                    ? Math.round((count / submissionStats.answeredCount) * 100) 
                    : 0;
                  const isCorrect = i === currentQ.correctAnswer;

                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-medium ${isCorrect ? 'text-[#FBE0A4]' : 'text-[#E1DAE9]/80'}`}>
                          {String.fromCharCode(65 + i)}: {opt} {isCorrect && "✓"}
                        </span>
                        <span className="text-[#E1DAE9]/60 font-mono text-[11px]">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#1E0D33] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isCorrect ? 'bg-[#EEC37D]' : 'bg-[#4C1B56]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fastest Finger Response Stream */}
            <div className="lg:col-span-2 samavaya-card rounded-2xl p-5 shadow-lg flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#FDF2E5] flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#EEC37D]" />
                  Live Response Stream
                </h3>
                <span className="text-[11px] text-[#EEC37D] font-mono">
                  Ranked by response time
                </span>
              </div>

              {submissionStats.submissions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-[#E1DAE9]/40 text-xs text-center border border-dashed border-[#EEC37D]/15 rounded-xl">
                  <Clock className="w-6 h-6 mb-2 opacity-30" />
                  <p>No answers submitted for this question yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#1E0D33]/60 text-[#E1DAE9]/60 border-b border-[#EEC37D]/15">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Team</th>
                        <th className="py-2 px-3">Option</th>
                        <th className="py-2 px-3">Time</th>
                        <th className="py-2 px-3">Result</th>
                        <th className="py-2 px-3 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEC37D]/10">
                      {submissionStats.submissions.map((sub, idx) => (
                        <tr key={sub.username} className="hover:bg-[#4C1B56]/30">
                          <td className="py-2 px-3 font-mono text-[#E1DAE9]/60">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-[#FDF2E5]">{sub.username}</td>
                          <td className="py-2 px-3 font-mono font-bold text-[#EEC37D]">
                            {sub.selectedOption >= 0 ? String.fromCharCode(65 + sub.selectedOption) : "—"}
                          </td>
                          <td className="py-2 px-3 font-mono text-[#E1DAE9]/80">
                            {(sub.timeTakenMs / 1000).toFixed(2)}s
                          </td>
                          <td className="py-2 px-3">
                            {sub.isCorrect ? (
                              <span className="text-emerald-400 font-semibold">Correct</span>
                            ) : (
                              <span className="text-[#8B4A5A]">Incorrect</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#FBE0A4]">
                            +{sub.pointsEarned || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: QUESTIONS MANAGER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 samavaya-card p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-[#FDF2E5]">Question Bank ({questions.length} Levels)</h3>
              <p className="text-xs text-[#E1DAE9]/60">Customize questions, options, and flip alternatives</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E0D33] hover:bg-[#4C1B56] text-[#E1DAE9] text-xs font-medium border border-[#EEC37D]/20 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#EEC37D]" />
                <span>Export JSON</span>
              </button>

              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E0D33] hover:bg-[#4C1B56] text-[#E1DAE9] text-xs font-medium border border-[#EEC37D]/20 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#EEC37D]" />
                <span>Import JSON</span>
                <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              </label>

              <button
                onClick={handleOpenAddQuestion}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl btn-gold-primary text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          <div className="samavaya-card rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#1E0D33]/60 text-[#E1DAE9]/60 border-b border-[#EEC37D]/15">
                  <tr>
                    <th className="py-2.5 px-4">Level</th>
                    <th className="py-2.5 px-4">Prize</th>
                    <th className="py-2.5 px-4">Question</th>
                    <th className="py-2.5 px-4">Correct</th>
                    <th className="py-2.5 px-4">Timer</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEC37D]/10">
                  {questions.map((q, idx) => (
                    <tr key={q.id || idx} className="hover:bg-[#4C1B56]/30">
                      <td className="py-2.5 px-4 font-mono font-bold text-[#EEC37D]">Q{idx + 1}</td>
                      <td className="py-2.5 px-4 font-medium text-[#FDF2E5]">{q.prize}</td>
                      <td className="py-2.5 px-4 text-[#E1DAE9] max-w-sm truncate">{q.question}</td>
                      <td className="py-2.5 px-4 font-mono text-[#FBE0A4]">
                        {String.fromCharCode(65 + q.correctAnswer)}: {q.options[q.correctAnswer]}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[#E1DAE9]/60">{q.timeLimit || 30}s</td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingQuestion(q);
                              setIsQuestionModalOpen(true);
                            }}
                            className="p-1 rounded-lg hover:bg-[#4C1B56] text-[#EEC37D] transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1 rounded-lg hover:bg-[#4C1B56] text-[#B00070] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: CONTESTANT USER MANAGEMENT (ADMIN ONLY) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form: Add Single Team Account */}
            <div className="samavaya-card rounded-2xl p-5 shadow-lg">
              <h3 className="text-xs font-bold text-[#FDF2E5] mb-2 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#EEC37D]" />
                Provision Team Account
              </h3>
              <p className="text-[11px] text-[#E1DAE9]/60 mb-3">
                Contestants can only log in with accounts created here by the admin.
              </p>
              <form onSubmit={handleAddSingleUser} className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-[#E1DAE9]/70 mb-1">Username (Login ID)</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="e.g. team_alfa"
                    className="w-full px-3 py-2 bg-[#1E0D33] border border-[#EEC37D]/20 rounded-xl text-[#FDF2E5] outline-none focus:border-[#EEC37D]"
                  />
                </div>
                <div>
                  <label className="block text-[#E1DAE9]/70 mb-1">Password</label>
                  <input
                    type="text"
                    required
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="e.g. secret123"
                    className="w-full px-3 py-2 bg-[#1E0D33] border border-[#EEC37D]/20 rounded-xl text-[#FDF2E5] outline-none focus:border-[#EEC37D]"
                  />
                </div>
                <div>
                  <label className="block text-[#E1DAE9]/70 mb-1">Display Name / Members (Optional)</label>
                  <input
                    type="text"
                    value={newUser.displayName}
                    onChange={e => setNewUser({ ...newUser, displayName: e.target.value })}
                    placeholder="e.g. Rahul & Priya"
                    className="w-full px-3 py-2 bg-[#1E0D33] border border-[#EEC37D]/20 rounded-xl text-[#FDF2E5] outline-none focus:border-[#EEC37D]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 btn-gold-primary text-xs font-bold transition-all shadow-sm cursor-pointer mt-2"
                >
                  Create Team Account
                </button>
              </form>
            </div>

            {/* Form: Bulk Team Generator */}
            <div className="samavaya-card rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#FDF2E5] mb-1 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#EEC37D]" />
                  Bulk Team Generator
                </h3>
                <p className="text-[11px] text-[#E1DAE9]/60 mb-3">
                  Generate multiple team accounts with one click (e.g. <code className="text-[#EEC37D]">team1</code> to <code className="text-[#EEC37D]">team20</code>).
                </p>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[#E1DAE9]/70 mb-1">Prefix</label>
                    <input
                      type="text"
                      value={bulkPrefix}
                      onChange={e => setBulkPrefix(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1E0D33] border border-[#EEC37D]/20 rounded-xl text-[#FDF2E5] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#E1DAE9]/70 mb-1">Count</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={bulkCount}
                      onChange={e => setBulkCount(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-[#1E0D33] border border-[#EEC37D]/20 rounded-xl text-[#FDF2E5] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#E1DAE9]/70 mb-1">Password</label>
                    <input
                      type="text"
                      value={bulkPass}
                      onChange={e => setBulkPass(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1E0D33] border border-[#EEC37D]/20 rounded-xl text-[#FDF2E5] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <button
                  type="button"
                  onClick={handleGenerateBulk}
                  className="w-full py-2.5 bg-[#4C1B56] hover:bg-[#8B4A5A] text-[#FDF2E5] border border-[#EEC37D]/30 font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                >
                  Generate {bulkCount} Team Credentials
                </button>
                <button
                  type="button"
                  onClick={handleResetScores}
                  className="w-full py-2 bg-[#1E0D33] hover:bg-[#31124A] text-[#B00070] font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Reset All Scores to 0
                </button>
              </div>
            </div>
          </div>

          {/* Registered Teams Table */}
          <div className="samavaya-card rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-[#EEC37D]/15 flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#FDF2E5]">
                Authorized Teams ({participants.length})
              </h3>
              <span className="text-[11px] text-[#E1DAE9]/60">Synced to Firebase Cloud</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#1E0D33]/60 text-[#E1DAE9]/60 border-b border-[#EEC37D]/15">
                  <tr>
                    <th className="py-2.5 px-3">Username</th>
                    <th className="py-2.5 px-3">Password</th>
                    <th className="py-2.5 px-3">Display Name</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Lifelines</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEC37D]/10">
                  {participants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[#E1DAE9]/40">
                        No team accounts yet. Use the form above to add teams.
                      </td>
                    </tr>
                  ) : (
                    participants.map(p => {
                      const lifelinesLeft = [
                        !p.lifelines?.fiftyFifty && "50:50",
                        !p.lifelines?.audiencePoll && "Poll",
                        !p.lifelines?.flip && "Flip"
                      ].filter(Boolean).join(", ") || "None";

                      return (
                        <tr key={p.username} className="hover:bg-[#4C1B56]/30">
                          <td className="py-2 px-3 font-mono font-bold text-[#EEC37D]">{p.username}</td>
                          <td className="py-2 px-3 font-mono text-[#E1DAE9]/80">{p.password}</td>
                          <td className="py-2 px-3 text-[#FDF2E5]">{p.displayName || p.username}</td>
                          <td className="py-2 px-3 font-mono font-bold text-[#FBE0A4]">{p.score || 0} pts</td>
                          <td className="py-2 px-3 text-[#E1DAE9]/60">{lifelinesLeft}</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => handleDeleteUser(p.username)}
                              className="text-[#B00070] hover:text-red-400 p-1 cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: SECURITY & FIREBASE SETTINGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-2xl">
          {/* Admin Password Change Form */}
          <div className="samavaya-card rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2.5 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#EEC37D]" />
              <h3 className="text-xs font-bold text-[#FDF2E5]">Change Admin Authorization Password</h3>
            </div>
            <p className="text-[11px] text-[#E1DAE9]/60 mb-4">
              Current password: <code className="text-[#EEC37D] font-mono px-1.5 py-0.5 bg-[#1E0D33] rounded">{adminPassword}</code>
            </p>

            {passNotice && (
              <div className="mb-3 p-2.5 bg-[#4C1B56] border border-[#EEC37D]/30 rounded-xl text-[#FDF2E5] text-xs">
                ✓ {passNotice}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="flex gap-2">
              <input
                type="text"
                required
                value={newAdminPass}
                onChange={e => setNewAdminPass(e.target.value)}
                placeholder="Enter new admin password"
                className="flex-1 px-3 py-2 bg-[#1E0D33] border border-[#EEC37D]/20 rounded-xl text-xs text-[#FDF2E5] outline-none focus:border-[#EEC37D]"
              />
              <button
                type="submit"
                className="px-4 py-2 btn-gold-primary text-xs font-bold shadow-sm cursor-pointer"
              >
                Update Password
              </button>
            </form>
          </div>

          {/* Firebase Connection Status */}
          <div className="samavaya-card rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2.5 mb-3">
              <Database className="w-4 h-4 text-[#EEC37D]" />
              <h3 className="text-xs font-bold text-[#FDF2E5]">Firebase Connection</h3>
            </div>

            <div className="p-3 bg-[#1E0D33]/80 border border-[#EEC37D]/20 rounded-xl text-xs space-y-1 mb-4">
              <p className="text-[#E1DAE9]">
                Status: {isFirebaseActive ? (
                  <span className="text-emerald-400 font-bold">● Connected to quiz-jose-92227</span>
                ) : (
                  <span className="text-[#EEC37D] font-bold">● Local Fallback Mode</span>
                )}
              </p>
              <p className="text-[#E1DAE9]/60 font-mono text-[11px]">
                Project ID: {fbConfig.projectId || "quiz-jose-92227"}
              </p>
            </div>

            <p className="text-[11px] text-[#E1DAE9]/60">
              The Firebase configuration supplied has been embedded and connects your tournament live to Google Cloud Firestore.
            </p>
          </div>
        </div>
      )}

      {/* QUESTION EDIT / ADD MODAL */}
      {isQuestionModalOpen && editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E0D33]/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#31124A] border border-[#EEC37D]/30 rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] p-6 text-xs">
            <h3 className="text-sm font-bold text-gold-gradient mb-4 font-serif">
              {editingQuestion.id ? `Edit Question (Level ${editingQuestion.level})` : 'New Question'}
            </h3>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-[#E1DAE9]/70 mb-1">Question Text</label>
                <textarea
                  required
                  rows={3}
                  value={editingQuestion.question}
                  onChange={e => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1E0D33] border border-[#EEC37D]/20 rounded-xl text-[#FDF2E5] outline-none focus:border-[#EEC37D]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[#E1DAE9]/70">Options & Correct Answer</label>
                {editingQuestion.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={editingQuestion.correctAnswer === i}
                      onChange={() => setEditingQuestion({ ...editingQuestion, correctAnswer: i })}
                      className="text-[#EEC37D] cursor-pointer"
                    />
                    <span className="font-mono font-bold text-[#EEC37D] w-5">
                      {String.fromCharCode(65 + i)}:
                    </span>
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={e => {
                        const newOpts = [...editingQuestion.options];
                        newOpts[i] = e.target.value;
                        setEditingQuestion({ ...editingQuestion, options: newOpts });
                      }}
                      className="flex-1 px-3 py-2 bg-[#1E0D33] border border-[#EEC37D]/20 rounded-xl text-[#FDF2E5] outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#E1DAE9]/70 mb-1">Prize Tag</label>
                  <input
                    type="text"
                    value={editingQuestion.prize}
                    onChange={e => setEditingQuestion({ ...editingQuestion, prize: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1E0D33] border border-[#EEC37D]/20 rounded-xl text-[#FDF2E5] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#E1DAE9]/70 mb-1">Time Limit (Seconds)</label>
                  <input
                    type="number"
                    value={editingQuestion.timeLimit || 30}
                    onChange={e => setEditingQuestion({ ...editingQuestion, timeLimit: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 bg-[#1E0D33] border border-[#EEC37D]/20 rounded-xl text-[#FDF2E5] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#E1DAE9]/70 mb-1">Category</label>
                  <input
                    type="text"
                    value={editingQuestion.category || ''}
                    onChange={e => setEditingQuestion({ ...editingQuestion, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1E0D33] border border-[#EEC37D]/20 rounded-xl text-[#FDF2E5] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#E1DAE9]/70 mb-1">Explanation</label>
                <textarea
                  rows={2}
                  value={editingQuestion.explanation || ''}
                  onChange={e => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1E0D33] border border-[#EEC37D]/20 rounded-xl text-[#FDF2E5] outline-none"
                />
              </div>

              {/* Flip question */}
              <div className="p-3 bg-[#1E0D33]/60 rounded-xl border border-[#EEC37D]/15 space-y-2">
                <span className="font-bold text-[#FBE0A4] block">Backup Flip Question</span>
                <input
                  type="text"
                  placeholder="Alternative question text"
                  value={editingQuestion.flipQuestion?.question || ''}
                  onChange={e => setEditingQuestion({
                    ...editingQuestion,
                    flipQuestion: { ...(editingQuestion.flipQuestion || {}), question: e.target.value }
                  })}
                  className="w-full px-3 py-1.5 bg-[#31124A] border border-[#EEC37D]/20 rounded-lg text-[#FDF2E5] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EEC37D]/15">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-4 py-2 bg-[#1E0D33] text-[#E1DAE9] rounded-xl hover:bg-[#4C1B56] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 btn-gold-primary text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
