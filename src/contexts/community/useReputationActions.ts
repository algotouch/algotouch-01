
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useReputationActions = (userId?: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [userLevel, setUserLevel] = useState(1);

  const updateReputationData = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('community_reputation')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setUserPoints(data.points);
        setUserLevel(data.level);
      }
    } catch (error) {
      console.error('Error fetching reputation data:', error);
    }
  };

  const checkAndAwardDailyLogin = async () => {
    if (!userId) return;
    
    try {
      const today = new Date().toDateString();
      
      // Check if user already logged in today
      const { data: todayActivity, error: activityError } = await supabase
        .from('community_activities')
        .select('*')
        .eq('user_id', userId)
        .eq('activity_type', 'DAILY_LOGIN')
        .gte('created_at', new Date().toISOString().split('T')[0])
        .maybeSingle();

      if (activityError && activityError.code !== 'PGRST116') {
        throw activityError;
      }

      if (!todayActivity) {
        // Award daily login points
        await incrementUserPoints(userId, 2, 'DAILY_LOGIN');
      }
    } catch (error) {
      console.error('Error checking daily login:', error);
    }
  };

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
        
        setUserPoints(newPoints);
        setUserLevel(newLevel);
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
        
        setUserPoints(points);
        setUserLevel(1);
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
    isLoading,
    userPoints,
    userLevel,
    checkAndAwardDailyLogin,
    updateReputationData
  };
};
