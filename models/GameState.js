module.exports = (sequelize, DataTypes) => {
  const GameState = sequelize.define('GameState', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    current_letter: {
      type: DataTypes.STRING(1),
      allowNull: false,
      validate: {
        is: /^[A-Z]$/i
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'game_state',
    timestamps: false,
    underscored: true
  });

  return GameState;
};


