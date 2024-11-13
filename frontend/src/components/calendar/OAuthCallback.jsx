import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the authorization code from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        if (!code) {
          throw new Error('No authorization code received');
        }

        // Send the code to your backend
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/calendar/callback', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          // The code and state are already in the URL, no need to send them
        });

        if (!response.ok) {
          throw new Error('Failed to complete calendar setup');
        }

        // Redirect back to calendar page
        navigate('/calendar', { 
          state: { success: 'Calendar connected successfully!' }
        });
      } catch (err) {
        setError(err.message);
        // Redirect after a short delay if there's an error
        setTimeout(() => {
          navigate('/calendar', { 
            state: { error: 'Failed to connect calendar' }
          });
        }, 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Alert variant="destructive">
          {error}
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
      <p className="ml-2">Setting up your calendar...</p>
    </div>
  );
};

export default OAuthCallback;