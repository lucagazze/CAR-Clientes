-- Social Snapshots: daily organic follower/fan counts per client
CREATE TABLE IF NOT EXISTS public.car_social_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.car_clients(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ig_followers INTEGER,
  ig_following INTEGER,
  ig_posts INTEGER,
  fb_fans INTEGER,
  fb_followers INTEGER,
  tiktok_followers INTEGER,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  CONSTRAINT unique_client_snapshot_date UNIQUE (client_id, snapshot_date)
);

ALTER TABLE public.car_social_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own social snapshots"
  ON public.car_social_snapshots FOR ALL
  USING (client_id IN (SELECT id FROM public.car_clients WHERE user_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT id FROM public.car_clients WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all social snapshots"
  ON public.car_social_snapshots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.car_clients WHERE user_id = auth.uid() AND is_admin = true));
