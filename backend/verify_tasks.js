// Run this file in backend folder using: node verify_tasks.js
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/"/g, '');
const supabaseKey = (process.env.SUPABASE_SERVICE_KEY || '').trim().replace(/"/g, '');

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching tasks from Supabase tasks table...');
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*, students(name, email)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error.message);
      return;
    }

    if (tasks.length === 0) {
      console.log('No tasks found in the Supabase tasks table. Go to http://localhost:3000 to add one!');
      return;
    }

    console.log(`\nFound ${tasks.length} tasks in database:\n`);
    tasks.forEach((t, i) => {
      console.log(`[Task ${i + 1}]`);
      console.log(`ID:       ${t.id}`);
      console.log(`Title:    ${t.title}`);
      console.log(`Subject:  ${t.subject}`);
      console.log(`Deadline: ${t.deadline}`);
      console.log(`Student:  ${t.students?.name} (${t.students?.email})`);
      console.log(`Created:  ${t.created_at}`);
      console.log('--------------------------------------------------');
    });
  } catch (err) {
    console.error('Execution exception:', err);
  }
}

run();
