import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * ResearchContext - Frames all dashboard interactions around a research question.
 * Supports reproducibility: save/load analysis states with cohort definition and filters.
 * 
 * Design principle: "An interactive methods section of a biomedical AI paper"
 */

const STORAGE_KEY = 'research-analysis-state';
const MAX_SAVED_STATES = 10;

const defaultResearchState = {
  researchQuestion: 'How does AI-derived risk stratification compare to traditional Gleason/PSA-based risk in predicting biochemical recurrence?',
  outcomeVariable: 'biochemical_recurrence',
  outcomeOptions: [
    { value: 'biochemical_recurrence', label: 'Biochemical recurrence' },
    { value: 'progression', label: 'Clinical progression' },
    { value: 'psa_rise', label: 'PSA rise' },
    { value: 'treatment_response', label: 'Treatment response' },
    { value: 'mortality', label: 'Mortality' },
  ],
  cohortDefinition: {
    inclusion: [
      'Histologically confirmed prostate adenocarcinoma',
      'Complete baseline PSA and Gleason score',
      'Minimum 12 months follow-up',
    ],
    exclusion: [
      'Prior androgen deprivation therapy',
      'Metastatic disease at diagnosis',
      'Missing key covariates',
    ],
  },
  baselineComparator: 'gleason_psa_nomogram',
  baselineOptions: [
    { value: 'gleason_psa_nomogram', label: 'Gleason + PSA nomogram' },
    { value: 'd_amico', label: 'D\'Amico risk groups' },
    { value: 'capra', label: 'CAPRA score' },
    { value: 'mskcc', label: 'MSKCC nomogram' },
  ],
  filters: {},
  modelVersion: 'v1.0.0',
  createdAt: new Date().toISOString(),
};

const ResearchContext = createContext();

export const ResearchProvider = ({ children }) => {
  const [researchState, setResearchState] = useState(() => {
    if (typeof window === 'undefined') return defaultResearchState;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved.length > 0) {
        const parsed = JSON.parse(saved);
        return { ...defaultResearchState, ...parsed };
      }
    } catch (e) {
      console.warn('Could not load saved research state:', e);
    }
    return defaultResearchState;
  });

  const [savedStates, setSavedStates] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}-saved`);
      return saved && saved.length > 0 ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [insights, setInsights] = useState([]);

  const updateResearchState = useCallback((updates) => {
    setResearchState((prev) => {
      const next = { ...prev, ...updates, updatedAt: new Date().toISOString() };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Could not persist research state:', e);
      }
      return next;
    });
  }, []);

  const saveAnalysisState = useCallback((name) => {
    const stateToSave = {
      id: Date.now(),
      name: name || `Analysis ${new Date().toLocaleDateString()}`,
      ...researchState,
      savedAt: new Date().toISOString(),
    };
    setSavedStates((prev) => {
      const next = [stateToSave, ...prev].slice(0, MAX_SAVED_STATES);
      try {
        localStorage.setItem(`${STORAGE_KEY}-saved`, JSON.stringify(next));
      } catch (e) {
        console.warn('Could not save analysis state:', e);
      }
      return next;
    });
    return stateToSave;
  }, [researchState]);

  const loadAnalysisState = useCallback((state) => {
    setResearchState({
      ...defaultResearchState,
      ...state,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const addInsight = useCallback((insight) => {
    setInsights((prev) => [
      {
        id: Date.now(),
        text: insight.text || insight,
        timestamp: new Date().toISOString(),
        context: insight.context || null,
      },
      ...prev,
    ]);
  }, []);

  const removeInsight = useCallback((id) => {
    setInsights((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearInsights = useCallback(() => setInsights([]), []);

  const getExportMetadata = useCallback(() => ({
    researchQuestion: researchState.researchQuestion,
    outcomeVariable: researchState.outcomeVariable,
    baselineComparator: researchState.baselineComparator,
    cohortDefinition: researchState.cohortDefinition,
    modelVersion: researchState.modelVersion,
    exportDate: new Date().toISOString(),
  }), [researchState]);

  return (
    <ResearchContext.Provider
      value={{
        researchState,
        updateResearchState,
        savedStates,
        saveAnalysisState,
        loadAnalysisState,
        insights,
        addInsight,
        removeInsight,
        clearInsights,
        getExportMetadata,
        defaultResearchState,
      }}
    >
      {children}
    </ResearchContext.Provider>
  );
};

export const useResearch = () => {
  const context = useContext(ResearchContext);
  if (!context) {
    throw new Error('useResearch must be used within a ResearchProvider');
  }
  return context;
};
