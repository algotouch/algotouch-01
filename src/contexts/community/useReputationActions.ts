
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useReputationActions = () => {
  const [isLoading, setIsLoading] = useState(false);

  const incrementUserPoints = async (userId: string, points: number, activityType: string) => {
    setIsLoading(true);
    try {
      // Check if user has reputation record
      const { data: existingRep, error: repError } = await supabase
        .from('community_reputation')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (repError && repError.code !== 'PGRST116') {
        throw repError;
      }

      if (existingRep) {
        // Update existing reputation
        const newPoints = existingRep.points + points;
        const newLevel = Math.floor(newPoints / 100) + 1; // Simple level calculation

        const { error: updateError } = await supabase
          .from('community_reputation')
          .update({
            points: newPoints,
            level: newLevel,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateError) throw updateError;
      } else {
        // Create new reputation record
        const { error: insertError } = await supabase
          .from('community_reputation')
          .insert({
            user_id: userId,
            points: points,
            level: 1
          });

        if (insertError) throw insertError;
      }

      // Log the activity
      const { error: activityError } = await supabase
        .from('community_activities')
        .insert({
          user_id: userId,
          activity_type: activityType,
          points_earned: points
        });

      if (activityError) {
        console.error('Error logging activity:', activityError);
      }

      return { success: true };
    } catch (error) {
      console.error('Error incrementing user points:', error);
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    incrementUserPoints,
    isLoading
  };
};
