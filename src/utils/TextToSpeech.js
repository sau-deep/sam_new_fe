// Cache for voices
let cachedVoices = [];

// Function to initialize voices
const initializeVoices = () => {
    return new Promise((resolve) => {
        // Check if voices are already cached
        if (cachedVoices.length > 0) {
            resolve(cachedVoices);
            return;
        }

        // Event listener for when voices are loaded
        const onVoicesChanged = () => {
            cachedVoices = speechSynthesis.getVoices();
            resolve(cachedVoices);
            speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        };

        // Set event listener for voices changed
        speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);

        // Check if voices are already available
        if (speechSynthesis.getVoices().length) {
            onVoicesChanged();
        }
    });
};

// Function to find the best voice for a given language
const findBestVoice = (voices, language) => {
    if (!voices || voices.length === 0) return null;

    // Extract language code (e.g., 'en' from 'en-US', 'hi' from 'hi-IN')
    const langCode = language.split('-')[0].toLowerCase();

    // Try to find a native voice for the language (prefer voices that match the language exactly)
    let bestVoice = voices.find(voice => {
        const voiceLang = voice.lang.toLowerCase();
        return voiceLang.startsWith(langCode) && voice.localService;
    });

    // If no native voice found, try any voice that matches the language
    if (!bestVoice) {
        bestVoice = voices.find(voice => {
            const voiceLang = voice.lang.toLowerCase();
            return voiceLang.startsWith(langCode);
        });
    }

    // If still no match, prefer high-quality voices (Google, Microsoft, or local service)
    if (!bestVoice) {
        bestVoice = voices.find(voice => 
            voice.localService || 
            voice.name.includes('Google') || 
            voice.name.includes('Microsoft') ||
            voice.name.includes('Enhanced')
        );
    }

    // Fallback to default voice
    return bestVoice || voices[0];
};

// Function to speak text
export const speak = async (text, language = 'en-US', onComplete = () => {}) => {
    // Check if speech synthesis is available
    if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis is not supported in this browser');
        onComplete();
        return;
    }

    // Stop any currently playing speech
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        // Small delay to ensure cancel is processed before starting new speech
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Initialize voices and get the cached voices
    const voices = await initializeVoices();

    if (!voices || voices.length === 0) {
        console.warn('No voices available for speech synthesis');
        onComplete();
        return;
    }

    // Create a SpeechSynthesisUtterance
    const utterance = new SpeechSynthesisUtterance(text);

    // Set the language
    utterance.lang = language;

    // Find and set the best voice for the language
    const selectedVoice = findBestVoice(voices, language);
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    // Configure voice quality settings for better clarity
    utterance.rate = 0.9; // Slightly slower for better clarity (range: 0.1 to 10)
    utterance.pitch = 1.0; // Normal pitch (range: 0 to 2)
    utterance.volume = 1.0; // Maximum volume (range: 0 to 1)

    // Set up the onend event handler
    utterance.onend = () => {
        onComplete(); // Call the provided callback function when speech ends
    };

    // Set up the onerror event handler
    utterance.onerror = (event) => {
        // "interrupted" is expected when user stops speech manually - don't treat as error
        if (event.error === 'interrupted') {
            // User intentionally stopped the speech - this is normal behavior
            onComplete(); // Reset state
            return;
        }
        
        // Log other errors but still reset state
        console.warn('Speech synthesis error:', event.error);
        onComplete(); // Call onComplete to reset state even on error
    };

    // Speak the text
    try {
        speechSynthesis.speak(utterance);
    } catch (error) {
        console.error('Error starting speech synthesis:', error);
        onComplete();
    }
};


export const stopSpeak = () => {
    if ('speechSynthesis' in window) {
        // Check if speech is currently speaking or pending
        if (speechSynthesis.speaking || speechSynthesis.pending) {
            speechSynthesis.cancel();
        }
    }
}