import { useReducer, useCallback } from 'react';

/**
 * Deterministic step state machine for multi-step cryptographic workflows.
 *
 * Key behaviors:
 * - Advancing to step N marks 1..N-1 as complete, N as active
 * - Changing data at step N invalidates N+1..end (no auto-recompute)
 * - Each step's computed data is preserved in state
 * - getStepStatus() returns 'pending' | 'active' | 'complete'
 */

export interface StepState<TStepData = Record<string, unknown>> {
  steps: string[];
  currentStep: number; // index of the active step
  stepData: Record<string, TStepData>; // computed results per step
  inputs: Record<string, unknown>; // user inputs per step
}

type StepAction<TStepData = Record<string, unknown>> =
  | { type: 'ADVANCE'; step: string; data: TStepData }
  | { type: 'INVALIDATE'; fromStep: string }
  | { type: 'SET_INPUT'; step: string; key: string; value: unknown }
  | { type: 'RESET' };

function stepReducer<TStepData>(
  state: StepState<TStepData>,
  action: StepAction<TStepData>
): StepState<TStepData> {
  switch (action.type) {
    case 'ADVANCE': {
      const stepIdx = state.steps.indexOf(action.step);
      if (stepIdx === -1) return state;
      const nextIdx = Math.min(stepIdx + 1, state.steps.length - 1);
      return {
        ...state,
        currentStep: nextIdx,
        stepData: { ...state.stepData, [action.step]: action.data },
      };
    }
    case 'INVALIDATE': {
      const fromIdx = state.steps.indexOf(action.fromStep);
      if (fromIdx === -1) return state;
      // Clear data for fromStep and all subsequent steps
      const newStepData = { ...state.stepData };
      for (let i = fromIdx; i < state.steps.length; i++) {
        delete newStepData[state.steps[i]];
      }
      return {
        ...state,
        currentStep: fromIdx,
        stepData: newStepData,
      };
    }
    case 'SET_INPUT': {
      const stepIdx = state.steps.indexOf(action.step);
      const currentInputs = (state.inputs[action.step] || {}) as Record<string, unknown>;
      const newInputs = {
        ...state.inputs,
        [action.step]: { ...currentInputs, [action.key]: action.value },
      };
      // Invalidate subsequent steps when input changes
      const newStepData = { ...state.stepData };
      for (let i = stepIdx + 1; i < state.steps.length; i++) {
        delete newStepData[state.steps[i]];
      }
      return {
        ...state,
        inputs: newInputs,
        stepData: newStepData,
        currentStep: Math.min(state.currentStep, stepIdx),
      };
    }
    case 'RESET':
      return {
        ...state,
        currentStep: 0,
        stepData: {},
      };
    default:
      return state;
  }
}

export interface UseStepMachineOptions {
  steps: string[];
  initialInputs?: Record<string, unknown>;
}

export function useStepMachine<TStepData = Record<string, unknown>>(
  options: UseStepMachineOptions
) {
  const [state, dispatch] = useReducer(stepReducer<TStepData>, {
    steps: options.steps,
    currentStep: 0,
    stepData: {},
    inputs: options.initialInputs || {},
  });

  const getStepStatus = useCallback(
    (step: string): 'pending' | 'active' | 'complete' => {
      const idx = state.steps.indexOf(step);
      if (idx < state.currentStep) return 'complete';
      if (idx === state.currentStep) return 'active';
      return 'pending';
    },
    [state.steps, state.currentStep]
  );

  const advance = useCallback(
    (step: string, data: TStepData) => {
      dispatch({ type: 'ADVANCE', step, data });
    },
    []
  );

  const invalidateFrom = useCallback(
    (step: string) => {
      dispatch({ type: 'INVALIDATE', fromStep: step });
    },
    []
  );

  const setInput = useCallback(
    (step: string, key: string, value: unknown) => {
      dispatch({ type: 'SET_INPUT', step, key, value });
    },
    []
  );

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    dispatch,
    getStepStatus,
    advance,
    invalidateFrom,
    setInput,
    reset,
    currentStep: state.steps[state.currentStep],
    stepData: state.stepData,
  };
}
