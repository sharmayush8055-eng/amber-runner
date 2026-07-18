const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    coinsCollected: {
      type: Number,
      default: 0,
    },
    distance: {
      type: Number,
      default: 0,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

scoreSchema.index({ score: -1 });

module.exports = mongoose.model('Score', scoreSchema);
