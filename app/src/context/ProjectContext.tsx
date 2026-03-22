import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';

export interface ActiveProject {
  id: string;
  name: string;
  userId: string;
  createdAt?: string;
}

interface ProjectContextValue {
  project: ActiveProject | null;
  /** Resolving session + creating or restoring the Supabase project row */
  isProjectLoading: boolean;
  error: string | null;
  /** Clears sessionStorage and creates a new project (same user) */
  startNewProject: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

function storageKey(userId: string): string {
  return `3dai_active_project:${userId}`;
}

async function fetchProjectById(
  userId: string,
  projectId: string,
): Promise<ActiveProject | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, user_id, created_at')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    userId: data.user_id,
    createdAt: data.created_at,
  };
}

async function insertProject(userId: string): Promise<ActiveProject> {
  const supabase = getSupabaseClient();
  const name = `Session ${new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`;
  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: userId, name })
    .select('id, name, user_id, created_at')
    .single();

  if (error) throw new Error(error.message);
  return {
    id: data.id,
    name: data.name,
    userId: data.user_id,
    createdAt: data.created_at,
  };
}

function shouldIgnoreAuthEvent(event: AuthChangeEvent): boolean {
  return (
    event === 'TOKEN_REFRESHED' ||
    event === 'USER_UPDATED' ||
    event === 'PASSWORD_RECOVERY' ||
    event === 'MFA_CHALLENGE_VERIFIED'
  );
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<ActiveProject | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  const runProjectBootstrap = useCallback(async (event: AuthChangeEvent, session: Session | null) => {
    if (shouldIgnoreAuthEvent(event)) {
      return;
    }

    if (!session?.user) {
      if (lastUserIdRef.current) {
        sessionStorage.removeItem(storageKey(lastUserIdRef.current));
        lastUserIdRef.current = null;
      }
      setProject(null);
      setError(null);
      setIsProjectLoading(false);
      return;
    }

    const uid = session.user.id;
    lastUserIdRef.current = uid;
    const key = storageKey(uid);

    if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') {
      setIsProjectLoading(false);
      return;
    }

    try {
      setIsProjectLoading(true);
      setError(null);

      if (event === 'INITIAL_SESSION') {
        const storedId = sessionStorage.getItem(key);
        if (storedId) {
          const existing = await fetchProjectById(uid, storedId);
          if (existing) {
            setProject(existing);
            return;
          }
        }
        const created = await insertProject(uid);
        sessionStorage.setItem(key, created.id);
        setProject(created);
        return;
      }

      // SIGNED_IN — new login after sign-out: storage was cleared; prefer new row.
      // If storage still has an id (duplicate event / race), reuse existing row.
      const storedId = sessionStorage.getItem(key);
      if (storedId) {
        const existing = await fetchProjectById(uid, storedId);
        if (existing) {
          setProject(existing);
          return;
        }
      }
      const created = await insertProject(uid);
      sessionStorage.setItem(key, created.id);
      setProject(created);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setProject(null);
    } finally {
      setIsProjectLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      void runProjectBootstrap(event, session);
    });

    return () => subscription.unsubscribe();
  }, [runProjectBootstrap]);

  const startNewProject = useCallback(async () => {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return;

    setIsProjectLoading(true);
    setError(null);
    try {
      sessionStorage.removeItem(storageKey(uid));
      const created = await insertProject(uid);
      sessionStorage.setItem(storageKey(uid), created.id);
      setProject(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsProjectLoading(false);
    }
  }, []);

  const value = useMemo<ProjectContextValue>(
    () => ({
      project,
      isProjectLoading,
      error,
      startNewProject,
    }),
    [project, isProjectLoading, error, startNewProject],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useActiveProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useActiveProject must be used within a ProjectProvider');
  return ctx;
}
