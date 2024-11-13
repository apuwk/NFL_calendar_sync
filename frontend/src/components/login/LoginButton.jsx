import React from 'react';

const LoginButton = ({ onClick, type = "submit" }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        width: '100%',
        padding: '0.75rem',
        backgroundColor: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease-in-out',
      }}
      onMouseOver={e => e.target.style.backgroundColor = '#1d4ed8'}
      onMouseOut={e => e.target.style.backgroundColor = '#2563eb'}
    >
      Login
    </button>
  );
};

export default LoginButton;