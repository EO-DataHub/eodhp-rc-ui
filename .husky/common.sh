#!/bin/sh

# Ensure NVM_DIR is set
export NVM_DIR="$HOME/.nvm"

# Source nvm script
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use
else
  echo "nvm is not installed. Attempting to use the system Node.js version. This might fail if it is not the same as specified in .nvmrc."
fi
