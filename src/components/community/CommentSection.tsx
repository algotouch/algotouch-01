import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useCommunity } from '@/contexts/community/CommunityContext';
import { Comment } from '@/lib/community/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, CornerDownRight, Send } from 'lucide-react';
import { toast } from 'sonner';
import { likeComment } from '@/lib/community/comments-service';
import { Separator } from '@/components/ui/separator';

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
}

export function CommentSection({ postId, comments }: CommentSectionProps) {
  const { isAuthenticated, user } = useAuth();
  const { addNewComment, handleCommentAdded } = useCommunity();
  
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleAddComment = async () => {
    if (!isAuthenticated) {
      toast.error('יש להתחבר כדי להגיב');
      return;
    }
    
    if (!newComment.trim()) {
      toast.error('לא ניתן לפרסם תגובה ריקה');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const commentId = await addNewComment(postId, newComment, replyingTo || undefined);
      
      if (commentId) {
        setNewComment('');
        setReplyingTo(null);
        await handleCommentAdded(postId);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
  };
  
  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated) {
      toast.error('יש להתחבר כדי לבצע פעולה זו');
      return;
    }
    
    try {
      const success = await likeComment(commentId, user!.id);
      
      if (success) {
        await handleCommentAdded(postId);
        toast.success('הוספת לייק לתגובה!');
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      toast.error('שגיאה בהוספת לייק לתגובה');
    }
  };
  
  // Helper function to format time
  const formatTime = (timeString: string) => {
    const commentTime = new Date(timeString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - commentTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'כרגע';
    if (diffInMinutes < 60) return `לפני ${diffInMinutes} דקות`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `לפני ${diffInHours} שעות`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `לפני ${diffInDays} ימים`;
  };
  
  // Helper function to format user name
  const formatUserName = (comment: Comment) => {
    if (comment.profiles?.first_name || comment.profiles?.last_name) {
      return `${comment.profiles.first_name || ''} ${comment.profiles.last_name || ''}`.trim();
    }
    return `סוחר${comment.user_id.substring(0, 4)}`;
  };
  
  return (
    <div className="mt-6">
      <Separator className="mb-4" />
      <h3 className="text-lg font-medium mb-4">תגובות ({comments?.length ?? 0})</h3>
      
      {/* New comment form */}
      <div className="flex items-start gap-3 mb-6">
        <Avatar className="h-8 w-8">
          <AvatarImage src={isAuthenticated ? `https://avatar.vercel.sh/${user?.id}?size=32` : "https://i.pravatar.cc/150?img=30"} />
          <AvatarFallback>{user?.email?.charAt(0) || 'G'}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <Textarea
            placeholder={isAuthenticated ? "הוסף תגובה..." : "התחבר כדי להגיב..."}
            className="min-h-[80px] resize-none mb-2"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={!isAuthenticated || isSubmitting}
          />
          
          <div className="flex justify-between items-center">
            {replyingTo && (
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <CornerDownRight size={14} />
                מגיב לתגובה
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 px-1" 
                  onClick={() => setReplyingTo(null)}
                >
                  ביטול
                </Button>
              </div>
            )}
            
            <Button 
              onClick={handleAddComment}
              disabled={!isAuthenticated || !newComment.trim() || isSubmitting}
              size="sm"
              className="gap-1"
            >
              <Send size={14} /> שלח תגובה
            </Button>
          </div>
        </div>
      </div>
      
      {/* Comments list */}
      {comments?.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="group">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://avatar.vercel.sh/${comment.user_id}?size=32`} />
                  <AvatarFallback>{formatUserName(comment).charAt(0)}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{formatUserName(comment)}</p>
                        <p className="text-xs text-gray-500">{formatTime(comment.created_at)}</p>
                      </div>
                    </div>
                    
                    <p className="mt-2 text-sm">{comment.content}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-1 mr-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex items-center gap-1 h-7 px-2 text-xs"
                      onClick={() => handleLikeComment(comment.id)}
                    >
                      <ThumbsUp size={12} /> {comment.likes > 0 && comment.likes}
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex items-center gap-1 h-7 px-2 text-xs"
                      onClick={() => handleReply(comment.id)}
                    >
                      השב
                    </Button>
                  </div>
                  
                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-2 mr-5 border-r-2 border-gray-100 pr-3 space-y-3">
                      {comment.replies.map(reply => (
                        <div key={reply.id} className="flex gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={`https://avatar.vercel.sh/${reply.user_id}?size=24`} />
                            <AvatarFallback>{reply.profiles?.first_name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="bg-muted/30 rounded-lg p-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-xs">
                                    {reply.profiles?.first_name || reply.profiles?.last_name 
                                      ? `${reply.profiles?.first_name || ''} ${reply.profiles?.last_name || ''}`.trim()
                                      : `סוחר${reply.user_id.substring(0, 4)}`
                                    }
                                  </p>
                                  <p className="text-[10px] text-gray-500">{formatTime(reply.created_at)}</p>
                                </div>
                              </div>
                              
                              <p className="mt-1 text-xs">{reply.content}</p>
                            </div>
                            
                            <div className="flex items-center gap-4 mt-1 mr-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="flex items-center gap-1 h-5 px-2 text-xs"
                                onClick={() => handleLikeComment(reply.id)}
                              >
                                <ThumbsUp size={10} /> {reply.likes > 0 && reply.likes}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          אין תגובות עדיין. היה הראשון להגיב!
        </div>
      )}
    </div>
  );
}
