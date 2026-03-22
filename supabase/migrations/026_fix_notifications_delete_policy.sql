-- Add DELETE policy for notifications RLS
-- Users should be able to delete their own notifications

CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);