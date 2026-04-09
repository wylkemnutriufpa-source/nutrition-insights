-- Clear broken video_url references for system exercises where files don't exist in storage
UPDATE exercises_library
SET video_url = NULL, thumbnail_url = NULL
WHERE video_url LIKE '%/storage/v1/object/public/exercise-videos/library/%';