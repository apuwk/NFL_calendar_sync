import React, { useState } from 'react';
import FormInput from '../components/login/FormInput';
import LoginButton from '../components/login/LoginButton';
import nflImage from '../assets/E3ooskDXEAYZRMO.jpeg';
import { FaFootballBall, FaEnvelope, FaLock } from 'react-icons/fa';
import { IoWarning } from 'react-icons/io5';

const LoginPage = ({ onLogin, onViewChange }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8000/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        onLogin(data);
      } else {
        setError(data.detail || 'Login failed');
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left side - Login Form */}
      <div className="w-1/3 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          {/* Centered Header with Icon */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <FaFootballBall className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-blue-950 mb-3">NFL Calendar Sync</h1>
            <p className="text-gray-500 text-lg">Keep track of your favorite teams' schedules</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100 
                          text-center transition-all duration-300 
                          hover:border-red-200 flex items-center justify-center gap-2">
              <IoWarning className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <FaEnvelope className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         transition-all duration-200"
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <FaLock className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         transition-all duration-200"
              />
            </div>
            
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium
                         transform transition-all duration-200
                         hover:bg-blue-700 hover:shadow-md
                         active:scale-[0.98] active:shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Login
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => onViewChange('register')}
              className="text-blue-600 transform transition-all duration-200
                         hover:text-blue-800 hover:underline
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                         rounded-lg px-3 py-1"
            >
              Need an account? Register
            </button>
          </div>
        </div>
      </div>

      {/* Right side - Image Background */}
      <div className="w-2/3 relative overflow-hidden group">
        <img
          src={nflImage}
          alt="NFL Player"
          className="object-cover w-full h-full transition-transform duration-700 
                     group-hover:scale-105"
        />
        
        {/* Overlay text with subtle gradient */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t 
                      from-black/80 via-black/40 to-transparent">
          <div className="p-12 transform transition-all duration-300 hover:translate-x-2">
            <h2 className="text-4xl font-bold text-white mb-3 text-shadow-lg">
              Never Miss a Game
            </h2>
            <p className="text-xl text-gray-100 text-shadow">
              Sync your favorite NFL teams' schedules directly to your calendar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add custom text shadow styles
const style = document.createElement('style');
style.textContent = `
  .text-shadow {
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  }
  .text-shadow-lg {
    text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.5);
  }
`;
document.head.appendChild(style);

export default LoginPage;