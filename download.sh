#!/bin/bash

# Set variables
REMOTE_USER="livehotseat"
REMOTE_HOST="pdx1-shared-a1-06.dreamhost.com"
REMOTE_PATH="/home/livehotseat/livehotseat.nightowllogic.com/"
SSH_KEY="~/.ssh/id_rsa"   # Optional: path to your private key

# Run the scp command
scp -i $SSH_KEY "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH*.js" . 
scp -i $SSH_KEY "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH*.css" . 
