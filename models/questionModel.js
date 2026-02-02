const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  level: {
    type: String,
    required: [true, 'Level is required'],
    enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'easy']
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: ['logic', 'reading', 'motivational']
  },
  question_ru: {
    type: String,
    required: [true, 'Question in Russian is required']
  },
  question_kg: {
    type: String,
    required: [true, 'Question in Kyrgyz is required']
  },
  options_ru: {
    type: [String],
    default: []
  },
  options_kg: {
    type: [String],
    default: []
  },
  correct_answer: {
    type: String,
    required: [true, 'Correct answer is required']
  },
  image_file: {
    type: Buffer,
    default: null
  },
  image_filename: {
    type: String,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
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
questionSchema.index({ level: 1, is_active: 1 });

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;

