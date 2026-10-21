// Rough Philippine grocery prices in PHP per kg. These are estimates, not live prices.
const KG = [['chicken',220],['pork',290],['beef',420],['lamb',600],['salmon',520],['shrimp',450],['prawn',450],['fish',300],
  ['egg plant',110],['eggplant',110],['egg',190],['tofu',120],['rice',60],['noodle',110],['pasta',130],['flour',65],['bread',120],
  ['sugar',75],['salt',30],['pepper',900],['garlic',180],['onion',130],['tomato',110],['potato',100],['carrot',90],['broccoli',200],
  ['spinach',150],['cabbage',70],['ginger',120],['lemon',160],['mushroom',300],['butter',500],['cheese',450],['milk',100],
  ['cream',280],['yogurt',200],['olive oil',650],['oil',180],['vinegar',70],['soy sauce',90],['sauce',140],['bay leaf',1200],
  ['lentil',140],['bean',140]]
const DEFAULT = { Produce: 110, Protein: 280, Pantry: 130 }

export const estimate = (name, aisle, grams) => {
  const n = name.toLowerCase()
  const hit = KG.find(([k]) => n.includes(k))
  const perKg = hit ? hit[1] : DEFAULT[aisle] || 130
  return Math.max(5, Math.ceil((perKg * grams) / 1000 / 5) * 5)
}
