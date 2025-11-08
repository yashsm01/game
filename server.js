const express = require('express');
const multer = require('multer');
const aws = require('aws-sdk');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const axios = require('axios');
const { sequelize, GameState, Submission, Winner, testConnection, syncDatabase } = require('./models');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure AWS S3
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('❌ AWS credentials are required. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file');
  process.exit(1);
}

aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-north-1'
});

const s3 = new aws.S3();

const S3_BUCKET = process.env.S3_BUCKET || 'hinex';
const S3_FOLDER = process.env.S3_FOLDER || 'test';
const S3_BASE_URL = process.env.S3_BASE_URL || 'https://hinex.s3.eu-north-1.amazonaws.com/';

// Helper function to upload file to S3
async function uploadToS3(buffer, filename, mimetype) {
  const params = {
    Bucket: S3_BUCKET,
    Key: `${S3_FOLDER}/${filename}`,
    Body: buffer,
    ContentType: mimetype
    // Note: ACL removed because bucket has ACLs disabled
    // Make sure the bucket policy allows public read access if needed
  };

  const result = await s3.upload(params).promise();
  return {
    location: result.Location,
    key: result.Key,
    bucket: result.Bucket
  };
}

// Configure multer to use memory storage (we'll upload to S3 manually)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Initialize database
async function initializeDatabase() {
  try {
    const connected = await testConnection();
    if (!connected) {
      console.error('Failed to connect to database. Please check your PostgreSQL configuration.');
      process.exit(1);
    }
    
    await syncDatabase(false); // Don't force sync in production
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    process.exit(1);
  }
}

// ============ ADMIN ROUTES ============

// Get current game state
app.get('/api/admin/state', async (req, res) => {
  try {
    const gameState = await GameState.findOne({ where: { is_active: true } });
    if (!gameState) {
      return res.json({ current_letter: null, is_active: 0 });
    }
    res.json(gameState.toJSON());
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Set current letter (A-Z)
app.post('/api/admin/set-letter', async (req, res) => {
  try {
    const { letter } = req.body;
    
    if (!letter || !/^[A-Z]$/i.test(letter)) {
      return res.status(400).json({ error: 'Invalid letter. Must be A-Z' });
    }

    const upperLetter = letter.toUpperCase();

    // Deactivate current game state
    await GameState.update(
      { is_active: false },
      { where: { is_active: true } }
    );

    // Create new game state
    const newState = await GameState.create({
      current_letter: upperLetter,
      is_active: true
    });

    res.json({ 
      success: true, 
      current_letter: upperLetter,
      message: `Game letter set to ${upperLetter}` 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get all pending submissions
app.get('/api/admin/submissions', async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    
    const submissions = await Submission.findAll({
      where,
      order: [['submitted_at', 'DESC']]
    });

    res.json(submissions.map(s => s.toJSON()));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get submission by ID
app.get('/api/admin/submission/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await Submission.findByPk(id);
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(submission.toJSON());
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Approve or reject submission
app.post('/api/admin/submission/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, notes } = req.body;

    if (approved === undefined) {
      return res.status(400).json({ error: 'approved field is required' });
    }

    const submission = await Submission.findByPk(id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const status = approved ? 'approved' : 'rejected';
    const approvedAt = approved ? new Date() : null;

    // Check if there's already a winner for this letter
    if (approved) {
      const existingWinner = await Winner.findOne({ where: { letter: submission.letter } });
      if (existingWinner) {
        return res.status(400).json({ 
          error: 'A winner already exists for this letter',
          existing_winner: existingWinner.toJSON()
        });
      }

      // Update submission
      await submission.update({
        status,
        approved_at: approvedAt,
        admin_notes: notes || null
      });

      // Create winner entry
      const winner = await Winner.create({
        submission_id: id,
        player_name: submission.player_name,
        player_wallet: submission.player_wallet,
        letter: submission.letter
      });

      // Distribute NFT reward
      try {
        const nftResult = await distributeNFTReward(
          submission.player_wallet,
          submission.player_name,
          id
        );
        res.json({ 
          success: true, 
          message: 'Submission approved and winner declared!',
          winner_id: winner.id,
          nft_reward: nftResult
        });
      } catch (nftError) {
        console.error('NFT distribution error:', nftError);
        res.json({ 
          success: true, 
          message: 'Submission approved and winner declared, but NFT distribution failed',
          winner_id: winner.id,
          nft_error: nftError.message
        });
      }
    } else {
      // Just reject
      await submission.update({
        status,
        admin_notes: notes || null
      });
      res.json({ success: true, message: 'Submission rejected' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ============ PLAYER ROUTES ============

// Get current letter
app.get('/api/player/current-letter', async (req, res) => {
  try {
    const gameState = await GameState.findOne({ 
      where: { is_active: true },
      attributes: ['current_letter']
    });
    res.json({ letter: gameState ? gameState.current_letter : null });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    console.error('Multer error:', err);
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) {
    console.error('Upload error:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    return res.status(400).json({ error: err.message || 'Upload failed' });
  }
  next();
};

// Submit image
app.post('/api/player/submit', upload.single('image'), handleMulterError, async (req, res) => {
  let s3Key = null;
  try {
    const { playerName, playerWallet, submissionName, letter } = req.body;
    const file = req.file;

    console.log('Submission received:', { playerName, submissionName, letter, hasFile: !!file });

    if (!file) {
      return res.status(400).json({ error: 'No image file provided. Please capture and submit a photo.' });
    }

    if (!playerName || !submissionName || !letter) {
      return res.status(400).json({ error: 'Missing required fields: playerName, submissionName, letter' });
    }

    // Verify letter matches current game letter
    const gameState = await GameState.findOne({ where: { is_active: true } });
    if (!gameState) {
      return res.status(400).json({ error: 'No active game' });
    }

    if (gameState.current_letter.toUpperCase() !== letter.toUpperCase()) {
      return res.status(400).json({ 
        error: `Letter mismatch. Current letter is ${gameState.current_letter}` 
      });
    }

    // Validate submission name starts with the letter
    if (!submissionName.toUpperCase().startsWith(gameState.current_letter)) {
      return res.status(400).json({ 
        error: `Submission name "${submissionName}" must start with letter "${gameState.current_letter}"` 
      });
    }

    // Check if there's already a winner for this letter
    const existingWinner = await Winner.findOne({ where: { letter: gameState.current_letter } });
    if (existingWinner) {
      return res.status(400).json({ error: 'A winner already exists for this letter' });
    }

    // Upload to S3
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `submission-${uniqueSuffix}${ext}`;
    
    console.log('Uploading to S3...', { filename, mimetype: file.mimetype, size: file.size });
    
    const s3Result = await uploadToS3(file.buffer, filename, file.mimetype);
    s3Key = s3Result.key;
    const imageUrl = s3Result.location;
    const imageName = filename;

    console.log('S3 upload successful:', { imageUrl, imageName, key: s3Key });

    // Create submission
    const submission = await Submission.create({
      player_name: playerName,
      player_wallet: playerWallet || null,
      letter: gameState.current_letter,
      image_name: imageName,
      image_path: imageUrl, // Store S3 URL instead of local path
      submission_name: submissionName
    });

    console.log('Submission created:', submission.id);

    res.json({ 
      success: true, 
      message: 'Submission received! Waiting for admin approval.',
      submission_id: submission.id
    });
  } catch (error) {
    console.error('Submission error:', error);
    console.error('Error stack:', error.stack);
    
    // Delete uploaded file from S3 on error
    if (s3Key) {
      try {
        await s3.deleteObject({
          Bucket: S3_BUCKET,
          Key: s3Key
        }).promise();
        console.log('Deleted file from S3 due to error:', s3Key);
      } catch (deleteError) {
        console.error('Error deleting file from S3:', deleteError);
      }
    }
    
    // Return more detailed error message
    const errorMessage = error.message || 'Internal server error';
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get player's submissions
app.get('/api/player/submissions', async (req, res) => {
  try {
    const { playerName } = req.query;
    
    if (!playerName) {
      return res.status(400).json({ error: 'playerName query parameter required' });
    }

    const submissions = await Submission.findAll({
      where: { player_name: playerName },
      order: [['submitted_at', 'DESC']]
    });

    res.json(submissions.map(s => s.toJSON()));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get winners list
app.get('/api/winners', async (req, res) => {
  try {
    const winners = await Winner.findAll({
      order: [['won_at', 'DESC']]
    });
    res.json(winners.map(w => w.toJSON()));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ============ NFT REWARD DISTRIBUTION ============

async function distributeNFTReward(walletAddress, playerName, submissionId) {
  if (!walletAddress) {
    throw new Error('Wallet address required for NFT reward');
  }

  const NFT_API_URL = process.env.NFT_API_URL || 'http://localhost:4000';
  
  try {
    // First, fractionalize NFT (if not already done)
    // This assumes you have an NFT mint address configured
    const nftMintAddress = process.env.NFT_MINT_ADDRESS || 'YOUR_NFT';
    
    // Distribute 1 share to the winner
    const response = await axios.post(`${NFT_API_URL}/api/fractionalize/distribute`, {
      shareTokenMint: process.env.SHARE_TOKEN_MINT || 'FN5YtHKzYGBnz6HhqyGEnf3CBv5EpD7EofZrjndT14JB',
      distributions: [
        {
          recipient: walletAddress,
          recipientName: playerName,
          recipientId: `WINNER-${submissionId}`,
          amount: 1,
          note: `Game winner for letter submission`
        }
      ]
    });

    // Update winner record with NFT token
    await Winner.update(
      {
        nft_token: JSON.stringify(response.data),
        reward_distributed: true
      },
      { where: { submission_id: submissionId } }
    );

    return response.data;
  } catch (error) {
    console.error('NFT Distribution Error:', error.response?.data || error.message);
    throw error;
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test S3 connection
app.get('/api/test-s3', async (req, res) => {
  try {
    // Try to list objects in the bucket to test connection
    const result = await s3.listObjectsV2({
      Bucket: S3_BUCKET,
      Prefix: S3_FOLDER,
      MaxKeys: 1
    }).promise();
    
    res.json({ 
      success: true, 
      message: 'S3 connection successful',
      bucket: S3_BUCKET,
      folder: S3_FOLDER,
      region: process.env.AWS_REGION || 'eu-north-1',
      objectCount: result.KeyCount
    });
  } catch (error) {
    console.error('S3 test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Check AWS credentials and bucket permissions'
    });
  }
});

// Start server
async function startServer() {
  await initializeDatabase();
  
  const HOST = process.env.HOST || '0.0.0.0';
  
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Game server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`🌐 Network access: http://[your-ip]:${PORT}`);
    console.log(`👑 Admin panel: http://localhost:${PORT}/admin.html`);
    console.log(`📸 Player interface: http://localhost:${PORT}/player.html`);
    console.log(`🏆 Results page: http://localhost:${PORT}/results.html`);
    
    // Get network IP addresses
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    console.log('\n📡 Network IPs:');
    Object.keys(networkInterfaces).forEach((interfaceName) => {
      networkInterfaces[interfaceName].forEach((iface) => {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`   http://${iface.address}:${PORT}`);
        }
      });
    });
  });
}

// Initialize database on module load for Vercel
// This will run on cold starts
if (process.env.VERCEL) {
  // For Vercel, initialize database asynchronously
  initializeDatabase().catch(error => {
    console.error('Database initialization error on Vercel:', error);
  });
}

// For Vercel serverless functions
module.exports = app;

// Start server if running directly (not as Vercel function)
if (require.main === module) {
  startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await sequelize.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error closing database:', error);
    process.exit(1);
  }
});

