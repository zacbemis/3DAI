import { getSupabaseClient } from './supabaseClient';

/**
 * Latest `scad_code` for a project (by `created_at`), excluding null/empty.
 */
export async function fetchLatestScadForProject(
  projectId: string,
  userId: string,
): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('prompts')
    .select('scad_code')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .not('scad_code', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.scad_code?.trim()) return null;
  return data.scad_code.trim();
}
