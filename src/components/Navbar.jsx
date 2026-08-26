import React from 'react';
import { ArrowRight, RefreshCw, Check, LogOut, User } from 'lucide-react';

export default function Navbar({ currentStep, setCurrentStep, selectedSourcesCount, onReset, user, onLogout }) {
  const steps = [
    { id: 1, name: "1. Select Data (Page 1)" },
    { id: 2, name: "2. Train Models (Page 2)" },
    { id: 3, name: "3. View Results (Page 3)" },
    { id: 4, name: "4. AI Architecture" },
  ];

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-purple-100 sticky top-0 z-40 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentStep(1)}>
            <div className="border border-purple-200 px-3 py-1 rounded-xl bg-purple-50 flex items-center space-x-1">
              <span className="font-extrabold text-sm text-orange-600">SFL</span>
              <span className="text-[10px] font-bold text-[#3b0764] hidden sm:inline">SATIN BRE</span>
            </div>
            <span className="font-extrabold text-base text-[#3b0764] hidden md:inline">
              Data & Risk Platform
            </span>
          </div>

          {/* Stepper */}
          <nav className="flex items-center space-x-1.5 sm:space-x-3">
            {steps.map((step, idx) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <React.Fragment key={step.id}>
                  {idx > 0 && <ArrowRight className="w-3.5 h-3.5 text-purple-300" />}
                  <button
                    onClick={() => setCurrentStep(step.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-linear-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20'
                        : isCompleted
                        ? 'bg-purple-100 text-[#3b0764] hover:bg-purple-200'
                        : 'text-slate-500 hover:text-[#3b0764] hover:bg-purple-50'
                    }`}
                  >
                    {isCompleted && <Check className="w-3 h-3 stroke-3" />}
                    <span>{step.name}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </nav>

          {/* User Profile & Reset */}
          <div className="flex items-center space-x-3">
            <span className="text-xs text-purple-700 font-mono hidden sm:inline font-semibold">
              {selectedSourcesCount} / 11 Selected
            </span>

            {user && (
              <div className="hidden lg:flex items-center space-x-1.5 text-xs text-[#3b0764] font-semibold bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-xl">
                <User className="w-3.5 h-3.5 text-purple-600" />
                <span className="truncate max-w-25">{user.email.split('@')[0]}</span>
              </div>
            )}

            <button
              onClick={onReset}
              title="Reset Selection"
              className="p-2 rounded-xl bg-purple-50 text-[#3b0764] hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Logout"
                className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
