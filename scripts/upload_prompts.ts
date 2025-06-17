const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// CEFR levels
const cefrLevels: string[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Interface for prompt data
interface Prompt {
  id: string;
  text: string;
  cefr_level: string;
  created_at: string;
}

// Read prompts from a text file
async function readPromptsFromFile(cefrLevel: string): Promise<string[]> {
  const filePath = path.join(__dirname, '..', 'prompts', `${cefrLevel}.txt`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const prompts = content
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && /^[A-Za-z0-9\s.,?!'"-]+$/.test(line));
    return prompts;
  } catch (error) {
    throw new Error(`Failed to read ${cefrLevel}.txt: ${(error as Error).message}`);
  }
}

// Upload prompts to Supabase with deduplication
async function uploadPromptsToSupabase(prompts: string[], cefrLevel: string): Promise<void> {
  // Fetch existing prompts to avoid duplicates
  const { data: existing, error: fetchError } = await supabase
    .from('prompts')
    .select('text')
    .eq('cefr_level', cefrLevel);

  if (fetchError) {
    throw new Error(`Failed to fetch existing prompts for ${cefrLevel}: ${fetchError.message}`);
  }

  const existingPrompts = new Set(existing.map((p: { text: string }) => p.text));
  const uniquePrompts = prompts.filter((prompt) => !existingPrompts.has(prompt));

  if (uniquePrompts.length === 0) {
    console.log(`No new prompts to upload for ${cefrLevel}`);
    return;
  }

  // Prepare prompt records
  const promptRecords: Prompt[] = uniquePrompts.map((text) => ({
    id: uuidv4(),
    text,
    cefr_level: cefrLevel,
    created_at: new Date().toISOString(),
  }));

  // Insert prompts in batches to avoid Supabase limits
  const batchSize = 100;
  for (let i = 0; i < promptRecords.length; i += batchSize) {
    const batch = promptRecords.slice(i, i + batchSize);
    const { error } = await supabase.from('prompts').insert(batch);

    if (error) {
      throw new Error(`Failed to save prompts for ${cefrLevel}: ${error.message}`);
    }
  }

  console.log(`Uploaded ${uniquePrompts.length} new prompts for ${cefrLevel}`);
}

// Main function to process all CEFR levels
async function main(): Promise<void> {
  for (const cefrLevel of cefrLevels) {
    console.log(`Processing prompts for ${cefrLevel}...`);
    try {
      const prompts = await readPromptsFromFile(cefrLevel);
      if (prompts.length === 0) {
        console.warn(`No prompts found in ${cefrLevel}.txt`);
        continue;
      }
      await uploadPromptsToSupabase(prompts, cefrLevel);
    } catch (error) {
      console.error(`Error processing ${cefrLevel}:`, error);
    }
  }
  console.log('All prompts processed and uploaded successfully.');
}

// Run the script
main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
