#!/usr/bin/env ruby

require 'bundler/inline'

gemfile do
  source 'https://rubygems.org'
  gem 'ruby-openai', '~> 7.1'
  gem 'dotenv', '~> 3.1'
  gem 'set', '~> 1.1' # Standard library, but listed for clarity
end

require 'openai'
require 'dotenv'
require 'fileutils'

# Load environment variables from .env.local
Dotenv.load(File.join(__dir__, '..', '.env.local'))

# Initialize OpenAI client
OPENAI_CLIENT = OpenAI::Client.new(access_token: ENV['OPENAI_API_KEY'])

# CEFR levels
CEFR_LEVELS = %w[B2 C1 C2].freeze

# Read the OpenAI prompt from file
def read_prompt_template
  file_path = File.join(__dir__, '..', 'prompts', 'generate_writing_prompt.txt')
  File.read(file_path).strip
rescue Errno::ENOENT => e
  raise "Failed to read prompt file: #{e.message}"
end

# Generate the OpenAI prompt by replacing {cefr_level}
def generate_prompt(template, cefr_level)
  template.gsub('{cefr_level}', cefr_level)
end

# Generate a batch of prompts for a given CEFR level
def generate_prompts_for_level(cefr_level, prompt_template)
  response = OPENAI_CLIENT.chat(
    parameters: {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: generate_prompt(prompt_template, cefr_level) },
        { role: 'user', content: 'Generate 100 prompts, one per line.' }
      ],
      temperature: 1.5,
    }
  )

  prompts = response.dig('choices', 0, 'message', 'content').strip.split(/\s*\n\s*/).map(&:strip)
  puts prompts

  prompts
end

# Save prompts to a text file
def save_prompts_to_file(prompts, cefr_level)
  file_path = File.join(__dir__, '..', 'prompts', "#{cefr_level}.txt")
  File.open(file_path, 'a') do |file|
    file.write(prompts.join("\n"))
  end
  puts "Saved #{prompts.length} prompts to #{cefr_level}.txt"
rescue Errno::ENOENT => e
  raise "Failed to save prompts to #{cefr_level}.txt: #{e.message}"
end

# Main execution
begin
  prompt_template = read_prompt_template

  CEFR_LEVELS.each do |cefr_level|
    puts "Generating prompts for #{cefr_level}..."
    prompts = generate_prompts_for_level(cefr_level, prompt_template)
    save_prompts_to_file(prompts, cefr_level)
  end

  puts 'All prompts generated and saved successfully.'
rescue StandardError => e
  warn "Script failed: #{e.message}"
  exit 1
end
