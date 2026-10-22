import React, { useState } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  User, 
  Wifi, 
  WifiOff, 
  LogOut,
  Trophy
} from 'lucide-react';
import sjcLogo from '../assets/sjc-logo.png';
import { sounds } from '../utils/soundEffects';
import { isFirebaseActive } from '../services/firebaseConfig';

export default function Header({ 
  currentRole, 
  currentUser, 
  onLogout, 
  onOpenLogin,
  onOpenLeaderboard
}) {
  const [isMuted, setIsMuted] = useState(!sounds.enabled);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleSound = () => {
    const enabled = sounds.toggleSound();
    setIsMuted(!enabled);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <header className="w-full bg-[#1E0D33]/90 backdrop-blur-md border-b border-[#EEC37D]/20 px-4 py-2.5 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand / Logo with St. Joseph's College Crest */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-[#EEC37D] via-[#D27D4F] to-[#4C1B56] p-[1.5px] shadow-md">
            <div className="w-full h-full rounded-2xl bg-[#1E0D33] p-1 flex items-center justify-center overflow-hidden">
              <img 
                src={sjcLogo} 
                alt="St. Joseph's College Crest" 
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold tracking-tight text-gold-gradient font-serif">
                Josephest 2026
              </h1>
              {currentRole === 'contestant' && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#4C1B56] text-[#FBE0A4] border border-[#EEC37D]/25 rounded-md">
                  KBC Quiz
                </span>
              )}
              {currentRole === 'auditorium' && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#8B4A5A] text-[#FDF2E5] border border-[#EEC37D]/25 rounded-md">
                  Stage Projector
                </span>
              )}
              {currentRole === 'admin' && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#D27D4F] text-[#1E0D33] font-bold rounded-md">
                  Host Console
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#E1DAE9]/80 flex items-center gap-1.5 font-medium">
              <span>St. Joseph's College, Allahabad</span>
              <span>•</span>
              {isFirebaseActive ? (
                <span className="flex items-center text-emerald-400 gap-1 text-[10px]">
                  <Wifi className="w-2.5 h-2.5" /> Synced
                </span>
              ) : (
                <span className="flex items-center text-[#EEC37D] gap-1 text-[10px]">
                  <WifiOff className="w-2.5 h-2.5" /> Local Sync
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right Tools & User Info */}
        <div className="flex items-center gap-2">
          {/* Leaderboard only visible on contestant and admin, or on demand */}
          <button
            onClick={onOpenLeaderboard}
            className="p-2 rounded-xl bg-[#31124A]/70 border border-[#EEC37D]/20 text-[#EEC37D] hover:bg-[#4C1B56]/70 transition-colors cursor-pointer"
            title="Leaderboard"
          >
            <Trophy className="w-4 h-4" />
          </button>

          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-[#31124A]/70 border border-[#EEC37D]/20 text-[#EEC37D] hover:bg-[#4C1B56]/70 transition-colors cursor-pointer"
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-[#31124A]/70 border border-[#EEC37D]/20 text-[#E1DAE9] hover:text-[#FDF2E5] hover:bg-[#4C1B56]/70 transition-colors cursor-pointer"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* User Account Pill (Only on Contestant screen or Admin) */}
          {currentRole !== 'auditorium' && (
            <>
              {currentUser ? (
                <div className="flex items-center gap-2 pl-2 border-l border-[#EEC37D]/20">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold text-[#FBE0A4] truncate max-w-[120px]">
                      {currentUser.displayName || currentUser.username}
                    </p>
                    <p className="text-[10px] text-[#E1DAE9]/60">
                      {currentUser.isAdmin ? "Host Master" : (currentUser.college || "Team")}
                    </p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="p-2 rounded-xl bg-[#4C1B56]/60 border border-[#8B4A5A]/50 text-[#FDF2E5] hover:bg-[#8B4A5A]/80 transition-colors cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenLogin}
                  className="px-3.5 py-1.5 rounded-xl btn-gold-primary text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Team Login</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
