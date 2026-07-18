const express = require('express');
const Score = require('../models/Score');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route POST /api/scores  (submit a run - requires auth)
router.post('/', protect, async (req, res, next) => {
  try {
    const { score, coinsCollected = 0, distance = 0, durationMs = 0 } = req.body;

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ message: 'A valid non-negative score is required' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const entry = await Score.create({
      user: user._id,
      username: user.username,
      score,
      coinsCollected,
      distance,
      durationMs,
    });

    user.gamesPlayed += 1;
    let newBest = false;
    if (score > user.bestScore) {
      user.bestScore = score;
      newBest = true;
    }
    await user.save();

    res.status(201).json({ entry, newBest, bestScore: user.bestScore });
  } catch (err) {
    next(err);
  }
});

// @route GET /api/scores/leaderboard?limit=10
router.get('/leaderboard', optionalAuth, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);

    const top = await User.find({})
      .sort({ bestScore: -1 })
      .limit(limit)
      .select('username bestScore gamesPlayed');

    res.json({ leaderboard: top });
  } catch (err) {
    next(err);
  }
});

// @route GET /api/scores/me  (current user's run history - requires auth)
router.get('/me', protect, async (req, res, next) => {
  try {
    const runs = await Score.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ runs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
