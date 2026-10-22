import React, { useState } from 'react';
import { X, Lock, User, KeyRound, ShieldCheck } from 'lucide-react';
import sjcLogo from '../assets/sjc-logo.png';
import { sounds } from '../utils/soundEffects';

export default function LoginModal({ 
  isOpen, 
  onClose, 
  onLoginSuccess, 
  participants = [], 
  adminPassword,
  role = 'contestant' // 'contestant' | 'admin'
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleContestantLogin = (e) => {
    e?.preventDefault();
    setError('');

    const trimmedUser = username.trim().toLowerCase();
    const found = participants.find(
      p => p.username.toLowerCase() === trimmedUser && p.password === password
    );

    if (found) {
      sounds.playCorrect();
      onLoginSuccess({
        ...found,
        isAdmin: false
      });
      onClose();
    } else {
      sounds.playWrong();
      setError('Invalid team username or password. Team credentials must be issued by the fest admin.');
    }
  };

  const handleAdminLogin = (e) => {
    e?.preventDefault();
    setError('');

    if (adminPassInput === adminPassword) {
      sounds.playCorrect();
      onLoginSuccess({
        username: 'admin',
        displayName: 'Host / Admin',
        isAdmin: true,
        college: "St. Joseph's College"
      });
      onClose();
    } else {
      sounds.playWrong();
      setError('Incorrect admin authorization password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E0D33]/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#31124A] border border-[#EEC37D]/30 rounded-3xl shadow-[0_16px_50px_rgba(14,5,25,0.7)] overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-[#1E0D33]/60 text-[#E1DAE9] hover:text-[#FDF2E5] hover:bg-[#4C1B56] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-4 text-center border-b border-[#EEC37D]/15">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#EEC37D] via-[#D27D4F] to-[#4C1B56] p-[1.5px] mb-3 shadow-md">
            <div className="w-full h-full rounded-2xl bg-[#1E0D33] p-1.5 flex items-center justify-center overflow-hidden">
              <img 
                src={sjcLogo} 
                alt="St. Joseph's College Crest" 
                className="w-full h-full object-contain filter drop-shadow" 
              />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gold-gradient font-serif">Josephest 2026</h2>
          <p className="text-xs text-[#FBE0A4] font-medium mt-0.5">St. Joseph's College, Allahabad</p>
          <p className="text-[11px] text-[#E1DAE9]/70 mt-1">
            {role === 'admin' ? "Host Console Authentication" : "Team Hot Seat Login"}
          </p>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-[#4C1B56]/80 border border-[#B00070]/60 rounded-xl text-[#F9E8E0] text-xs flex items-center gap-2">
              <span className="font-bold text-[#EEC37D]">Notice:</span> {error}
            </div>
          )}

          {role === 'contestant' ? (
            <form onSubmit={handleContestantLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#E1DAE9] mb-1.5">
                  Team Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#EEC37D]/50">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter assigned team username"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#1E0D33]/80 border border-[#EEC37D]/20 focus:border-[#EEC37D] rounded-xl text-sm text-[#FDF2E5] placeholder-[#E1DAE9]/30 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#E1DAE9] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#EEC37D]/50">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter assigned password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#1E0D33]/80 border border-[#EEC37D]/20 focus:border-[#EEC37D] rounded-xl text-sm text-[#FDF2E5] placeholder-[#E1DAE9]/30 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 btn-gold-primary text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Enter Hot Seat</span>
              </button>

              <div className="pt-3 border-t border-[#EEC37D]/15 text-center">
                <p className="text-[11px] text-[#E1DAE9]/60">
                  Accounts are provisioned solely by the Josephest Admin. Contact the event coordinator if you need team credentials.
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#E1DAE9] mb-1.5">
                  Host Master Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#EEC37D]/50">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={adminPassInput}
                    onChange={(e) => setAdminPassInput(e.target.value)}
                    placeholder="Enter admin password (default: 98384)"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#1E0D33]/80 border border-[#EEC37D]/20 focus:border-[#EEC37D] rounded-xl text-sm text-[#FDF2E5] placeholder-[#E1DAE9]/30 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 btn-gold-primary text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Unlock Host Control Console</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
