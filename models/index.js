const { Sequelize } = require('sequelize');
const config = require('../database/config');

// Validate config is loaded
if (!config) {
  throw new Error('Database configuration file could not be loaded');
}

// On Vercel, default to production if NODE_ENV is not set
const env = process.env.NODE_ENV || (process.env.VERCEL ? 'production' : 'development');
const dbConfig = config[env];

// Validate dbConfig exists
if (!dbConfig) {
  const availableEnvs = config ? Object.keys(config).join(', ') : 'none';
  throw new Error(
    `Database configuration not found for environment: "${env}". ` +
    `NODE_ENV: "${process.env.NODE_ENV}", VERCEL: "${process.env.VERCEL}". ` +
    `Available environments: ${availableEnvs}`
  );
}

// Validate required dbConfig properties
if (!dbConfig.database || !dbConfig.username || !dbConfig.host) {
  throw new Error(
    `Database configuration is incomplete for environment: "${env}". ` +
    `Missing: database=${!!dbConfig.database}, username=${!!dbConfig.username}, host=${!!dbConfig.host}`
  );
}

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    dialectOptions: dbConfig.dialectOptions || {},
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Import models
const GameState = require('./GameState')(sequelize, Sequelize.DataTypes);
const Submission = require('./Submission')(sequelize, Sequelize.DataTypes);
const Winner = require('./Winner')(sequelize, Sequelize.DataTypes);

// Define associations
Winner.belongsTo(Submission, { foreignKey: 'submission_id', as: 'submission' });
Submission.hasOne(Winner, { foreignKey: 'submission_id', as: 'winner' });

// Test connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to PostgreSQL database:', error);
    return false;
  }
}

// Sync database
async function syncDatabase(force = false) {
  try {
    await sequelize.sync({ force });
    console.log('✅ Database synchronized successfully.');
    
    // Initialize with first letter if no state exists
    const existingState = await GameState.findOne({ where: { is_active: true } });
    if (!existingState) {
      await GameState.create({ current_letter: 'A', is_active: true });
      console.log('✅ Initialized game with letter A');
    }
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  GameState,
  Submission,
  Winner,
  testConnection,
  syncDatabase
};


