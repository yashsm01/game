const { Sequelize } = require('sequelize');
const config = require('../database/config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

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


