const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  answer: {
    type: String,
    required: true
  }
}, { _id: false });

const resultSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  level: {
    type: String,
    required: [true, 'Level is required'],
    enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'easy']
  },
  score: {
    type: Number,
    required: true,
    min: 0
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  color_level: {
    type: String,
    required: true,
    enum: ['weak', 'medium', 'high']
  },
  answers: {
    type: [answerSchema],
    default: []
  },
  completed_at: {
    type: Date,
    default: Date.now
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

// Indexes for faster queries
resultSchema.index({ user_id: 1, level: 1 });
resultSchema.index({ completed_at: -1 });

const Result = mongoose.model('Result', resultSchema);

module.exports = Result;

