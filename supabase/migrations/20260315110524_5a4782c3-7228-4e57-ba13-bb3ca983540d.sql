-- Fix corrupted UTF-8 names (U+FFFD replacement characters)
UPDATE profiles SET full_name = 'Natália Santos' WHERE user_id = '0ff08982-28ee-4ebf-858e-3b2e7f34b07c';
UPDATE profiles SET full_name = 'Maria de Fátima de Souza Alves' WHERE user_id = 'f477171c-2def-4d0f-9fe0-37d39dffbc6d';
UPDATE profiles SET full_name = 'Kamila Kellem Conceição Pantoja' WHERE user_id = 'cef1985a-c2b8-42db-840a-63cfb937b28c';