# FIREBASE SETUP
goto firebase, add project without analytics

Create database

Change security rules, an example is given:
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    match /sessions/{sessionId} {
      allow read, write: if true;

      match /students/{studentId} {
        allow read, write: if true;
      }

      match /helpRequests/{requestId} {
        allow read, write: if true;
      }
    }
  }
}

Add app, web app and copy the firebase config

create a .env file and copy those details into it, an example is given:

VITE_FIREBASE_API_KEY=

VITE_FIREBASE_AUTH_DOMAIN=

VITE_FIREBASE_PROJECT_ID=

VITE_FIREBASE_STORAGE_BUCKET=

VITE_FIREBASE_MESSAGING_SENDER_ID=

VITE_FIREBASE_APP_ID=

# INSTALL INSTRUCTION
$ npm install

# RUN LOCAL INSTRUCTION

$ npm run dev

# FIREBASE HOSTING DEPLOYMENT
$ npm install -g firebase-tools

$ firebase login

$ firebase init
choose hosting, existing project, set directory to dist, single page app, don't overwrite index.html

$ npm run build
$ firebase deploy

# BUILD AND DEPLOY
Single command to build and deploy to firebase
$ npm run deploy
