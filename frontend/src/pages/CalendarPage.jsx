import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLocation } from 'react-router-dom';
import NFLGameCalendar from '../components/calendar/NFLGameCalendar';
import UpcomingGamesSection from '../components/calendar/UpcomingGamesSection';

const CalendarPage = ({ token }) => {
  const [games, setGames] = useState([]);
  const [teams, setTeams] = useState([]);
  const [calendarStatus, setCalendarStatus] = useState({
    isConnected: false,
    lastSync: null,
    calendarId: null
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const location = useLocation();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchCalendarStatus(),
          fetchGames(),
          fetchTeams()
        ]);
      } catch (err) {
        setError('Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Handle OAuth callback and automatic sync
  useEffect(() => {
    const handleSetupAndSync = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const setupStatus = urlParams.get('setup');
      
      if (setupStatus === 'success') {
        try {
          setSyncing(true);
          setError('');
          
          // First ensure calendar status is updated
          await fetchCalendarStatus();
          
          // Then automatically trigger sync
          const syncResponse = await fetch('http://localhost:8000/calendar/sync', {
            method: 'POST',
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!syncResponse.ok) {
            throw new Error('Calendar sync failed');
          }

          const syncData = await syncResponse.json();
          setSuccess(`Calendar connected and ${syncData.synced_games_count} games synced successfully!`);
          
          // Refresh calendar status one final time to show latest sync time
          await fetchCalendarStatus();
        } catch (err) {
          console.error('Setup and sync error:', err);
          setError('Calendar connected but sync failed. Please try syncing manually.');
        } finally {
          setSyncing(false);
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else if (setupStatus === 'failed') {
        setError('Failed to connect calendar');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleSetupAndSync();
  }, [location]);

  const fetchCalendarStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/calendar/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch calendar status');
      }
      const data = await response.json();
      setCalendarStatus({
        isConnected: data.is_connected,
        lastSync: data.last_sync,
        calendarId: data.calendar_id
      });
    } catch (err) {
      console.error('Error fetching calendar status:', err);
    }
  };

  const fetchGames = async () => {
    try {
      const response = await fetch('http://localhost:8000/games/my-teams', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }
      const data = await response.json();
      setGames(data.games || []);
    } catch (err) {
      console.error('Error fetching games:', err);
      setError('Failed to fetch games');
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch('http://localhost:8000/teams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      const data = await response.json();
      setTeams(Object.entries(data).map(([id, name]) => ({ id, name })));
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError('Failed to load teams');
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      setError('');
      setSuccess('');
      
      const response = await fetch('http://localhost:8000/calendar/sync', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to sync calendar');
      }

      const data = await response.json();
      setSuccess(`Successfully synced ${data.synced_games_count} games`);
      await fetchCalendarStatus();
    } catch (err) {
      console.error('Sync error:', err);
      setError('Failed to sync calendar');
    } finally {
      setSyncing(false);
    }
  };

  const handleCalendarConnect = async () => {
    try {
      const response = await fetch('http://localhost:8000/calendar/auth', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to start calendar authorization');
      }
      
      const data = await response.json();
      window.location.href = data.authorization_url;
    } catch (err) {
      console.error('Calendar connection error:', err);
      setError('Failed to start calendar authorization');
    }
  };

  const formatLastSync = (syncData) => {
    if (!syncData) return 'Never synced';
    const date = new Date(syncData.timestamp);
    return `Last synced ${date.toLocaleDateString()} ${date.toLocaleTimeString()} (${syncData.games_synced} games)`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Game Calendar</h1>
          <p className="mt-2 text-gray-600">View and manage your NFL game schedule</p>
        </div>

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

        <div className="grid gap-6">
          {/* Calendar Integration Card */}
          <Card className="bg-white shadow">
            <CardHeader>
              <CardTitle>Calendar Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">
                    {calendarStatus.isConnected ? 'Google Calendar Connected' : 'Connect Your Calendar'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {calendarStatus.isConnected
                      ? formatLastSync(calendarStatus.lastSync)
                      : 'Connect your Google Calendar to sync NFL games.'}
                  </p>
                </div>
                <button
                  onClick={calendarStatus.isConnected ? handleManualSync : handleCalendarConnect}
                  disabled={syncing}
                  className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2
                    ${syncing 
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {syncing ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      Syncing...
                    </>
                  ) : (
                    <>
                      📅 {calendarStatus.isConnected ? 'Sync Calendar' : 'Connect Calendar'}
                    </>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Calendar View */}
          <NFLGameCalendar games={games} />

          {/* Upcoming Games Section */}
          <UpcomingGamesSection 
            games={games} 
            teams={teams} 
            token={token} 
          />
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;