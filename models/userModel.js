const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [255, 'Full name cannot exceed 255 characters']
  },
  phone_number: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [1, 'Age must be at least 1'],
    max: [150, 'Age cannot exceed 150']
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
userSchema.index({ phone_number: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;

