module.exports = (sequelize, DataTypes) => {
  const Submission = sequelize.define('Submission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
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
    image_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    image_path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    submission_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    submitted_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'submissions',
    timestamps: false,
    underscored: true
  });

  return Submission;
};


