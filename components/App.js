// App.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Image, TextInput, ScrollView, Modal, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import styles from './styles';
import { auth, db } from './firebase'; // Import Firebase services
import { 
  handleLogin, 
  handleRegister, 
  handleLogout, 
  listenForAuthState 
} from './auth';
// Default card images if no custom images are provided
const DEFAULT_IMAGES = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦉'
];

const Container = Platform.OS === 'web' ? View : SafeAreaView;



export default function App() {
  // Game state
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [players, setPlayers] = useState([
    { name: 'Player 1', score: 0, color: '#3498db' },
    { name: 'Player 2', score: 0, color: '#e74c3c' }
  ]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [customImages, setCustomImages] = useState([]);
  const [showSetup, setShowSetup] = useState(true);
  const [numPairs, setNumPairs] = useState(8);
  const [tempPlayerName, setTempPlayerName] = useState('');
  const [showImageManager, setShowImageManager] = useState(false);
  // Authentication state
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Check authentication state on app start
  useEffect(() => {
    const unsubscribe = listenForAuthState(setUser, setIsLoading);
    return () => unsubscribe();
  }, []);

  // Load saved custom images on startup
  useEffect(() => {
    (async () => {
      // Request permissions first for image picker
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to use custom images!');
        }
      }
      
      if (user) {
        loadCustomImages();
      }
    })();
  }, []);

  useEffect(() => {
    if (user) {
      console.log('User state updated:', user);
      loadCustomImages(); // Call loadCustomImages only after user is set
    }
  }, [user]); // Run this effect whenever the user state changes

  const loadCustomImages = async () => {
    console.log('Loading custom images for user:', user);
    if (!user || !user.uid) {
      console.warn('User is not authenticated. Cannot load custom images.');
      return;
    }
  
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.customImages) {
          setCustomImages(data.customImages);
        }
      } else {
        console.log('No custom images found for this user.');
      }
    } catch (e) {
      console.error('Failed to load custom images from Firestore:', e);
    }
  };

  const saveCustomImages = async (images) => {
    if (!user || !user.uid) {
      console.warn('User is not authenticated. Cannot save custom images.');
      return;
    }
  
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { customImages: images }, { merge: true });
      console.log('Custom images saved to Firestore');
    } catch (e) {
      console.error('Failed to save custom images to Firestore:', e);
    }
  };

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not supported', 'Image picking is not supported on the web.');
      return;
    }
  
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
  
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = [...customImages, result.assets[0].uri];
        setCustomImages(newImages);
        saveCustomImages(newImages);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const initGame = () => {
    // Choose card values to use (custom images or default emojis)
    let cardValues = [];
    
    if (customImages.length >= numPairs) {
      // Use custom images - take a random subset if we have more than needed
      const shuffledImages = [...customImages].sort(() => Math.random() - 0.5);
      cardValues = shuffledImages.slice(0, numPairs);
    } else {
      // Use default emojis
      cardValues = DEFAULT_IMAGES.slice(0, numPairs);
    }

    // Create pairs of cards and shuffle
    const cardPairs = [...cardValues, ...cardValues];
    const shuffledCards = cardPairs
      .map((value, index) => ({ 
        value, 
        id: Math.random(), 
        isImage: customImages.includes(value) 
      }))
      .sort(() => Math.random() - 0.5);
    
    // Reset game state
    setCards(shuffledCards);
    setFlippedIndices([]);
    setMatchedPairs([]);
    setCurrentPlayerIndex(0);
    setGameOver(false);
    
    // Reset player scores
    setPlayers(players.map(player => ({ ...player, score: 0 })));
    
    setIsGameStarted(true);
    setShowSetup(false);
  };

  const addPlayer = () => {
    if (players.length < 4 && tempPlayerName.trim()) {
      const playerColors = ['#3498db', '#e74c3c', '#27ae60', '#f39c12'];
      const newPlayer = {
        name: tempPlayerName.trim(),
        score: 0,
        color: playerColors[players.length]
      };
      setPlayers([...players, newPlayer]);
      setTempPlayerName('');
    }
  };

  const removePlayer = (index) => {
    if (players.length > 2) {
      const newPlayers = [...players];
      newPlayers.splice(index, 1);
      setPlayers(newPlayers);
    }
  };

  const handleCardPress = (index) => {
    // Prevent action when card is already flipped or matched
    if (
      flippedIndices.includes(index) || 
      matchedPairs.includes(cards[index].value) ||
      flippedIndices.length >= 2
    ) {
      return;
    }

    // Flip the card
    const newFlippedIndices = [...flippedIndices, index];
    setFlippedIndices(newFlippedIndices);

    // If we have 2 cards flipped, check for match
    if (newFlippedIndices.length === 2) {
      const [firstIndex, secondIndex] = newFlippedIndices;
      const firstCard = cards[firstIndex];
      const secondCard = cards[secondIndex];
      
      // Check if the cards match
      if (firstCard.value === secondCard.value) {
        // Update current player's score
        const updatedPlayers = [...players];
        updatedPlayers[currentPlayerIndex].score += 1;
        setPlayers(updatedPlayers);
        
        setMatchedPairs([...matchedPairs, firstCard.value]);
        setFlippedIndices([]);
        
        // Check if game is over (all pairs matched)
        if (matchedPairs.length + 1 === numPairs) {
          setGameOver(true);
        }
      } else {
        // If no match, flip cards back after a delay and change player
        setTimeout(() => {
          setFlippedIndices([]);
          setCurrentPlayerIndex((currentPlayerIndex + 1) % players.length);
        }, 1000);
      }
    }
  };

  const renderCard = (card, index) => {
    const isFlipped = flippedIndices.includes(index);
    const isMatched = matchedPairs.includes(card.value);
    
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.card,
          (isFlipped || isMatched) && styles.cardFlipped
        ]}
        onPress={() => handleCardPress(index)}
        activeOpacity={0.8}
      >
        {(isFlipped || isMatched) ? (
          card.isImage ? (
            <Image source={{ uri: card.value }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <Text style={styles.cardText}>{card.value}</Text>
          )
        ) : (
          <Text style={styles.cardBack}>?</Text>
        )}
      </TouchableOpacity>
    );
  };

  const getWinners = () => {
    const maxScore = Math.max(...players.map(player => player.score));
    return players.filter(player => player.score === maxScore);
  };

  const playAgain = () => {
    initGame();
  };

  const resetGame = () => {
    setIsGameStarted(false);
    setShowSetup(true);
    setGameOver(false);
  };

  if (isLoading) {
    return (
      <Container style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading...</Text>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container style={styles.authContainer}>
        <Text style={styles.authTitle}>Memory Card Game</Text>
        <View style={styles.authCard}>
          <Text style={styles.authCardTitle}>
            {isRegistering ? 'Create Account' : 'Login'}
          </Text>
          
          {authError ? (
            <Text style={styles.errorText}>{authError}</Text>
          ) : null}
          
          <TextInput
            style={styles.authInput}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.authInput}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          {isRegistering && (
            <TextInput
              style={styles.authInput}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          )}
          
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => isRegistering 
              ? handleRegister(email, password, confirmPassword, setAuthError, setIsLoading) 
              : handleLogin(email, password, setAuthError, setIsLoading)}
          >
            <Text style={styles.authButtonText}>
              {isRegistering ? 'Register' : 'Login'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.switchAuthButton}
            onPress={() => {
              setIsRegistering(!isRegistering);
              setAuthError('');
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }}
          >
            <Text style={styles.switchAuthText}>
              {isRegistering 
                ? 'Already have an account? Login' 
                : 'Need an account? Register'}
            </Text>
          </TouchableOpacity>
        </View>
      </Container>
    );
  }


  // Game setup screen
  if (showSetup) {
    return (
      <Container style={styles.container}>
        <Text style={styles.title}>Memory Card Game Setup</Text>
        
        <View style={styles.setupSection}>
          <Text style={styles.sectionTitle}>Number of Card Pairs</Text>
          <View style={styles.pairSelector}>
            <TouchableOpacity 
              style={styles.pairButton} 
              onPress={() => setNumPairs(Math.max(4, numPairs - 1))}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.pairCount}>{numPairs}</Text>
            <TouchableOpacity 
              style={styles.pairButton} 
              onPress={() => setNumPairs(Math.min(16, numPairs + 1))}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={[styles.setupButton, { backgroundColor: '#e74c3c' }]} 
          onPress = {() => handleLogout(setIsGameStarted, setShowSetup)}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
        
        <View style={styles.setupSection}>
          <Text style={styles.sectionTitle}>Players ({players.length})</Text>
          {players.map((player, index) => (
            <View key={index} style={styles.playerRow}>
              <View style={[styles.playerColor, { backgroundColor: player.color }]} />
              <Text style={styles.playerName}>{player.name}</Text>
              {players.length > 2 && (
                <TouchableOpacity onPress={() => removePlayer(index)}>
                  <Text style={styles.removeButton}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          
          {players.length < 4 && (
            <View style={styles.addPlayerRow}>
              <TextInput 
                style={styles.playerInput}
                placeholder="New player name"
                value={tempPlayerName}
                onChangeText={setTempPlayerName}
                maxLength={15}
              />
              <TouchableOpacity style={styles.addButton} onPress={addPlayer}>
                <Text style={styles.buttonText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.setupButton} 
          onPress={() => setShowImageManager(true)}
        >
          <Text style={styles.buttonText}>Manage Custom Images ({customImages.length})</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.setupButton, styles.startButton]} 
          onPress={initGame}
        >
          <Text style={styles.buttonText}>Start Game</Text>
        </TouchableOpacity>
        
        {/* Image Manager Modal */}
        <Modal
          visible={showImageManager}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowImageManager(false)}
        >
          <Container style={styles.modalContainer}>
            <Text style={styles.title}>Custom Images</Text>
            
            <ScrollView style={styles.imageGrid} contentContainerStyle={styles.imageGridContent}>
              {customImages.map((uri, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image 
                    source={{ uri }} 
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              
              <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                <Text style={styles.addImageText}>+</Text>
              </TouchableOpacity>
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowImageManager(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </Container>
        </Modal>
      </Container>
    );
  }

  // Main game screen
  return (
    <Container style={styles.container}>
      <Text style={styles.title}>Memory Card Game</Text>
      
      {/* Player scores */}
      <View style={styles.playersContainer}>
        {players.map((player, index) => (
          <View 
            key={index} 
            style={[
              styles.playerScore,
              currentPlayerIndex === index && styles.activePlayer,
              { borderColor: player.color }
            ]}
          >
            <Text style={styles.playerScoreName}>{player.name}</Text>
            <Text style={styles.playerScoreValue}>{player.score}</Text>
          </View>
        ))}
      </View>
      
      {/* Game board */}
      <View style={styles.board}>
        {cards.map((card, index) => renderCard(card, index))}
      </View>

      {/* Current player turn indicator */}
      {!gameOver && (
        <Text style={[styles.currentPlayer, { color: players[currentPlayerIndex].color }]}>
          {players[currentPlayerIndex].name}'s turn
        </Text>
      )}

      {/* Game over screen */}
      {gameOver && (
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverText}>Game Over!</Text>
          
          {getWinners().length === 1 ? (
            <Text style={styles.winnerText}>
              {getWinners()[0].name} wins with {getWinners()[0].score} pairs!
            </Text>
          ) : (
            <View>
              <Text style={styles.winnerText}>It's a tie!</Text>
              <Text style={styles.tieDetails}>
                {getWinners().map(winner => winner.name).join(' & ')} - {getWinners()[0].score} pairs
              </Text>
            </View>
          )}
          
          <View style={styles.gameOverButtonContainer}>
            <TouchableOpacity style={styles.gameOverButton} onPress={playAgain}>
              <Text style={styles.gameOverButtonText}>Play Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.gameOverButton, {backgroundColor: '#34495e'}]} onPress={resetGame}>
              <Text style={styles.gameOverButtonText}>Back to Setup</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Game controls */}
      {!gameOver && (
        <TouchableOpacity style={styles.restartButton} onPress={resetGame}>
          <Text style={styles.buttonText}>Back to Setup</Text>
        </TouchableOpacity>
      )}
    </Container>
  );
}