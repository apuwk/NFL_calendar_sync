// pages/ProfilePage.jsx
import React from 'react';
import ProfileSection from '../components/profile/ProfileSection';

const ProfilePage = ({ token }) => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Profile</h1>
        <ProfileSection token={token} />
      </div>
    </div>
  );
};

export default ProfilePage;