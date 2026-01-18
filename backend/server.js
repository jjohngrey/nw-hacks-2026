const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { decode } = require('wav-decoder');
const path = require('path');
const { Expo } = require('expo-server-sdk');
const os = require('os');
const multer = require('multer');
const twilioService = require('./services/twilioService');

const app = express();
const PORT = 3000;

app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'recorded_fingerprints');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp3|wav|m4a|aac|flac/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('audio/');
    
    if (extname || mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'));
    }
  }
});

// Initialize Expo push notification client
const expo = new Expo();

// Store device push tokens with persistence
const DEVICE_TOKENS_PATH = path.join(__dirname, 'device_tokens.json');
const deviceTokens = new Map(); // Map<userId, pushToken>

// Load device tokens from file on startup
function loadDeviceTokens() {
  try {
    if (fs.existsSync(DEVICE_TOKENS_PATH)) {
      const data = fs.readFileSync(DEVICE_TOKENS_PATH, 'utf8');
      const tokens = JSON.parse(data);
      Object.entries(tokens).forEach(([userId, token]) => {
        deviceTokens.set(userId, token);
      });
      console.log(`📱 Loaded ${deviceTokens.size} device token(s) from storage`);
    }
  } catch (error) {
    console.error('Error loading device tokens:', error.message);
  }
}

// Save device tokens to file
function saveDeviceTokens() {
  try {
    const tokens = Object.fromEntries(deviceTokens);
    fs.writeFileSync(DEVICE_TOKENS_PATH, JSON.stringify(tokens, null, 2));
  } catch (error) {
    console.error('Error saving device tokens:', error.message);
  }
}

// Load tokens on startup
loadDeviceTokens();

// ============================
// Audio Fingerprinting Configuration
// ============================

// CONFIGURATION: Adjust these values to tune matching accuracy
const MATCHING_CONFIG = {
  DEFAULT_THRESHOLD: 0.85,        // INCREASED: Much stricter matching threshold
  MIN_NOTIFICATION_CONFIDENCE: 0.80, // Only send notifications for very confident matches
  NORMALIZE_AUDIO: true,
  HIGH_PASS_FILTER: true,
  HIGH_PASS_CUTOFF: 80,
  LOG_MATCHING: true,
  // New stricter comparison settings
  REQUIRE_TEMPORAL_CONSISTENCY: true,  // Require consistent matching across time
  MIN_CONSISTENT_FRAMES: 0.6,          // At least 60% of frames must match well
  STRICT_SPECTRAL_MATCHING: true       // Use stricter spectral comparison
};

class AudioFingerprint {
  constructor() {
    this.database = new Map();
  }

  // Generate fingerprint from audio file
  async generateFingerprint(audioPath) {
    let wavPath = null;
    try {
      wavPath = await this.convertToWav(audioPath);
      const buffer = fs.readFileSync(wavPath);
      const audioData = await decode(buffer);
      const fingerprint = this.extractFeatures(audioData);
      
      if (wavPath !== audioPath && fs.existsSync(wavPath)) {
        fs.unlinkSync(wavPath);
        console.log(`Cleaned up temporary file: ${wavPath}`);
      }
      
      return fingerprint;
    } catch (error) {
      if (wavPath && wavPath !== audioPath && fs.existsSync(wavPath)) {
        fs.unlinkSync(wavPath);
      }
      throw error;
    }
  }

  convertToWav(inputPath) {
    return new Promise((resolve, reject) => {
      if (inputPath.toLowerCase().endsWith('.wav')) {
        resolve(inputPath);
        return;
      }

      const outputPath = inputPath.replace(/\.\w+$/, '.wav');
      
      ffmpeg(inputPath)
        .toFormat('wav')
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .save(outputPath);
    });
  }

