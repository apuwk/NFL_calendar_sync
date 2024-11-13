import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, ChevronDown } from 'lucide-react';

const TEAM_MAPPINGS = {
  '1': 'Las Vegas Raiders',
  '2': 'Jacksonville Jaguars',
  '3': 'New England Patriots',
  '4': 'New York Giants',
  '5': 'Baltimore Ravens',
  '6': 'Tennessee Titans',
  '7': 'Detroit Lions',
  '8': 'Atlanta Falcons',
  '9': 'Cleveland Browns',
  '10': 'Cincinnati Bengals',
  '11': 'Arizona Cardinals',
  '12': 'Philadelphia Eagles',
  '13': 'New York Jets',
  '14': 'San Francisco 49ers',
  '15': 'Green Bay Packers',
  '16': 'Chicago Bears',
  '17': 'Kansas City Chiefs',
  '18': 'Washington Commanders',
  '19': 'Carolina Panthers',
  '20': 'Buffalo Bills',
  '21': 'Indianapolis Colts',
  '22': 'Pittsburgh Steelers',
  '23': 'Seattle Seahawks',
  '24': 'Tampa Bay Buccaneers',
  '25': 'Miami Dolphins',
  '26': 'Houston Texans',
  '27': 'New Orleans Saints',
  '28': 'Denver Broncos',
  '29': 'Dallas Cowboys',
  '30': 'Los Angeles Chargers',
  '31': 'Los Angeles Rams',
  '32': 'Minnesota Vikings'
};

// Helper function to format game times
const formatGameDateTime = (dateStr, timeStr) => {
  // Create date object in UTC
  const utcDateTime = new Date(Date.UTC(
    parseInt(dateStr.slice(0, 4)),   // year
    parseInt(dateStr.slice(5, 7)) - 1, // month (0-based)
    parseInt(dateStr.slice(8, 10)),    // day
    parseInt(timeStr.slice(0, 2)),     // hours
    parseInt(timeStr.slice(3, 5))      // minutes
  ));

  // Format the date in PST
  const options = {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };

  return new Intl.DateTimeFormat('en-US', options).format(utcDateTime);
};

