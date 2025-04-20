import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDskonQWF_570Ngj5BgFi4SmH3Gp123h9k",
  authDomain: "card-matching-game-1bf8e.firebaseapp.com",
  projectId: "card-matching-game-1bf8e",
  storageBucket: "card-matching-game-1bf8e.firebasestorage.app",
  messagingSenderId: "476968364055",
  appId: "1:476968364055:web:224d75a1bc8887be5d1452",
  measurementId: "G-CBFTVQZMEY"
};
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const auth = Platform.OS === 'web'
    ? getAuth(app) // Use default web persistence
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
  const db = getFirestore(app);

  export { app, auth, db };