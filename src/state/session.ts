/**
 * D-10 Therapeutics — Demo Session Store
 *
 * Very small shared store for the demo login / role selector.
 * This is intentionally NOT real authentication. It only tracks which role
 * the presenter chose so the app can route to the correct experience.
 */

import { useEffect, useState } from 'react';

export type DemoRole = 'patient' | 'caregiver' | 'hematologist';

export interface DemoSession {
  email: string;
  role: DemoRole;
}

let currentSession: DemoSession | null = null;
const listeners = new Set<(session: DemoSession | null) => void>();

export function getDemoSession(): DemoSession | null {
  return currentSession;
}

export function setDemoSession(session: DemoSession | null): void {
  currentSession = session;
  listeners.forEach((listener) => listener(currentSession));
}

export function signOutDemoSession(): void {
  setDemoSession(null);
}

export function subscribeDemoSession(
  listener: (session: DemoSession | null) => void
): () => void {
  listeners.add(listener);
  listener(currentSession);
  return () => {
    listeners.delete(listener);
  };
}

export function useDemoSession(): DemoSession | null {
  const [session, setSession] = useState<DemoSession | null>(getDemoSession());
  useEffect(() => subscribeDemoSession(setSession), []);
  return session;
}

export const ROLE_LABELS: Record<DemoRole, string> = {
  patient: 'Patient',
  caregiver: 'Caregiver',
  hematologist: 'Hematologist',
};
