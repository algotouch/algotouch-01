
import { supabase } from '@/integrations/supabase/client';

// Direct implementations instead of trying to call non-existent functions

export const checkColumnValue = async (table: string, column: string, value: any, userId?: string) => {
  try {
    // Use specific table checks instead of dynamic queries
    if (table === 'community_reputation' && column === 'user_id') {
      const { data, error } = await supabase
        .from('community_reputation')
        .select('user_id')
        .eq('user_id', value)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return { exists: !!data };
    }
    
    // Add more specific cases as needed
    return { exists: false };
  } catch (error) {
    console.error('Error checking column value:', error);
    return { exists: false, error };
  }
};

export const updateColumnValue = async (table: string, id: string, updates: Record<string, any>) => {
  try {
    // Handle specific table updates
    if (table === 'community_reputation') {
      const { error } = await supabase
        .from('community_reputation')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    }
    
    return { success: false, error: 'Unsupported table' };
  } catch (error) {
    console.error('Error updating column value:', error);
    return { success: false, error };
  }
};

export const checkExistsDirect = async (table: string, conditions: Record<string, any>) => {
  try {
    // Handle specific table checks
    if (table === 'community_reputation') {
      const { data, error } = await supabase
        .from('community_reputation')
        .select('id')
        .match(conditions)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return { exists: !!data };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Error checking existence:', error);
    return { exists: false, error };
  }
};

// Add the missing functions that are imported by other files
export const incrementColumnValue = async (id: string, table: string, column: string, increment: number = 1) => {
  try {
    if (table === 'community_reputation' && column === 'points') {
      const { data: current, error: fetchError } = await supabase
        .from('community_reputation')
        .select('points')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { error: updateError } = await supabase
        .from('community_reputation')
        .update({ points: current.points + increment })
        .eq('id', id);
      
      if (updateError) throw updateError;
      return true;
    }
    
    if (table === 'community_posts' && column === 'likes') {
      const { data: current, error: fetchError } = await supabase
        .from('community_posts')
        .select('likes')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { error: updateError } = await supabase
        .from('community_posts')
        .update({ likes: current.likes + increment })
        .eq('id', id);
      
      if (updateError) throw updateError;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error incrementing column value:', error);
    return false;
  }
};

export const rowExists = async (table: string, column: string, value: any): Promise<boolean> => {
  try {
    if (table === 'community_reputation' && column === 'user_id') {
      const { data, error } = await supabase
        .from('community_reputation')
        .select('id')
        .eq('user_id', value)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if row exists:', error);
    return false;
  }
};