  // IMPROVED: More discriminative feature extraction
  extractFeatures(audioData) {
    let samples = audioData.channelData[0];
    const sampleRate = audioData.sampleRate;
    
    samples = this.normalizeAudio(samples);
    samples = this.highPassFilter(samples, 80, sampleRate);
    
    const fingerprint = [];
    const windowSize = 2048;  // INCREASED for better frequency resolution
    const hopSize = 512;      // DECREASED for more temporal detail
    
    let prevSpectrum = null;
    
    for (let i = 0; i < samples.length - windowSize; i += hopSize) {
      const window = this.applyHannWindow(samples.slice(i, i + windowSize));
      const spectrum = this.computeFullFFT(window);  // CHANGED: Full FFT, no downsampling
      
      // Extract robust features
      const features = {
        // Time-domain features
        energy: this.calculateEnergy(window),
        zcr: this.calculateZeroCrossingRate(window),
        
        // Spectral features - these are most discriminative
        spectralCentroid: this.calculateSpectralCentroid(spectrum, sampleRate),
        spectralFlux: prevSpectrum ? this.calculateSpectralFluxBetween(spectrum, prevSpectrum) : 0,
        spectralRolloff: this.calculateSpectralRolloff(spectrum, sampleRate),
        spectralFlatness: this.calculateSpectralFlatness(spectrum),  // NEW: Distinguishes tonal vs noise
        
        // IMPROVED: More frequency bands with better resolution
        subBass: this.getBandEnergy(spectrum, 20, 60, sampleRate),
        bass: this.getBandEnergy(spectrum, 60, 250, sampleRate),
        lowMid: this.getBandEnergy(spectrum, 250, 500, sampleRate),
        mid: this.getBandEnergy(spectrum, 500, 1000, sampleRate),
        highMid: this.getBandEnergy(spectrum, 1000, 2000, sampleRate),
        upperMid: this.getBandEnergy(spectrum, 2000, 4000, sampleRate),
        presence: this.getBandEnergy(spectrum, 4000, 6000, sampleRate),
        brilliance: this.getBandEnergy(spectrum, 6000, 12000, sampleRate),
        
        // NEW: Peak frequencies for better discrimination
        peakFreq1: this.findPeakFrequency(spectrum, sampleRate, 0, sampleRate / 4),
        peakFreq2: this.findPeakFrequency(spectrum, sampleRate, sampleRate / 4, sampleRate / 2),
        
        // NEW: Spectral contrast between bands
        spectralContrast: this.calculateSpectralContrast(spectrum)
      };
      
      fingerprint.push(features);
      prevSpectrum = spectrum;
    }
    
    return fingerprint;
  }
  
  // NEW: Spectral flatness (Wiener entropy) - distinguishes tones from noise
  calculateSpectralFlatness(spectrum) {
    let geometricMean = 0;
    let arithmeticMean = 0;
    let count = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      if (spectrum[i] > 0) {
        geometricMean += Math.log(spectrum[i]);
        arithmeticMean += spectrum[i];
        count++;
      }
    }
    
    if (count === 0) return 0;
    
