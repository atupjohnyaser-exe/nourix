// Rule-based suggestion: which part of the day suits a dish best.
export function suggestSlot({ name = '', category = '' }) {
  const t = `${name} ${category}`.toLowerCase()
  if (/\b(breakfast|pancakes?|omelet+e?|oats?|oatmeal|porridge|toast|waffles?|granola|crepes?|eggs?|french toast)\b/.test(t))
    return { slot: 'breakfast', why: 'Light and quick, a good way to start the day.' }
  if (/\b(beef|pork|lamb|goat|steak|roast|stew|curry|casserole|lasagne|lasagna|ribs?|chicken)\b/.test(t))
    return { slot: 'dinner', why: 'A hearty main, best when you can sit down and enjoy it.' }
  if (/\b(dessert|cake|pie|pudding|cookies?|brownie)\b/.test(t))
    return { slot: 'lunch', why: 'Sweet food is easier to burn off earlier in the day.' }
  if (/\b(soup|salad|sandwich|wrap|noodles?|pasta|seafood|fish|vegetarian|vegan|starter|side|bowl)\b/.test(t))
    return { slot: 'lunch', why: 'Lighter dish that keeps you going through the afternoon.' }
  return { slot: 'dinner', why: 'A filling meal that works well to end the day.' }
}
