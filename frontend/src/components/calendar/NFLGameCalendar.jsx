import React, { useState } from 'react';
import { Card } from '@/components/ui/card';

const NFLGameCalendar = ({ games }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };
  
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const formatGameTime = (dateStr, timeStr) => {
    const utcDateTime = new Date(Date.UTC(
      parseInt(dateStr.slice(0, 4)),
      parseInt(dateStr.slice(5, 7)) - 1,
      parseInt(dateStr.slice(8, 10)),
      parseInt(timeStr.slice(0, 2)),
      parseInt(timeStr.slice(3, 5))
    ));

    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(utcDateTime);
  };
  
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const monthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  
  const monthGames = games.filter(game => {
    const gameDate = new Date(Date.UTC(
      parseInt(game.game_date.slice(0, 4)),
      parseInt(game.game_date.slice(5, 7)) - 1,
      parseInt(game.game_date.slice(8, 10)),
      parseInt(game.game_time.slice(0, 2)),
      parseInt(game.game_time.slice(3, 5))
    ));
    
    const pstDate = new Date(gameDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    return pstDate.getMonth() === currentDate.getMonth() && 
           pstDate.getFullYear() === currentDate.getFullYear();
  });
  
  const getGamesForDay = (day) => {
    return monthGames.filter(game => {
      const gameDate = new Date(Date.UTC(
        parseInt(game.game_date.slice(0, 4)),
        parseInt(game.game_date.slice(5, 7)) - 1,
        parseInt(game.game_date.slice(8, 10)),
        parseInt(game.game_time.slice(0, 2)),
        parseInt(game.game_time.slice(3, 5))
      ));
      
      const pstDate = new Date(gameDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
      return pstDate.getDate() === day;
    });
  };
  
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="h-32 bg-gray-50" />);
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayGames = getGamesForDay(day);
    calendarDays.push(
      <div 
        key={day} 
        className={`h-32 border border-gray-200 p-1
          ${dayGames.length > 0 ? 'bg-blue-50' : ''}`}
      >
        <div className="font-medium text-sm mb-1">{day}</div>
        <div className={`overflow-y-auto max-h-24 space-y-1`}>
          {dayGames.map((game) => (
            <div
              key={game.game_id}
              className="bg-white rounded shadow-sm border border-blue-100 p-1"
            >
              <div className="text-xs whitespace-normal">
                <div className="font-medium">
                  {game.teams.away.name} @ {game.teams.home.name}
                </div>
                <div className="text-gray-500">
                  {formatGameTime(game.game_date, game.game_time)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-white p-4">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
        >
          {'←'}
        </button>
        <h2 className="text-xl font-semibold">{monthYear}</h2>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
        >
          {'→'}
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-px mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-medium text-gray-500 text-sm py-2">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-px bg-gray-200 overflow-x-auto">
        {calendarDays}
      </div>
    </Card>
  );
};

export default NFLGameCalendar;