    geometricMean = Math.exp(geometricMean / count);
    arithmeticMean = arithmeticMean / count;
    
    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
  }
  
  // NEW: Find dominant frequency in a range
  findPeakFrequency(spectrum, sampleRate, lowFreq, highFreq) {
    const nyquist = sampleRate / 2;
    const lowBin = Math.floor((lowFreq / nyquist) * spectrum.length);
    const highBin = Math.ceil((highFreq / nyquist) * spectrum.length);
    
    let maxMag = 0;
    let peakBin = lowBin;
    
    for (let i = lowBin; i < Math.min(highBin, spectrum.length); i++) {
      if (spectrum[i] > maxMag) {
        maxMag = spectrum[i];
        peakBin = i;
      }
    }
    
    return (peakBin / spectrum.length) * nyquist;
  }
  
  // NEW: Spectral contrast - difference between peaks and valleys
  calculateSpectralContrast(spectrum) {
    const sorted = [...spectrum].sort((a, b) => b - a);
    const topN = Math.floor(spectrum.length * 0.1);
    const bottomN = Math.floor(spectrum.length * 0.1);
    
    const peakMean = sorted.slice(0, topN).reduce((a, b) => a + b, 0) / topN;
    const valleyMean = sorted.slice(-bottomN).reduce((a, b) => a + b, 0) / bottomN;
    
    return valleyMean > 0 ? peakMean / valleyMean : 0;
  }

  normalizeAudio(samples) {
    // Find max amplitude using loop to avoid stack overflow with large arrays
    let maxAmplitude = 0;
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > maxAmplitude) {
        maxAmplitude = abs;
      }
    }
    
    if (maxAmplitude === 0) return samples;
    
    const normalized = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      normalized[i] = samples[i] / maxAmplitude;
    }
    return normalized;
  }

  highPassFilter(samples, cutoffFreq, sampleRate) {
    const RC = 1.0 / (cutoffFreq * 2 * Math.PI);
    const dt = 1.0 / sampleRate;
    const alpha = RC / (RC + dt);
    
    const filtered = new Float32Array(samples.length);
    filtered[0] = samples[0];
    
    for (let i = 1; i < samples.length; i++) {
      filtered[i] = alpha * (filtered[i - 1] + samples[i] - samples[i - 1]);
    }
    
    return filtered;
  }

  applyHannWindow(samples) {
    const windowed = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const multiplier = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (samples.length - 1)));
      windowed[i] = samples[i] * multiplier;
    }
    return windowed;
  }
  
  getBandEnergy(spectrum, lowFreq, highFreq, sampleRate) {
    const nyquist = sampleRate / 2;
    const lowBin = Math.floor((lowFreq / nyquist) * spectrum.length);
    const highBin = Math.ceil((highFreq / nyquist) * spectrum.length);
    
    const startBin = Math.max(0, lowBin);
    const endBin = Math.min(highBin, spectrum.length);
    
    if (startBin >= endBin) return 0;
    
    let energy = 0;
    for (let i = startBin; i < endBin; i++) {
      energy += spectrum[i] * spectrum[i];
    }
    
    return Math.sqrt(energy / (endBin - startBin + 1));
  }

  calculateEnergy(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  calculateZeroCrossingRate(samples) {
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] >= 0 && samples[i - 1] < 0) || 
          (samples[i] < 0 && samples[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / samples.length;
  }

  calculateSpectralCentroid(spectrum, sampleRate) {
    let weightedSum = 0;
    let sum = 0;
    const nyquist = sampleRate / 2;
    
    for (let i = 0; i < spectrum.length; i++) {
      const frequency = (i / spectrum.length) * nyquist;
      weightedSum += frequency * spectrum[i];
      sum += spectrum[i];
    }
    
    return sum > 0 ? weightedSum / sum : 0;
  }

  calculateSpectralFluxBetween(spectrum1, spectrum2) {
    let flux = 0;
    const len = Math.min(spectrum1.length, spectrum2.length);
    
    for (let i = 0; i < len; i++) {
      const diff = spectrum1[i] - spectrum2[i];
      flux += diff * diff;
    }
    
    return Math.sqrt(flux / len);
  }

  calculateSpectralRolloff(spectrum, sampleRate) {
    const totalEnergy = spectrum.reduce((sum, val) => sum + val, 0);
    const threshold = 0.85 * totalEnergy;
    const nyquist = sampleRate / 2;
    
    let cumulativeEnergy = 0;
    for (let i = 0; i < spectrum.length; i++) {
      cumulativeEnergy += spectrum[i];
      if (cumulativeEnergy >= threshold) {
        return (i / spectrum.length) * nyquist;
      }
    }
    
    return nyquist;
  }

  // IMPROVED: More efficient FFT - only compute needed frequency bins
  computeFullFFT(samples) {
    const N = samples.length;
    // Only compute up to 8kHz (bins up to ~512 for typical sample rates)
    // Most discriminative audio content is below 8kHz
    const maxBin = Math.min(512, Math.floor(N / 2));
    const spectrum = new Float32Array(maxBin);
    
    // Precompute angles for efficiency
    for (let k = 0; k < maxBin; k++) {
      let real = 0;
      let imag = 0;
      const freq = (2 * Math.PI * k) / N;
      
      // Sample every 2nd point for speed (still much better than old every 4th)
      for (let n = 0; n < N; n += 2) {
        const angle = freq * n;
        real += samples[n] * Math.cos(angle);
        imag -= samples[n] * Math.sin(angle);
      }
      
      spectrum[k] = Math.sqrt(real * real + imag * imag) / (N / 2);
    }
    
    return spectrum;
  }

  async storeAudio(audioPath, audioId, userId) {
    const fingerprint = await this.generateFingerprint(audioPath);
    this.database.set(audioId, {
      fingerprint,
      userId,
      timestamp: new Date().toISOString()
    });
    console.log(`Stored fingerprint for: ${audioId} (user: ${userId})`);
    return fingerprint;
  }

  async matchAudio(audioPath, threshold = MATCHING_CONFIG.DEFAULT_THRESHOLD, userId = null) {
    const unknownFingerprint = await this.generateFingerprint(audioPath);
    
    let bestMatch = null;
    let bestScore = 0;
    let allScores = [];

    for (const [audioId, storedData] of this.database) {
      if (userId && storedData.userId !== userId) {
        continue;
      }
      
      const storedFingerprint = storedData.fingerprint || storedData;
      const score = this.compareFingerprints(unknownFingerprint, storedFingerprint);
      
      allScores.push({ 
        audioId, 
        score,
        userId: storedData.userId || 'unknown'
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = audioId;
      }
    }

    allScores.sort((a, b) => b.score - a.score);
    
    if (MATCHING_CONFIG.LOG_MATCHING) {
      console.log('\n🔍 MATCHING RESULTS:');
      console.log(`  Threshold: ${(threshold * 100).toFixed(1)}%`);
      console.log(`  Best Score: ${(bestScore * 100).toFixed(1)}%`);
      console.log(`  Match Found: ${bestScore >= threshold ? '✅ YES' : '❌ NO'}`);
      if (allScores.length > 0) {
        console.log('  Top 3 matches:');
        allScores.slice(0, 3).forEach((score, i) => {
          const percent = (score.score * 100).toFixed(1);
          const indicator = score.score >= threshold ? '✓' : '✗';
          console.log(`    ${i + 1}. [${indicator}] ${score.audioId}: ${percent}% (user: ${score.userId})`);
        });
      }
      console.log('');
    }

    if (bestScore >= threshold) {
      return { match: bestMatch, confidence: bestScore, allScores };
    }
    
    return { match: null, confidence: bestScore, allScores };
  }

  // COMPLETELY REWRITTEN: Stricter comparison with temporal consistency
  compareFingerprints(fp1, fp2) {
    // Require minimum overlap
    const minLen = Math.min(fp1.length, fp2.length);
    if (minLen < 10) return 0; // Too short to reliably compare
    
    // CHANGED: No more sliding window - require proper alignment
    // This prevents matching random portions of different sounds
    const score = this.compareFingerprintsAligned(fp1, fp2);
    
    // Length penalty for very different durations
    const lengthRatio = minLen / Math.max(fp1.length, fp2.length);
    const lengthPenalty = lengthRatio < 0.7 ? 0.85 : 1.0;
    
    return score * lengthPenalty;
  }

  // NEW: Strict aligned comparison with temporal consistency requirement
  compareFingerprintsAligned(fp1, fp2) {
    const len = Math.min(fp1.length, fp2.length);
    
    // NEW: Stricter feature weights emphasizing spectral characteristics
    const weights = {
      // De-emphasize energy (too volume-dependent)
      energy: 0.01,
      zcr: 0.03,
      
      // Emphasize spectral shape features
      spectralCentroid: 0.12,
      spectralFlux: 0.10,
      spectralRolloff: 0.10,
      spectralFlatness: 0.08,      // NEW
      spectralContrast: 0.08,      // NEW
      
      // Frequency bands - the spectral "signature"
      subBass: 0.06,
      bass: 0.08,
      lowMid: 0.07,
      mid: 0.08,
      highMid: 0.06,
      upperMid: 0.05,
      presence: 0.04,
      brilliance: 0.02,
      
      // Peak frequencies are very discriminative
      peakFreq1: 0.01,
      peakFreq2: 0.01
    };

    let frameSimilarities = [];
    
    for (let i = 0; i < len; i++) {
      const f1 = fp1[i];
      const f2 = fp2[i];
      
      let frameSimilarity = 0;
      
      for (const [feature, weight] of Object.entries(weights)) {
        const v1 = f1[feature] || 0;
        const v2 = f2[feature] || 0;
        
        // CHANGED: Much stricter comparison
        let similarity = 0;
        
        if (feature.startsWith('peakFreq')) {
          // For peak frequencies, require very close match
          const maxFreq = Math.max(v1, v2, 1);
          const freqDiff = Math.abs(v1 - v2);
          similarity = Math.exp(-freqDiff / (maxFreq * 0.1)); // Within 10% of frequency
        } else {
          // For other features, use stricter exponential decay
          const maxVal = Math.max(Math.abs(v1), Math.abs(v2), 0.001);
          const normalizedDiff = Math.abs(v1 - v2) / maxVal;
          
          // CHANGED: Much stricter - was 0.8, now 2.0
          similarity = Math.exp(-normalizedDiff * 2.0);
        }
        
        frameSimilarity += similarity * weight;
      }
      
      frameSimilarities.push(frameSimilarity);
    }
    
    // IMPROVED: Require temporal consistency
    if (MATCHING_CONFIG.REQUIRE_TEMPORAL_CONSISTENCY) {
      // Count how many frames are "good matches" (>0.7 similarity)
      const goodFrames = frameSimilarities.filter(s => s > 0.7).length;
      const consistencyRatio = goodFrames / frameSimilarities.length;
      
      // Require at least 60% of frames to match well
      if (consistencyRatio < MATCHING_CONFIG.MIN_CONSISTENT_FRAMES) {
        // Apply heavy penalty for inconsistent matching
        const avgSimilarity = frameSimilarities.reduce((a, b) => a + b, 0) / len;
        return avgSimilarity * 0.5; // 50% penalty
      }
    }
    
    // Return average similarity across all frames
    return frameSimilarities.reduce((a, b) => a + b, 0) / len;
  }

  getAllAudioIds(userId = null) {
    if (userId) {
      const filtered = [];
      for (const [audioId, storedData] of this.database) {
        if (storedData.userId === userId) {
          filtered.push(audioId);
        }
      }
      return filtered;
    }
    return Array.from(this.database.keys());
  }

  getAllFingerprints(userId = null) {
    const results = [];
    for (const [audioId, storedData] of this.database) {
      if (userId && storedData.userId !== userId) {
        continue;
      }

      const fingerprintData = storedData.fingerprint || storedData;
      const userData = storedData.userId || null;
      const timestamp = storedData.timestamp || null;

      results.push({
        audioId,
        userId: userData,
        timestamp,
        fingerprintLength: Array.isArray(fingerprintData) ? fingerprintData.length : 0
      });
    }
    return results;
  }

  deleteAudio(audioId) {
    return this.database.delete(audioId);
  }

  saveDatabase(filepath) {
    const data = JSON.stringify(Array.from(this.database.entries()));
    fs.writeFileSync(filepath, data);
  }

  loadDatabase(filepath) {
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf8');
      this.database = new Map(JSON.parse(data));
      console.log(`Loaded ${this.database.size} fingerprints from database`);
    }
  }
}

