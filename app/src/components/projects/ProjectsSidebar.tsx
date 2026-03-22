import { useEffect } from 'react';
import { useActiveProject } from '../../context/ProjectContext';

function formatWhen(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Lists the signed-in user's projects; clicking one switches the active project
 * (preview reloads via `useGenerationChat` + `/compile-scad`).
 */
export function ProjectsSidebar() {
  const {
    project,
    projects,
    isProjectsListLoading,
    selectProject,
    refreshProjects,
    startNewProject,
  } = useActiveProject();

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  return (
    <aside className="flex h-full min-h-0 w-60 shrink-0 flex-col border-r border-white/10 bg-[#0c0c0f]">
      <div className="shrink-0 border-b border-white/10 px-3 py-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Projects
        </div>
        <button
          type="button"
          className="mt-2 w-full rounded-lg border border-indigo-500/40 bg-indigo-600/20 px-3 py-2 text-xs font-semibold text-indigo-100 transition-colors hover:bg-indigo-600/30"
          onClick={() => void startNewProject()}
        >
          + New project
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {isProjectsListLoading && projects.length === 0 ? (
          <div className="px-2 py-3 text-xs text-zinc-500">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="px-2 py-3 text-xs text-zinc-500">No projects yet.</div>
        ) : (
          <ul className="flex flex-col gap-1">
            {projects.map((p) => {
              const active = project?.id === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => void selectProject(p.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? 'bg-indigo-600/25 text-indigo-100 ring-1 ring-indigo-500/50'
                        : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="truncate font-mono text-[10px] text-zinc-500">
                      {formatWhen(p.updatedAt ?? p.createdAt)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 px-3 py-2">
        <button
          type="button"
          className="text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-400 hover:underline"
          onClick={() => void refreshProjects()}
        >
          Refresh list
        </button>
      </div>
    </aside>
  );
}
