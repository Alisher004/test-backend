const mongoose = require('mongoose');

const testSettingsSchema = new mongoose.Schema({
  level: {
    type: String,
    required: [true, 'Level is required'],
    unique: true,
    enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'easy']
  },
  time_minutes: {
    type: Number,
    required: [true, 'Time in minutes is required'],
    min: [1, 'Time must be at least 1 minute'],
    max: [300, 'Time cannot exceed 300 minutes']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for faster lookups
testSettingsSchema.index({ level: 1 });

const TestSettings = mongoose.model('TestSettings', testSettingsSchema);

module.exports = TestSettings;

