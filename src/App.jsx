import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ParticipantView from './components/ParticipantView';
import AdminPanel from './components/AdminPanel';
import AuditoriumView from './components/AuditoriumView';
import LoginModal from './components/LoginModal';
import LeaderboardModal from './components/LeaderboardModal';

import { 
  subscribeGameState, 
  subscribeQuestions, 
  subscribeParticipants, 
  subscribeQuestionResponses,
  subscribeAdminPassword,
  INITIAL_GAME_STATE 
} from './services/quizService';
import { DEFAULT_QUESTIONS } from './data/defaultQuestions';

// Helper to determine route from pathname, hash, or search params
function getRouteFromLocation() {
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();

  if (path.endsWith('/project') || hash.includes('project') || search.includes('page=project')) {
    return 'auditorium'; // Unlocked stage projector screen
  }
  if (path.endsWith('/console') || hash.includes('console') || search.includes('page=console')) {
    return 'admin'; // Admin host console (behind password)
  }
  return 'contestant'; // Default: normal website only shows contestant screen
}

export default function App() {
  const [currentRoute, setCurrentRoute] = useState(getRouteFromLocation);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('kbc_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = localStorage.getItem('kbc_admin_auth');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [adminPassword, setAdminPassword] = useState('98384');
  const [gameState, setGameState] = useState(INITIAL_GAME_STATE);
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [participants, setParticipants] = useState([]);
  const [allResponses, setAllResponses] = useState({});

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  // Listen to browser navigation changes
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentRoute(getRouteFromLocation());
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // 1. Subscribe to Admin Password
  useEffect(() => {
    const unsub = subscribeAdminPassword((pass) => {
      if (pass) setAdminPassword(pass);
    });
    return () => unsub && unsub();
  }, []);

  // 2. Subscribe to real-time Game State
  useEffect(() => {
    const unsub = subscribeGameState((state) => {
      setGameState(state || INITIAL_GAME_STATE);
    });
    return () => unsub && unsub();
  }, []);

  // 3. Subscribe to real-time Questions
  useEffect(() => {
    const unsub = subscribeQuestions((qList) => {
      if (qList && qList.length > 0) {
        setQuestions(qList);
      }
    });
    return () => unsub && unsub();
  }, []);

  // 4. Subscribe to real-time Participants
  useEffect(() => {
    const unsub = subscribeParticipants((usersList) => {
      setParticipants(usersList || []);
      if (currentUser && !currentUser.isAdmin) {
        const found = usersList?.find(u => u.username?.toLowerCase() === currentUser.username?.toLowerCase());
        if (found) {
          setCurrentUser(prev => ({ ...prev, ...found }));
        }
      }
    });
    return () => unsub && unsub();
  }, [currentUser?.username]);

  // 5. Subscribe to responses for current active question
  useEffect(() => {
    const qId = gameState.activeQuestionId || `q-${gameState.currentQuestionIndex + 1}`;
    const unsub = subscribeQuestionResponses(qId, (responses) => {
      setAllResponses(responses || {});
    });
    return () => unsub && unsub();
  }, [gameState.activeQuestionId, gameState.currentQuestionIndex]);

  // Handle Team Login Success
  const handleContestantLoginSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('kbc_active_user', JSON.stringify(user));
    } catch (e) {}
  };

  // Handle Admin Login Success
  const handleAdminLoginSuccess = (user) => {
    setAdminUser(user);
    try {
      localStorage.setItem('kbc_admin_auth', JSON.stringify(user));
    } catch (e) {}
  };

  const handleLogout = () => {
    if (currentRoute === 'admin') {
      setAdminUser(null);
      try {
        localStorage.removeItem('kbc_admin_auth');
      } catch (e) {}
    } else {
      setCurrentUser(null);
      try {
        localStorage.removeItem('kbc_active_user');
      } catch (e) {}
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col samavaya-bg text-[#FDF2E5] selection:bg-[#EEC37D] selection:text-[#1E0D33]">
      <Header
        currentRole={currentRoute}
        currentUser={currentRoute === 'admin' ? adminUser : currentUser}
        onLogout={handleLogout}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
      />

      <main className="flex-1 flex flex-col w-full relative">
        {/* ROUTE 1: DEFAULT / CONTESTANT SCREEN */}
        {currentRoute === 'contestant' && (
          <ParticipantView
            gameState={gameState}
            questions={questions}
            currentUser={currentUser}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            allResponses={allResponses}
          />
        )}

        {/* ROUTE 2: /project (AUDITORIUM / STAGE PROJECTOR - UNLOCKED) */}
        {currentRoute === 'auditorium' && (
          <AuditoriumView
            gameState={gameState}
            questions={questions}
            allResponses={allResponses}
            participants={participants}
          />
        )}

        {/* ROUTE 3: /console (ADMIN HOST CONSOLE - BEHIND CREDENTIALS) */}
        {currentRoute === 'admin' && (
          <>
            {adminUser ? (
              <AdminPanel
                gameState={gameState}
                questions={questions}
                participants={participants}
                allResponses={allResponses}
                adminPassword={adminPassword}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-md w-full p-8 text-center samavaya-card rounded-3xl">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#4C1B56] border border-[#EEC37D]/30 flex items-center justify-center text-[#FBE0A4]">
                    🔒
                  </div>
                  <h3 className="text-lg font-bold text-[#FDF2E5] mb-1 font-serif">
                    Host Console Locked
                  </h3>
                  <p className="text-xs text-[#E1DAE9]/70 mb-5 leading-relaxed">
                    This control panel is restricted to the Josephest 2026 quiz master. Please authenticate with your master authorization key.
                  </p>
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="w-full py-3 btn-gold-primary text-xs font-bold shadow-md cursor-pointer"
                  >
                    Enter Admin Password
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Global Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={currentRoute === 'admin' ? handleAdminLoginSuccess : handleContestantLoginSuccess}
        participants={participants}
        adminPassword={adminPassword}
        role={currentRoute === 'admin' ? 'admin' : 'contestant'}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        participants={participants}
      />
    </div>
  );
}
