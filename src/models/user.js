const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  googleId: {
    type: DataTypes.STRING,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING
  },
  picture: {
    type: DataTypes.STRING
  },
  emailCredentials: {
    type: DataTypes.JSONB,
    defaultValue: null
  }
}, {
  tableName: 'users',
  timestamps: true
});

module.exports = User; 