#!/bin/bash

# Set variables
# REMOTE_USER="livehotseat"
REMOTE_USER="youhostlive"
REMOTE_HOST="pdx1-shared-a1-06.dreamhost.com"
# REMOTE_PATH="/home/livehotseat/livehotseat.nightowllogic.com/"
REMOTE_PATH="/home/youhostlive/youhostlive.nightowllogic.com/"
SSH_KEY="~/.ssh/id_rsa"   # Optional: path to your private key

# Run the scp command
scp -i $SSH_KEY *.js *.css "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH"