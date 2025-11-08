module.exports = (sequelize, DataTypes) => {
  const Winner = sequelize.define('Winner', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    submission_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'submissions',
        key: 'id'
      }
    },
    player_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    player_wallet: {
      type: DataTypes.STRING,
      allowNull: true
    },
    letter: {
      type: DataTypes.STRING(1),
      allowNull: false
    },
    nft_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reward_distributed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    won_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'winners',
    timestamps: false,
    underscored: true
  });

  return Winner;
};


