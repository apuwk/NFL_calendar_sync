import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChevronDown } from 'lucide-react';

const UpcomingGamesSection = ({ games, teams, token }) => {
  const [selectedTeamId, setSelectedTeamId] = useState('all');
  const [userTeams, setUserTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's favorite teams
  useEffect(() => {
    const fetchUserTeams = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('http://localhost:8000/users/me/teams', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user teams');
        }
        
        const data = await response.json();
        const userTeamIds = data.teams || [];
        
        // Map team IDs to full team objects with error checking
        const userTeamsWithNames = userTeamIds
          .map(teamId => {
            const team = teams.find(t => t.id === teamId);
            if (!team) {
              console.warn(`Team with ID ${teamId} not found in teams list`);
            }
            return team;
          })
          .filter(Boolean); // Remove any undefined entries
        
        setUserTeams(userTeamsWithNames);
        
        // Only set default selection if we actually have teams
        if (userTeamsWithNames.length > 0 && selectedTeamId === 'all') {
          setSelectedTeamId('all');
        }
      } catch (err) {
        console.error('Failed to fetch user teams:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (token && teams.length > 0) {
      fetchUserTeams();
    }
  }, [token, teams]);

  // Filter out past games and convert dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Format games data with timezone conversion
  const formatGames = games.map(game => {
    const utcDateTime = new Date(Date.UTC(
      parseInt(game.game_date.slice(0, 4)),
      parseInt(game.game_date.slice(5, 7)) - 1,
      parseInt(game.game_date.slice(8, 10)),
      parseInt(game.game_time.slice(0, 2)),
      parseInt(game.game_time.slice(3, 5))
    ));

    return {
      ...game,
      dateTime: utcDateTime
    };
  });

  // Filter and sort games
  const futureGames = formatGames.filter(game => game.dateTime > today);
  const sortedGames = futureGames.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

  // Filter games by selected team with proper type checking
  const filteredGames = selectedTeamId === 'all'
    ? sortedGames.filter(game => {
        const gameTeamIds = [
          game.teams.home.id.toString(),
          game.teams.away.id.toString()
        ];
        return userTeams.some(team => gameTeamIds.includes(team.id));
      })
    : sortedGames.filter(game => {
        const gameTeamIds = [
          game.teams.home.id.toString(),
          game.teams.away.id.toString()
        ];
        return gameTeamIds.includes(selectedTeamId);
      });

  // Format date and time in PST
  const formatDateTime = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'long',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow">
        <CardHeader>
          <CardTitle>Upcoming Games</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow">
      <CardHeader>
        <CardTitle>Upcoming Games</CardTitle>
      </CardHeader>
      <CardContent>
        {userTeams.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No favorite teams selected. Please select teams to view their games.
          </p>
        ) : (
          <>
            {/* Team Selector */}
            <div className="relative mb-4">
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg appearance-none
                       bg-white pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Favorite Teams</option>
                {userTeams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>

            {/* Games List */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {filteredGames.length > 0 ? (
                filteredGames.map(game => (
                  <div 
                    key={game.game_id} 
                    className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors"
                  >
                    <div className="font-medium">
                      {game.teams.away.name} @ {game.teams.home.name}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {formatDateTime(game.dateTime)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Week {game.week}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No upcoming games found for selected team
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingGamesSection;