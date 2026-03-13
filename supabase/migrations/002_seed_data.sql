-- Insert initial platforms
INSERT INTO public.platforms (name, icon) VALUES
  ('Instagram', '📷'),
  ('TikTok', '🎵'),
  ('YouTube', '📺'),
  ('Twitter', '🐦'),
  ('Facebook', '👥')
ON CONFLICT (name) DO NOTHING;

-- Insert sample creators
INSERT INTO public.creators (id, name, handle, avatar, email) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Lauren Arthurs', '@laurenarthurs', '', 'lauren@example.com'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Emma Wilson', '@emmawilson', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', 'emma@example.com'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Sophie Chen', '@sophiechen', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face', 'sophie@example.com'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Olivia Brooks', '@oliviabrooks', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face', 'olivia@example.com')
ON CONFLICT (handle) DO NOTHING;

-- Link creators to platforms
INSERT INTO public.creator_platforms (creator_id, platform_id, follower_count, engagement_rate)
SELECT 
  c.id,
  p.id,
  CASE 
    WHEN c.name = 'Lauren Arthurs' AND p.name = 'Instagram' THEN 150000
    WHEN c.name = 'Lauren Arthurs' AND p.name = 'TikTok' THEN 200000
    WHEN c.name = 'Emma Wilson' AND p.name = 'Instagram' THEN 120000
    WHEN c.name = 'Emma Wilson' AND p.name = 'YouTube' THEN 80000
    WHEN c.name = 'Sophie Chen' AND p.name = 'TikTok' THEN 300000
    WHEN c.name = 'Sophie Chen' AND p.name = 'Instagram' THEN 100000
    WHEN c.name = 'Olivia Brooks' AND p.name = 'YouTube' THEN 150000
    WHEN c.name = 'Olivia Brooks' AND p.name = 'Instagram' THEN 90000
  END,
  CASE 
    WHEN c.name = 'Lauren Arthurs' THEN 4.5
    WHEN c.name = 'Emma Wilson' THEN 3.8
    WHEN c.name = 'Sophie Chen' THEN 5.2
    WHEN c.name = 'Olivia Brooks' THEN 4.1
  END
FROM public.creators c
CROSS JOIN public.platforms p
WHERE 
  (c.name = 'Lauren Arthurs' AND p.name IN ('Instagram', 'TikTok'))
  OR (c.name = 'Emma Wilson' AND p.name IN ('Instagram', 'YouTube'))
  OR (c.name = 'Sophie Chen' AND p.name IN ('TikTok', 'Instagram'))
  OR (c.name = 'Olivia Brooks' AND p.name IN ('YouTube', 'Instagram'))
ON CONFLICT DO NOTHING;

-- Insert sample campaigns
INSERT INTO public.campaigns (id, creator_id, brand, launch_date, activity, live_date, ag_price, creator_fee, shot, complete, invoice_no, paid_date, includes_vat, currency, brand_pos, payment_terms, notes)
SELECT 
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440001',
  'NA-KD',
  'JULY',
  '1 x STORY SET + 1 X IG CAROUSEL (GBP)',
  '',
  1400.00,
  NULL,
  '',
  TRUE,
  'PO-4555',
  '17 Oct',
  'NO VAT',
  'GBP',
  '',
  '',
  'Summer collection campaign'
WHERE NOT EXISTS (
  SELECT 1 FROM public.campaigns WHERE invoice_no = 'PO-4555'
);

INSERT INTO public.campaigns (id, creator_id, brand, launch_date, activity, live_date, ag_price, creator_fee, shot, complete, invoice_no, paid_date, includes_vat, currency, brand_pos, payment_terms, notes)
SELECT 
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440001',
  'Pretty Little Thing',
  'JULY',
  '1 X IG CAROUSEL + 1 X IG STATIC (USD)',
  '',
  3300.00,
  NULL,
  '',
  TRUE,
  'PO-4556',
  '17 Oct',
  'NO VAT',
  'USD',
  '',
  '',
  'Fashion collaboration'
WHERE NOT EXISTS (
  SELECT 1 FROM public.campaigns WHERE invoice_no = 'PO-4556'
);

INSERT INTO public.campaigns (id, creator_id, brand, launch_date, activity, live_date, ag_price, creator_fee, shot, complete, invoice_no, paid_date, includes_vat, currency, brand_pos, payment_terms, notes)
SELECT 
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440002',
  'Glossier',
  'AUGUST',
  '2 X REELS + 1 X IG STATIC',
  'Aug 15',
  2500.00,
  NULL,
  '',
  FALSE,
  'PO-4557',
  '',
  'VAT',
  'GBP',
  '',
  'Net 30',
  'Beauty product launch'
WHERE NOT EXISTS (
  SELECT 1 FROM public.campaigns WHERE invoice_no = 'PO-4557'
);

INSERT INTO public.campaigns (id, creator_id, brand, launch_date, activity, live_date, ag_price, creator_fee, shot, complete, invoice_no, paid_date, includes_vat, currency, brand_pos, payment_terms, notes)
SELECT 
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655440003',
  'Zara',
  'SEPTEMBER',
  '3 X TIKTOK VIDEOS',
  'Sep 1',
  3000.00,
  NULL,
  'Complete',
  TRUE,
  'PO-4558',
  '5 Sep',
  'VAT',
  'EUR',
  '',
  'Net 15',
  'Fall fashion campaign'
WHERE NOT EXISTS (
  SELECT 1 FROM public.campaigns WHERE invoice_no = 'PO-4558'
);

-- Get campaign IDs for content items (using invoice_no as reference)
DO $$
DECLARE
  campaign_id_1 UUID;
  campaign_id_2 UUID;
  campaign_id_3 UUID;
BEGIN
  SELECT id INTO campaign_id_1 FROM public.campaigns WHERE invoice_no = 'PO-4555' LIMIT 1;
  SELECT id INTO campaign_id_2 FROM public.campaigns WHERE invoice_no = 'PO-4556' LIMIT 1;
  SELECT id INTO campaign_id_3 FROM public.campaigns WHERE invoice_no = 'PO-4557' LIMIT 1;

  -- Insert sample content items for NA-KD campaign
  IF campaign_id_1 IS NOT NULL THEN
    INSERT INTO public.content_items (campaign_id, type, title, url, platform, status, due_date, notes)
    VALUES
      (campaign_id_1, 'carousel', 'Summer Collection Carousel', 'https://www.instagram.com/p/example1', 'Instagram', 'published', NULL, 'Featuring summer dresses and accessories'),
      (campaign_id_1, 'story', 'Behind the Scenes Story', NULL, 'Instagram', 'published', NULL, 'Story set showing the photoshoot process');
  END IF;

  -- Insert sample content items for Pretty Little Thing campaign
  IF campaign_id_2 IS NOT NULL THEN
    INSERT INTO public.content_items (campaign_id, type, title, url, platform, status, due_date, notes)
    VALUES
      (campaign_id_2, 'carousel', 'Fashion Week Looks', 'https://www.instagram.com/p/example2', 'Instagram', 'published', NULL, 'Multiple outfit changes'),
      (campaign_id_2, 'image', 'Evening Wear Static', 'https://www.instagram.com/p/example3', 'Instagram', 'published', NULL, 'Single product focus shot');
  END IF;

  -- Insert sample content items for Glossier campaign
  IF campaign_id_3 IS NOT NULL THEN
    INSERT INTO public.content_items (campaign_id, type, title, url, platform, status, due_date, notes)
    VALUES
      (campaign_id_3, 'reel', 'Morning Routine Reel', NULL, 'Instagram', 'pending', NOW() + INTERVAL '7 days', 'Showcase new skincare line'),
      (campaign_id_3, 'reel', 'Product Demo Reel', NULL, 'Instagram', 'draft', NOW() + INTERVAL '10 days', 'Demonstrate application techniques'),
      (campaign_id_3, 'image', 'Product Flat Lay', NULL, 'Instagram', 'approved', NOW() + INTERVAL '14 days', 'All products in one shot');
  END IF;
END $$;
