import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ProfileSection = ({ token }) => {
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch user profile
        const profileResponse = await fetch('http://localhost:8000/users/me', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!profileResponse.ok) {
          throw new Error('Failed to fetch profile');
        }

        const profileData = await profileResponse.json();
        setUser(profileData);
        setEditForm(prev => ({ ...prev, name: profileData.name }));

        // Fetch teams data
        const teamsResponse = await fetch('http://localhost:8000/users/me/teams', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          const allTeamsResponse = await fetch('http://localhost:8000/teams', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (allTeamsResponse.ok) {
            const allTeamsData = await allTeamsResponse.json();
            const teamsList = Object.entries(allTeamsData).map(([id, name]) => ({ id, name }));
            setTeams(teamsList);
            setUser(prev => ({ ...prev, favorite_teams: teamsData.teams || [] }));
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Details */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              Profile Settings
            </CardTitle>
            <button
              onClick={() => setIsEditing(true)}
              className="text-blue-600 hover:text-blue-700"
            >
              Edit Profile
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4 bg-green-50 text-green-700">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-500">Email</span>
              <p className="mt-1 text-lg font-medium">{user?.email}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Name</span>
              <p className="mt-1 text-lg font-medium">{user?.name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Google Calendar Status</h3>
              <p className="text-sm text-gray-500">
                {user?.google_calendar_connected ? 'Connected' : 'Not connected'}
              </p>
            </div>
            <button
              onClick={() => handleCalendarSetup()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md 
                       hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span>📅</span>
              Connect Calendar
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Favorite Teams */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">🏈</span>
            Favorite Teams
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user?.favorite_teams?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {user.favorite_teams.map(teamId => {
                const team = teams.find(t => t.id === teamId);
                return team ? (
                  <div
                    key={teamId}
                    className="p-4 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <span className="font-medium">{team.name}</span>
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              No favorite teams selected
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSection;