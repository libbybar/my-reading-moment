const express = require("express");

const mockChildProfiles = require("../data/mockChildProfiles");

const router = express.Router();

function toSafeChildProfile(profile) {
  return {
    id: profile.id,
    name: profile.name,
    grammaticalGender: profile.grammaticalGender,
    readingLevel: profile.readingLevel,
  };
}

router.get("/", (req, res) => {
  res.status(200).json({
    childProfiles: mockChildProfiles.map(toSafeChildProfile),
  });
});

module.exports = router;
