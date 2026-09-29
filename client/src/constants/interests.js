import { Rocket, Trophy, Leaf, PawPrint, Wand2, Swords, Flower2, Sparkles } from 'lucide-react'

// Must match server/src/data/interests.js exactly (value strings are sent
// to the API as-is). Order here is the order shown in the picker.
export const INTERESTS = [
  { value: 'space', labelKey: 'interestSpaceLabel', Icon: Rocket },
  { value: 'sports', labelKey: 'interestSportsLabel', Icon: Trophy },
  { value: 'nature', labelKey: 'interestNatureLabel', Icon: Leaf },
  { value: 'animals', labelKey: 'interestAnimalsLabel', Icon: PawPrint },
  { value: 'unicorns', labelKey: 'interestUnicornsLabel', Icon: Sparkles },
  { value: 'magic', labelKey: 'interestMagicLabel', Icon: Wand2 },
  { value: 'fantasy', labelKey: 'interestFantasyLabel', Icon: Swords },
  { value: 'flowers', labelKey: 'interestFlowersLabel', Icon: Flower2 },
  { value: 'disneyCharacters', labelKey: 'interestDisneyCharactersLabel', Icon: Sparkles },
  { value: 'tolkien', labelKey: 'interestTolkienLabel', Icon: Sparkles },
  { value: 'discworld', labelKey: 'interestDiscworldLabel', Icon: Sparkles },
  { value: 'dune', labelKey: 'interestDuneLabel', Icon: Sparkles },
]
