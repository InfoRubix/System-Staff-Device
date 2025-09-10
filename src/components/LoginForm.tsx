'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const success = login(username, password);
    if (!success) {
      setError('Invalid credentials. Use admin/admin123');
    }
  };

  const handleLoginClick = () => {
    setShowForm(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 animate-gradient-x">
      {/* Floating Emojis */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="animate-float-slow absolute top-20 left-10 text-3xl">💻</div>
        <div className="animate-float-medium absolute top-40 right-20 text-2xl">✨</div>
        <div className="animate-float-fast absolute bottom-32 left-20 text-3xl">🌟</div>
        <div className="animate-float-slow absolute top-60 left-1/2 text-2xl">💫</div>
        <div className="animate-float-medium absolute bottom-20 right-10 text-3xl">🎯</div>
        <div className="animate-float-fast absolute top-32 right-1/3 text-2xl">🚀</div>
        <div className="animate-float-slow absolute bottom-40 left-1/3 text-2xl">⭐</div>
      </div>

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm mx-auto">
          <div className="relative perspective-1000">
            <div className={`relative w-full transition-transform duration-700 transform-style-preserve-3d ${showForm ? 'rotate-y-180' : ''}`}>
              
              {/* Front - Login Button */}
              <div className="backface-hidden">
                <div className="text-center space-y-6 animate-fade-in">
                  <div className="space-y-4">
                    <h1 className="text-4xl font-bold text-gray-800 animate-bounce-slow">
                      Device Manager
                    </h1>
                    <p className="text-lg text-gray-600 animate-slide-up">
                      Welcome to our cute admin portal! 🌈
                    </p>
                  </div>
                  
                  <button
                    onClick={handleLoginClick}
                    className="group relative bg-gradient-to-r from-pink-300 to-pink-400 hover:from-pink-400 hover:to-pink-500 text-white font-semibold py-4 px-8 rounded-full shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl animate-pulse-soft"
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <span className="text-2xl animate-bounce">🔐</span>
                      <span className="text-xl">Login to Magic Portal</span>
                      <span className="text-2xl animate-bounce delay-100">✨</span>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-pink-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-shimmer"></div>
                  </button>
                </div>
              </div>

              {/* Back - Login Form */}
              <div className="absolute inset-0 backface-hidden rotate-y-180">
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20 animate-fade-in">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      Admin Portal 🎯
                    </h2>
                    <p className="text-sm text-gray-600">
                      Enter your magical credentials
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-purple-200 rounded-2xl focus:border-purple-400 focus:outline-none transition-all duration-300 placeholder-gray-400 bg-white/70 backdrop-blur-sm"
                          placeholder="✨ Username"
                        />
                      </div>
                      <div className="relative">
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-purple-200 rounded-2xl focus:border-purple-400 focus:outline-none transition-all duration-300 placeholder-gray-400 bg-white/70 backdrop-blur-sm"
                          placeholder="🔑 Password"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="text-red-500 text-sm text-center p-2 bg-red-50 rounded-xl animate-shake">
                        {error}
                      </div>
                    )}

                    <div className="space-y-3">
                      <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-300 to-purple-400 hover:from-purple-400 hover:to-purple-500 text-white font-semibold py-3 px-4 rounded-2xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
                      >
                        <span className="flex items-center justify-center space-x-2">
                          <span>Enter Magic Portal</span>
                          <span className="animate-bounce">🚀</span>
                        </span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="w-full bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 font-medium py-2 px-4 rounded-2xl transition-all duration-300 hover:scale-105"
                      >
                        ← Back to Portal
                      </button>
                    </div>
                  </form>

                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">
                      Hint: admin / admin123 🤫
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-5deg); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(3deg); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-soft {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 8s ease infinite;
        }
        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 4s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: float-fast 3s ease-in-out infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        .animate-pulse-soft {
          animation: pulse-soft 4s ease-in-out infinite;
        }
        .animate-shimmer {
          background-image: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 1s ease-out 0.2s both;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default LoginForm;