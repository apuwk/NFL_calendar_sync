import { useState, useEffect } from 'react';
import { Calendar, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const NFLDashboard = ({ token }) => {
  const [teams, setTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [upcomingGames, setUpcomingGames] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      await Promise.all([
        fetchTeams(),
        fetchUserTeams(),
        fetchUpcomingGames()
      ]);
      setLoading(false);
    } catch (err) {
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    const response = await fetch('http://localhost:8000/teams', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setTeams(Object.entries(data).map(([id, name]) => ({ id, name })));
  };

  const fetchUserTeams = async () => {
    const response = await fetch('http://localhost:8000/users/me/teams', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setSelectedTeams(data.teams || []);
  };

  const fetchUpcomingGames = async () => {
    const response = await fetch('http://localhost:8000/games/my-teams', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setUpcomingGames(data.games || []);
  };

  const handleTeamToggle = async (teamId) => {
    const newSelection = selectedTeams.includes(teamId)
      ? selectedTeams.filter(id => id !== teamId)
      : [...selectedTeams, teamId];
    
    try {
      await fetch('http://localhost:8000/users/me/teams', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ team_ids: newSelection }),
      });
      
      setSelectedTeams(newSelection);
      fetchUpcomingGames();
    } catch (err) {
      setError('Failed to update team selection');
    }
  };

  const handleCalendarSync = async () => {
    try {
      setSyncStatus('syncing');
      const response = await fetch('http://localhost:8000/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setSyncStatus('success');
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (err) {
      setSyncStatus('error');
      setError('Failed to sync with calendar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Team Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Your Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleTeamToggle(team.id)}
                  className={`p-4 rounded-lg border transition-all ${
                    selectedTeams.includes(team.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{team.name}</span>
                    {selectedTeams.includes(team.id) && (
                      <Check className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Games */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Games</CardTitle>
            <button
              onClick={handleCalendarSync}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                syncStatus === 'syncing'
                  ? 'bg-blue-100 text-blue-700'
                  : syncStatus === 'success'
                  ? 'bg-green-100 text-green-700'
                  : syncStatus === 'error'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Calendar className="w-5 h-5" />
              )}
              <span>
                {syncStatus === 'syncing'
                  ? 'Syncing...'
                  : syncStatus === 'success'
                  ? 'Synced!'
                  : syncStatus === 'error'
                  ? 'Sync Failed'
                  : 'Sync to Calendar'}
              </span>
            </button>
          </CardHeader>
          <CardContent>
            {upcomingGames.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No upcoming games found. Select your favorite teams to see their schedule.
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingGames.map((game) => (
                  <div
                    key={game.game_id}
                    className="p-4 border rounded-lg hover:border-blue-200 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {game.teams.away.name} @ {game.teams.home.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(game.game_date).toLocaleDateString()} - {game.game_time}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        Week {game.week}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NFLDashboard;