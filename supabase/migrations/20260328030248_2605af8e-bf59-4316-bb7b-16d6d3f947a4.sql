
-- Migrate legacy full URLs to storage paths
-- Pattern: https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
-- Extract: <bucket>/<path> portion only, but since StorageImage resolves bucket separately,
-- we keep just the path after the bucket name

-- patient_checkins: extract path after /storage/v1/object/public/checkin-photos/
UPDATE patient_checkins
SET photo_front_url = regexp_replace(photo_front_url, '^https?://[^/]+/storage/v1/object/public/checkin-photos/', '')
WHERE photo_front_url LIKE 'http%';

UPDATE patient_checkins
SET photo_side_url = regexp_replace(photo_side_url, '^https?://[^/]+/storage/v1/object/public/checkin-photos/', '')
WHERE photo_side_url LIKE 'http%';

UPDATE patient_checkins
SET photo_back_url = regexp_replace(photo_back_url, '^https?://[^/]+/storage/v1/object/public/checkin-photos/', '')
WHERE photo_back_url LIKE 'http%';

-- branding_settings: extract path after /storage/v1/object/public/body-images/
UPDATE branding_settings
SET logo_url = regexp_replace(logo_url, '^https?://[^/]+/storage/v1/object/public/body-images/', '')
WHERE logo_url LIKE 'http%';

-- body_analyses: clean up if any exist (currently 0, but idempotent)
UPDATE body_analyses
SET front_image_url = regexp_replace(front_image_url, '^https?://[^/]+/storage/v1/object/(?:public|sign)/[^/]+/', '')
WHERE front_image_url LIKE 'http%';

UPDATE body_analyses
SET side_image_url = regexp_replace(side_image_url, '^https?://[^/]+/storage/v1/object/(?:public|sign)/[^/]+/', '')
WHERE side_image_url LIKE 'http%';

UPDATE body_analyses
SET back_image_url = regexp_replace(back_image_url, '^https?://[^/]+/storage/v1/object/(?:public|sign)/[^/]+/', '')
WHERE back_image_url LIKE 'http%';
