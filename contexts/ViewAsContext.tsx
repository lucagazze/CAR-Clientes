import React, { createContext, useContext, useState } from 'react';
import { ClientProfile } from '../services/db';

interface ViewAsContextType {
  viewAsProfile: ClientProfile | null;
  setViewAsProfile: (p: ClientProfile | null) => void;
  isViewingAs: boolean;
}

const ViewAsContext = createContext<ViewAsContextType | undefined>(undefined);

export const ViewAsProvider = ({ children }: { children: React.ReactNode }) => {
  const [viewAsProfile, setViewAsProfile] = useState<ClientProfile | null>(null);

  return (
    <ViewAsContext.Provider value={{
      viewAsProfile,
      setViewAsProfile,
      isViewingAs: viewAsProfile !== null,
    }}>
      {children}
    </ViewAsContext.Provider>
  );
};

export const useViewAs = () => {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error('useViewAs must be used within ViewAsProvider');
  return ctx;
};
