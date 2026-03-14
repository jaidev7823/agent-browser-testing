#!/usr/bin/env bash

# Load keys
source .env

# Get the prompt from your text file
USER_PROMPT=$(cat prompt.txt)

# Run Pi with the Hunter model and the prompt
# We use --headed so you can supervise the 'Apply' clicks
pi --model openrouter/hunter-alpha \
  "System: You are an expert job hunter. Use the agent-browser tool. $USER_PROMPT"
