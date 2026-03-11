UPDATE auth.users SET phone = '' WHERE phone IS NULL AND id = (SELECT id FROM auth.users WHERE phone IS NULL LIMIT 1);
UPDATE auth.users SET phone = NULL WHERE phone IS NULL;