const TeamPreviewPanel = ({ 
  selectedTeams, 
  teams,
  upcomingGames,
  onTeamRemove,
  onViewChange 
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState(selectedTeams[0] || '');

  const filteredGames = upcomingGames.filter(game => {
    const gameTeams = [game.teams.home.id.toString(), game.teams.away.id.toString()];
    return gameTeams.includes(selectedTeamId);
  });

  // Sort games by date and time
  const sortedGames = [...filteredGames].sort((a, b) => {
    const dateA = new Date(Date.UTC(
      parseInt(a.game_date.slice(0, 4)),
      parseInt(a.game_date.slice(5, 7)) - 1,
      parseInt(a.game_date.slice(8, 10)),
      parseInt(a.game_time.slice(0, 2)),
      parseInt(a.game_time.slice(3, 5))
    ));
    const dateB = new Date(Date.UTC(
      parseInt(b.game_date.slice(0, 4)),
      parseInt(b.game_date.slice(5, 7)) - 1,
      parseInt(b.game_date.slice(8, 10)),
      parseInt(b.game_time.slice(0, 2)),
      parseInt(b.game_time.slice(3, 5))
    ));
    return dateA - dateB;
  });

  return (
    <div className="space-y-6">
      {/* Selected Teams List */}
      <div className="space-y-2">
        {selectedTeams.map(teamId => {
          const team = teams.find(t => t.id === teamId);
          return (
            <div key={teamId} 
                 className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="font-medium">{team?.name}</span>
              <button
                onClick={() => onTeamRemove(teamId)}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      {/* Team Selector Dropdown */}
      {selectedTeams.length > 0 && (
        <div className="space-y-4">
          <div className="relative">
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg appearance-none
                         bg-white pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a team</option>
              {selectedTeams.map(teamId => {
                const team = teams.find(t => t.id === teamId);
                return (
                  <option key={teamId} value={teamId}>
                    {team?.name}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>

          {/* Upcoming Games */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {selectedTeamId ? (
              sortedGames.length > 0 ? (
                sortedGames.map(game => (
                  <div 
                    key={game.game_id} 
                    className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors"
                  >
                    <div className="font-medium">
                      {game.teams.away.name} @ {game.teams.home.name}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {formatGameDateTime(game.game_date, game.game_time)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {game.week}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No upcoming games found for selected team
                </p>
              )
            ) : (
              <p className="text-gray-500 text-center py-4">
                Select a team to view upcoming games
              </p>
            )}
          </div>
        </div>
      )}

      {/* Continue Button */}
      <button
        onClick={() => onViewChange('calendar')}
        className="w-full mt-6 py-3 bg-blue-600 text-white rounded-lg font-medium
                 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2
                 disabled:bg-gray-300 disabled:cursor-not-allowed"
        disabled={selectedTeams.length === 0}
      >
        Continue to Calendar
      </button>
    </div>
  );
};

const TeamsPage = ({ token, onViewChange }) => {
  const [teams, setTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [upcomingGames, setUpcomingGames] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchTeams();
    fetchUserTeams();
  }, []);

  useEffect(() => {
    if (selectedTeams.length > 0) {
      fetchUpcomingGames();
    } else {
      setUpcomingGames([]);
    }
  }, [selectedTeams]);

  const fetchTeams = async () => {
    try {
      setTeams(Object.entries(TEAM_MAPPINGS).map(([id, name]) => ({ id, name })));
    } catch (err) {
      setError('Failed to load teams');
    }
  };

  const fetchUserTeams = async () => {
    try {
      const response = await fetch('http://localhost:8000/users/me/teams', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setSelectedTeams(data.teams || []);
    } catch (err) {
      setError('Failed to fetch user teams');
    }
  };

  const fetchUpcomingGames = async () => {
    try {
      setIsLoading(true);
      const promises = selectedTeams.map(teamId =>
        fetch(`http://localhost:8000/games/upcoming?team_id=${teamId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => res.json())
      );
      
      const results = await Promise.all(promises);
      const allGames = results.flatMap(result => result.games || []);
      
      // Remove duplicates based on game_id
      const uniqueGames = Array.from(new Map(allGames.map(game => [game.game_id, game])).values());
      
      // Sort by UTC date and time
      const sortedGames = uniqueGames.sort((a, b) => {
        const dateA = new Date(Date.UTC(
          parseInt(a.game_date.slice(0, 4)),
          parseInt(a.game_date.slice(5, 7)) - 1,
          parseInt(a.game_date.slice(8, 10)),
          parseInt(a.game_time.slice(0, 2)),
          parseInt(a.game_time.slice(3, 5))
        ));
        const dateB = new Date(Date.UTC(
          parseInt(b.game_date.slice(0, 4)),
          parseInt(b.game_date.slice(5, 7)) - 1,
          parseInt(b.game_date.slice(8, 10)),
          parseInt(b.game_time.slice(0, 2)),
          parseInt(b.game_time.slice(3, 5))
        ));
        return dateA - dateB;
      });

      setUpcomingGames(sortedGames);
    } catch (err) {
      setError('Failed to fetch upcoming games');
    } finally {
      setIsLoading(false);
    }
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
      setSuccess('Teams updated successfully!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Failed to update teams');
    }
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Select Your Teams</h1>
          <p className="mt-2 text-gray-600">
            Choose the NFL teams you want to follow and sync to your calendar
          </p>
        </div>

        {/* Alerts */}
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

        {/* Main Content Grid */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Team Selection */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>NFL Teams</CardTitle>
                  <span className="text-sm text-gray-500">
                    {selectedTeams.length} selected
                  </span>
                </div>
                {/* Search Bar */}
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredTeams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamToggle(team.id)}
                      className={`p-4 rounded-lg border transition-all ${
                        selectedTeams.includes(team.id)
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{team.name}</span>
                        {selectedTeams.includes(team.id) && (
                          <span className="text-blue-500">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-white shadow sticky top-4">
              <CardHeader>
                <CardTitle>Selected Teams Preview</CardTitle>
                </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : selectedTeams.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Select teams to see their upcoming games
                  </p>
                ) : (
                  <TeamPreviewPanel
                    selectedTeams={selectedTeams}
                    teams={teams}
                    upcomingGames={upcomingGames}
                    onTeamRemove={handleTeamToggle}
                    onViewChange={onViewChange}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamsPage;