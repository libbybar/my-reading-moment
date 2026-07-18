const express = require("express");

const mockChildProfiles = require("../data/mockChildProfiles");
const mockReadingExercise = require("../data/mockReadingExercise");

const router = express.Router();

router.post("/preview", (req, res) => {
  const { childId } = req.body;

  if (!childId) {
    return res.status(400).json({
      error: "childId is required",
    });
  }

  const child = mockChildProfiles.find((profile) => profile.id === childId);

  if (!child) {
    return res.status(404).json({
      error: "Child not found",
    });
  }

  res.status(200).json(mockReadingExercise);
});

module.exports = router;
