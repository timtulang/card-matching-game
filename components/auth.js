import { auth } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

export const handleLogin = async (email, password, setAuthError, setIsLoading) => {
    if (!email || !password) {
      setAuthError('Email and password are required');
      return;
    }

    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      setAuthError('');
    } catch (error) {
      setAuthError(getAuthErrorMessage(error.code));
      console.log('Login error:', error);
    } finally {
      setIsLoading(false);
    }
};

export const handleRegister = async (email, password, confirmPassword, setAuthError, setIsLoading) => {
    if (!email || !password || !confirmPassword) {
      setAuthError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    try {
      setIsLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setAuthError('');
      setIsRegistering(false);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error.code));
    } finally {
      setIsLoading(false);
    }
  };

export const handleLogout = async (setIsGameStarted, setShowSetup) => {
    try {
      await signOut(auth);
      // Reset game state
      setIsGameStarted(false);
      setShowSetup(true);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Listen for authentication state changes
    export const listenForAuthState = (setUser, setIsLoading) => {
    return onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setIsLoading(false);
    });
  };

export const getAuthErrorMessage = (errorCode) => {
    if (!errorCode) {
        return 'An unknown authentication error occurred.';
      }
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/user-not-found':
        return 'User not found';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/email-already-in-use':
        return 'Email is already in use';
      case 'auth/weak-password':
        return 'Password is too weak';
      case 'auth/operation-not-allowed':
        return 'Operation not allowed';
      default:
        return 'Authentication error: ' + errorCode;
    }
  };