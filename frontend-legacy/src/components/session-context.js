// context/session-context.js
'use client'; // Needed because Context uses state

import { createContext, useContext, useState } from 'react';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [sessionValue, setSessionValue] = useState(null);

  return (
    <SessionContext.Provider value={{ sessionValue, setSessionValue }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
