import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getNurses,
  saveNurses,
  getFacilities,
  saveFacilities,
  getCohorts,
  saveCohorts,
  getReferrers,
  saveReferrers,
  getCommunityChannels,
  saveCommunityChannels,
  getEvents,
  saveEvents,
  getOutreachTemplates,
  saveOutreachTemplates,
  getPlacements,
  savePlacements,
} from '../lib/storage';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [nurses, setNurses] = useState(() => getNurses());
  const [facilities, setFacilities] = useState(() => getFacilities());
  const [cohorts, setCohorts] = useState(() => getCohorts());
  const [referrers, setReferrers] = useState(() => getReferrers());
  const [communityChannels, setCommunityChannels] = useState(() => getCommunityChannels());
  const [events, setEvents] = useState(() => getEvents());
  const [outreachTemplates, setOutreachTemplates] = useState(() => getOutreachTemplates());
  const [placements, setPlacements] = useState(() => getPlacements());

  // Update functions that write through to localStorage
  const updateNurses = useCallback((updatedNurses) => {
    setNurses(updatedNurses);
    saveNurses(updatedNurses);
  }, []);

  const updateFacilities = useCallback((updatedFacilities) => {
    setFacilities(updatedFacilities);
    saveFacilities(updatedFacilities);
  }, []);

  const updateCohorts = useCallback((updatedCohorts) => {
    setCohorts(updatedCohorts);
    saveCohorts(updatedCohorts);
  }, []);

  const updateReferrers = useCallback((updatedReferrers) => {
    setReferrers(updatedReferrers);
    saveReferrers(updatedReferrers);
  }, []);

  const updateCommunityChannels = useCallback((updatedChannels) => {
    setCommunityChannels(updatedChannels);
    saveCommunityChannels(updatedChannels);
  }, []);

  const updateEvents = useCallback((updatedEvents) => {
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  }, []);

  const updateOutreachTemplates = useCallback((updatedTemplates) => {
    setOutreachTemplates(updatedTemplates);
    saveOutreachTemplates(updatedTemplates);
  }, []);

  const updatePlacements = useCallback((updatedPlacements) => {
    setPlacements(updatedPlacements);
    savePlacements(updatedPlacements);
  }, []);

  const value = {
    nurses,
    facilities,
    cohorts,
    referrers,
    communityChannels,
    events,
    outreachTemplates,
    placements,
    updateNurses,
    updateFacilities,
    updateCohorts,
    updateReferrers,
    updateCommunityChannels,
    updateEvents,
    updateOutreachTemplates,
    updatePlacements,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