// Initialize fingerprinter
const fingerprinter = new AudioFingerprint();
const FINGERPRINTS_DIR = path.join(__dirname, 'user_fingerprints');
const DB_PATH = path.join(FINGERPRINTS_DIR, 'fingerprints.json');

if (!fs.existsSync(FINGERPRINTS_DIR)) {
  fs.mkdirSync(FINGERPRINTS_DIR, { recursive: true });
  console.log('Created user_fingerprints directory');
}

fingerprinter.loadDatabase(DB_PATH);

// ============================
// Push Notification Functions
// ============================

async function sendPushNotification(userId, title, body, data = {}) {
  const pushToken = deviceTokens.get(userId);
  
  if (!pushToken) {
    console.log(`No push token found for user: ${userId}`);
    return { success: false, error: 'No push token registered' };
  }

  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return { success: false, error: 'Invalid push token' };
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    priority: 'high',
  };

  try {
    const ticket = await expo.sendPushNotificationsAsync([message]);
    console.log(`Push notification sent to ${userId}:`, ticket);
    return { success: true, ticket };
  } catch (error) {
    console.error(`Error sending push notification to ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

app.get('/', (req, res) => {
  res.json({ 
    message: 'Audio Fingerprinting API',
    endpoints: {
      'POST /api/audio/fingerprint': 'Store an audio fingerprint',
      'POST /api/audio/match': 'Match unknown audio',
      'GET /api/audio/fingerprints': 'Get all stored fingerprints',
      'DELETE /api/audio/fingerprint/:id': 'Delete a fingerprint',
      'POST /api/notifications/register': 'Register device for push notifications',
      'POST /api/notifications/test': 'Send a test notification',
      'GET /api/notifications/devices': 'List all registered devices',
      'DELETE /api/notifications/device/:userId': 'Remove a specific device',
      'DELETE /api/notifications/devices/clear': 'Clear all registered devices',
      'POST /api/alerts/checkin': 'Send check-in SMS to caregiver (I\'m OK)',
      'POST /api/alerts/emergency': 'Send emergency SMS to caregiver (Need Help)'
    }
  });
});

app.post('/api/audio/fingerprint', async (req, res) => {
  try {
    const { audioFilePath, audioId, userId } = req.body;

    if (!audioFilePath || !audioId || !userId) {
      return res.status(400).json({ 
        error: 'audioFilePath, audioId, and userId are required' 
      });
    }

    if (!fs.existsSync(audioFilePath)) {
      return res.status(404).json({ 
        error: 'Audio file not found' 
      });
    }

    await fingerprinter.storeAudio(audioFilePath, audioId, userId);
    fingerprinter.saveDatabase(DB_PATH);

    res.json({ 
      success: true, 
      message: `Fingerprint stored for: ${audioId} (user: ${userId})` 
    });
  } catch (error) {
    console.error('Error storing fingerprint:', error);
    res.status(500).json({ 
      error: 'Failed to store fingerprint', 
      details: error.message 
    });
  }
});

app.post('/api/audio/upload', upload.single('audioFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const { audioId, userId } = req.body;

    if (!audioId || !userId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: 'audioId and userId are required' 
      });
    }

    const audioFilePath = req.file.path;
    console.log(`📤 Received audio upload: ${req.file.filename} from user: ${userId}`);

    let mp3FilePath = audioFilePath;
    const fileExtension = path.extname(req.file.filename).toLowerCase();
    
    if (fileExtension !== '.mp3') {
      console.log(`🔄 Converting ${fileExtension} to MP3...`);
      mp3FilePath = audioFilePath.replace(fileExtension, '.mp3');
      
      await new Promise((resolve, reject) => {
        ffmpeg(audioFilePath)
          .toFormat('mp3')
          .audioCodec('libmp3lame')
          .audioBitrate('192k')
          .on('end', () => {
            console.log('✅ Conversion to MP3 complete');
            try {
              fs.unlinkSync(audioFilePath);
              console.log(`🗑️  Deleted original file: ${path.basename(audioFilePath)}`);
            } catch (e) {
              console.error('Warning: Could not delete original file:', e.message);
            }
            resolve();
          })
          .on('error', (err) => {
            console.error('❌ FFmpeg conversion error:', err);
            reject(err);
          })
          .save(mp3FilePath);
      });
    }

    await fingerprinter.storeAudio(mp3FilePath, audioId, userId);
    fingerprinter.saveDatabase(DB_PATH);

    res.json({ 
      success: true, 
      message: `Audio fingerprint created for: ${audioId}`,
      audioId,
      userId,
      filename: path.basename(mp3FilePath),
      format: 'mp3'
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
      
      try {
        const mp3Path = req.file.path.replace(path.extname(req.file.path), '.mp3');
        if (fs.existsSync(mp3Path)) {
          fs.unlinkSync(mp3Path);
        }
      } catch (e) {}
    }
    res.status(500).json({ 
      error: 'Failed to process audio upload', 
      details: error.message 
    });
  }
});

app.post('/api/audio/match', async (req, res) => {
  try {
    const { audioFilePath, threshold, userId, matchOwnOnly } = req.body;

    if (!audioFilePath) {
      return res.status(400).json({ 
        error: 'audioFilePath is required' 
      });
    }

    if (!fs.existsSync(audioFilePath)) {
      return res.status(404).json({ 
        error: 'Audio file not found' 
      });
    }

    const filterUserId = (matchOwnOnly && userId) ? userId : null;
    
    const result = await fingerprinter.matchAudio(
      audioFilePath, 
      threshold || MATCHING_CONFIG.DEFAULT_THRESHOLD,
      filterUserId
    );

    // IMPROVED: Only send notification for high-confidence matches
    if (result && result.match && userId && 
        result.confidence >= MATCHING_CONFIG.MIN_NOTIFICATION_CONFIDENCE) {
      const confidencePercent = (result.confidence * 100).toFixed(1);
      await sendPushNotification(
        userId,
        '🎵 Audio Match Found!',
        `Matched: ${result.match} (${confidencePercent}% confidence)`,
        {
          matchId: result.match,
          confidence: result.confidence,
          timestamp: new Date().toISOString()
        }
      );
    }

    if (result && result.match) {
      res.json({
        success: true,
        match: result.match,
        confidence: result.confidence,
        confidencePercent: `${(result.confidence * 100).toFixed(1)}%`,
        allScores: result.allScores
      });
    } else {
      res.json({
        success: true,
        match: null,
        confidence: result?.confidence || 0,
        message: 'No match found',
        allScores: result?.allScores || []
      });
    }
  } catch (error) {
    console.error('Error matching audio:', error);
    res.status(500).json({ 
      error: 'Failed to match audio', 
      details: error.message 
    });
  }
});

app.get('/api/audio/fingerprints', (req, res) => {
  try {
    const { userId } = req.query;
    const fingerprints = fingerprinter.getAllFingerprints(userId);
    
    res.json({
      success: true,
      count: fingerprints.length,
      fingerprints: fingerprints,
      filteredBy: userId || 'none'
    });
  } catch (error) {
    console.error('Error retrieving fingerprints:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve fingerprints', 
      details: error.message 
    });
  }
});

app.delete('/api/audio/fingerprint/:id', (req, res) => {
  try {
    const audioId = req.params.id;
    const deleted = fingerprinter.deleteAudio(audioId);

    if (deleted) {
      fingerprinter.saveDatabase(DB_PATH);
      res.json({
        success: true,
        message: `Fingerprint deleted: ${audioId}`
      });
    } else {
      res.status(404).json({
        error: `Fingerprint not found: ${audioId}`
      });
    }
  } catch (error) {
    console.error('Error deleting fingerprint:', error);
    res.status(500).json({ 
      error: 'Failed to delete fingerprint', 
      details: error.message 
    });
  }
});

// ============================
// Push Notification Endpoints
// ============================

app.post('/api/notifications/register', (req, res) => {
  try {
    const { userId, pushToken } = req.body;
    
    console.log('📥 Registration request received:');
    console.log('   UserId:', userId);
    console.log('   Push Token:', pushToken);

    if (!userId || !pushToken) {
      console.log('❌ Missing userId or pushToken');
      return res.status(400).json({
        error: 'userId and pushToken are required'
      });
    }

    if (!Expo.isExpoPushToken(pushToken)) {
      console.log('❌ Invalid push token format:', pushToken);
      return res.status(400).json({
        error: 'Invalid Expo push token format',
        receivedToken: pushToken
      });
    }

    deviceTokens.set(userId, pushToken);
    saveDeviceTokens();
    console.log(`✅ Registered push token for user: ${userId}`);

    res.json({
      success: true,
      message: `Push notifications enabled for user: ${userId}`
    });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({
      error: 'Failed to register push token',
      details: error.message
    });
  }
});

app.post('/api/notifications/test', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required'
      });
    }

    const result = await sendPushNotification(
      userId,
      '🔔 Test Notification',
      'Your push notifications are working!',
      { test: true }
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Test notification sent',
        ticket: result.ticket
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      error: 'Failed to send test notification',
      details: error.message
    });
  }
});

app.get('/api/notifications/devices', (req, res) => {
  try {
    const devices = Array.from(deviceTokens.keys());
    res.json({
      success: true,
      count: devices.length,
      devices: devices
    });
  } catch (error) {
    console.error('Error listing devices:', error);
    res.status(500).json({
      error: 'Failed to list devices',
      details: error.message
    });
  }
});

app.delete('/api/notifications/device/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (deviceTokens.has(userId)) {
      deviceTokens.delete(userId);
      saveDeviceTokens();
      console.log(`🗑️ Removed device: ${userId}`);
      res.json({
        success: true,
        message: `Device removed: ${userId}`
      });
    } else {
      res.status(404).json({
        error: `Device not found: ${userId}`
      });
    }
  } catch (error) {
    console.error('Error removing device:', error);
    res.status(500).json({
      error: 'Failed to remove device',
      details: error.message
    });
  }
});

app.delete('/api/notifications/devices/clear', (req, res) => {
  try {
    const count = deviceTokens.size;
    deviceTokens.clear();
    saveDeviceTokens();
    console.log(`🗑️ Cleared all ${count} registered devices`);
    res.json({
      success: true,
      message: `Cleared ${count} devices`
    });
  } catch (error) {
    console.error('Error clearing devices:', error);
    res.status(500).json({
      error: 'Failed to clear devices',
      details: error.message
    });
  }
});

// ============================
// Twilio Alert Endpoints
// ============================

app.post('/api/alerts/checkin', async (req, res) => {
  try {
    const { userId, firstName, caregiverName, caregiverPhone } = req.body;
    
    console.log('📥 Check-in request received:', { firstName, caregiverName, caregiverPhone });
    
    if (!caregiverPhone) {
      return res.status(400).json({ 
        error: 'Caregiver phone number is required' 
      });
    }
    
    const formattedPhone = twilioService.formatPhoneNumber(caregiverPhone);
    const personName = firstName || 'Your loved one';
    console.log('📝 Using personName in message:', personName);
    const message = `✓ ${personName} checked in and is doing okay. - What Was That`;
    
    const result = await twilioService.sendSMS(formattedPhone, message);
    
    if (result.success) {
      console.log(`📱 Check-in SMS sent to ${caregiverName} (${formattedPhone})`);
      res.json({ 
        success: true, 
        message: 'Caregiver notified',
        messageSid: result.sid
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send SMS', 
        details: result.error 
      });
    }
    
  } catch (error) {
    console.error('Error in checkin endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to process check-in', 
      details: error.message 
    });
  }
});

app.post('/api/alerts/emergency', async (req, res) => {
  try {
    const { userId, firstName, caregiverName, caregiverPhone } = req.body;
    
    console.log('📥 Emergency request received:', { firstName, caregiverName, caregiverPhone });
    
    if (!caregiverPhone) {
      return res.status(400).json({ 
        error: 'Caregiver phone number is required' 
      });
    }
    
    const formattedPhone = twilioService.formatPhoneNumber(caregiverPhone);
    const personName = firstName || 'Your loved one';
    console.log('📝 Using personName in message:', personName);
    const message = `🚨 URGENT: ${personName} needs help! They pressed the emergency alert button. Please check on them immediately. - What Was That`;
    
    const result = await twilioService.sendSMS(formattedPhone, message);
    
    if (result.success) {
      console.log(`🚨 EMERGENCY SMS sent to ${caregiverName} (${formattedPhone})`);
      
      if (userId) {
        await sendPushNotification(
          userId,
          '🚨 Emergency Alert Sent',
          'Your caregiver has been notified.',
          { type: 'emergency', timestamp: new Date().toISOString() }
        );
      }
      
      res.json({ 
        success: true, 
        message: 'Emergency alert sent to caregiver',
        messageSid: result.sid
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send emergency SMS', 
        details: result.error 
      });
    }
    
  } catch (error) {
    console.error('Error in emergency endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to process emergency alert', 
      details: error.message 
    });
  }
});

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.post('/api/audio/trigger', upload.single('audioFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const { userId, timestamp } = req.body;

    console.log(`🔔 Trigger received: ${req.file.filename} from user: ${userId || 'unknown'}`);

    res.status(200).json({ 
      success: true,
      message: 'Trigger audio saved',
      filename: req.file.filename,
      timestamp: timestamp || Date.now()
    });

  } catch (error) {
    console.error('❌ Error saving trigger:', error);
    res.status(500).json({ 
      error: 'Failed to save trigger audio',
      details: error.message 
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  
  console.log(`🎵 Audio Fingerprinting Server running!`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${localIp}:${PORT}`);
  console.log(`📚 Loaded ${fingerprinter.database.size} fingerprints from database`);
  console.log(`\n💡 Use the Network URL when testing on a physical device`);
});