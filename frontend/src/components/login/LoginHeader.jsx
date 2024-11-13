import React from 'react';
import { Football } from 'lucide-react';

const LoginHeader = () => {
  return (
    <div>
      <div style={{
        textAlign: 'center',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          backgroundColor: '#2563eb',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem auto'
        }}>
          <Football size={30} color="white" />
        </div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '0.5rem'
        }}>NFL Calendar Sync</h1>
        <p style={{
          fontSize: '14px',
          color: '#6b7280'
        }}>Keep track of your favorite teams' schedules</p>
      </div>
      
      <h2 style={{
        marginBottom: '1rem',
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#374151'
      }}>Login</h2>
    </div>
  );
};

export default LoginHeader;