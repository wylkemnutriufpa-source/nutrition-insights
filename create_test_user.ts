
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestUser() {
  const email = 'test-nutritionist@fitjourney.com';
  const password = 'Password123!';
  
  console.log(`Creating test user: ${email}`);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Test Nutritionist',
        role: 'nutritionist'
      }
    }
  });

  if (error) {
    if (error.message.includes('User already registered')) {
      console.log('User already exists.');
    } else {
      console.error('Error creating user:', error.message);
      return;
    }
  } else {
    console.log('User created successfully:', data.user?.id);
    
    const userId = data.user?.id;
    if (userId) {
       await new Promise(r => setTimeout(r, 2000));
       
       console.log('Calling self_register_nutritionist RPC...');
       const { error: rpcError } = await supabase.rpc('self_register_nutritionist', {
         _user_id: userId,
         _full_name: 'Test Nutritionist'
       });
       if (rpcError) console.error('RPC Error:', rpcError);
       else console.log('RPC Success');
    }
  }
}

createTestUser();
