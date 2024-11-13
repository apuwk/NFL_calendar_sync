import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaCalendarAlt, 
  FaGoogle, 
  FaBell,
} from 'react-icons/fa';

const HomePage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <FaCalendarAlt className="w-6 h-6 text-blue-600" />,
      title: "Personalized Schedule",
      description: "Select your favorite NFL teams and get their complete game schedules in one place."
    },
    {
      icon: <FaGoogle className="w-6 h-6 text-blue-600" />,
      title: "Google Calendar Integration",
      description: "Seamlessly sync games to your Google Calendar with just one click."
    },
    {
      icon: <FaBell className="w-6 h-6 text-blue-600" />,
      title: "Game Reminders",
      description: "Never miss a game with customizable notifications and reminders."
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-blue-600 text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Never Miss Another NFL Game
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Keep track of your favorite NFL teams' schedules and sync them directly to your calendar
            </p>
            <button
              onClick={() => navigate('/teams')}
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-medium
                     hover:bg-blue-50 transition-colors duration-200 text-lg"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;