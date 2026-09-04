import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://glmgtnziebrdoohdimhv.supabase.co';
const supabaseAnonKey = 'sb_publishable_pkpxOw_FIXneljxQZdeDjA_LkJusORg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);