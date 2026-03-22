import { getSupabaseClient } from './supabaseClient';
import type { ChatMessage } from '../pages/chat/chat-types';

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

/**
 * All prompts for a project as chat turns (user message + assistant reply per row).
 */
export async function fetchChatMessagesForProject(
  projectId: string,
  userId: string,
): Promise<ChatMessage[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('prompts')
    .select('id, prompt, scad_code, status, error, created_at, completed_at')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[fetchChatMessagesForProject]', error);
    return [];
  }

  const rows = data ?? [];
  const messages: ChatMessage[] = [];

  for (const row of rows) {
    const created = new Date(row.created_at).getTime();
    messages.push({
      id: `prompt-${row.id}-user`,
      role: 'user',
      content: row.prompt,
      createdAt: created,
    });

    const assistantAt = row.completed_at
      ? new Date(row.completed_at).getTime()
      : created + 1;
    const status = String(row.status ?? '');

    let assistantContent: string;
    if (status === 'failed') {
      assistantContent = row.error?.trim()
        ? `Generation failed: ${row.error.trim()}`
        : 'Generation failed.';
    } else if (status === 'completed' && row.scad_code) {
      assistantContent = 'STL ready — preview updated above.';
    } else if (row.scad_code) {
      assistantContent = 'Model saved (OpenSCAD).';
    } else {
      assistantContent = `Status: ${status}`;
    }

    messages.push({
      id: `prompt-${row.id}-assistant`,
      role: 'assistant',
      content: assistantContent,
      createdAt: assistantAt,
    });
  }

  return messages;
}
