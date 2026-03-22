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
  updatedAt?: string;
}

interface ProjectContextValue {
  project: ActiveProject | null;
  /** All projects owned by the signed-in user (newest first) */
  projects: ActiveProject[];
  isProjectLoading: boolean;
  isProjectsListLoading: boolean;
  error: string | null;
  startNewProject: () => Promise<void>;
  /** Reload `projects` from Supabase */
  refreshProjects: () => Promise<void>;
  /** Switch active project (persists id in sessionStorage) */
  selectProject: (projectId: string) => Promise<void>;
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
    .select('id, name, user_id, created_at, updated_at')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    userId: data.user_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function insertProject(userId: string): Promise<ActiveProject> {
  const supabase = getSupabaseClient();
  const name = `Session ${new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`;
  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: userId, name })
    .select('id, name, user_id, created_at, updated_at')
    .single();

  if (error) throw new Error(error.message);
  return {
    id: data.id,
    name: data.name,
    userId: data.user_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
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
  const [projects, setProjects] = useState<ActiveProject[]>([]);
  const [isProjectLoading, setIsProjectLoading] = useState(true);
  const [isProjectsListLoading, setIsProjectsListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  const refreshProjects = useCallback(async () => {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      setProjects([]);
      return;
    }
    setIsProjectsListLoading(true);
    try {
      const { data, error: qErr } = await supabase
        .from('projects')
        .select('id, name, user_id, created_at, updated_at')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false });
      if (qErr) throw new Error(qErr.message);
      const rows = data ?? [];
      setProjects(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          userId: r.user_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
      );
    } catch (e) {
      console.error('[refreshProjects]', e);
    } finally {
      setIsProjectsListLoading(false);
    }
  }, []);

  const selectProject = useCallback(async (projectId: string) => {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return;
    const p = await fetchProjectById(uid, projectId);
    if (!p) {
      setError('Project not found or access denied.');
      return;
    }
    sessionStorage.setItem(storageKey(uid), p.id);
    setProject(p);
    setError(null);
  }, []);

  const runProjectBootstrap = useCallback(
    async (event: AuthChangeEvent, session: Session | null) => {
      if (shouldIgnoreAuthEvent(event)) {
        return;
      }

      if (!session?.user) {
        if (lastUserIdRef.current) {
          sessionStorage.removeItem(storageKey(lastUserIdRef.current));
          lastUserIdRef.current = null;
        }
        setProject(null);
        setProjects([]);
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
              await refreshProjects();
              return;
            }
          }
          const created = await insertProject(uid);
          sessionStorage.setItem(key, created.id);
          setProject(created);
          await refreshProjects();
          return;
        }

        const storedId = sessionStorage.getItem(key);
        if (storedId) {
          const existing = await fetchProjectById(uid, storedId);
          if (existing) {
            setProject(existing);
            await refreshProjects();
            return;
          }
        }
        const created = await insertProject(uid);
        sessionStorage.setItem(key, created.id);
        setProject(created);
        await refreshProjects();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setProject(null);
      } finally {
        setIsProjectLoading(false);
      }
    },
    [refreshProjects],
  );

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
      await refreshProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsProjectLoading(false);
    }
  }, [refreshProjects]);

  const value = useMemo<ProjectContextValue>(
    () => ({
      project,
      projects,
      isProjectLoading,
      isProjectsListLoading,
      error,
      startNewProject,
      refreshProjects,
      selectProject,
    }),
    [
      project,
      projects,
      isProjectLoading,
      isProjectsListLoading,
      error,
      startNewProject,
      refreshProjects,
      selectProject,
    ],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useActiveProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useActiveProject must be used within a ProjectProvider');
  return ctx;
}
