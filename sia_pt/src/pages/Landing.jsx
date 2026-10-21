import { Icon, Logo } from '../icons.jsx'

const FEATS = [
  ['leaf', 'Health grades', 'Every dish gets a grade from A to D, based on protein, sodium, sugar, fiber and how processed its ingredients are.'],
  ['chart', 'Processing meter', 'See how much of a meal is whole food, processed food or ultra-processed food.'],
  ['repeat', 'Smart Swap', 'Find the ingredient that hurts a meal the most and swap it for a better one.'],
  ['clock', 'Morning, lunch and dinner', 'Plan up to three meals a day, with a tip on which time of day suits each dish.'],
  ['cart', 'Grocery and spending', 'One merged shopping list with estimated prices, and a record of what you spend each day, week and month.'],
  ['book', 'Real recipes', 'Ingredients, step-by-step instructions and video links for thousands of dishes.'],
]
const STEPS = [
  ['Find a recipe', 'Search by dish or ingredient and open the full recipe with its steps.'],
  ['Plan your day', 'Add it to the morning, lunch or dinner slot and see its health grade right away.'],
  ['Shop and track', 'Use the grocery list, tick items as you buy them, and watch your spending add up.'],
]

export default function Landing({ theme, toggleTheme }) {
  return (
    <div className="land">
      <header className="lnav">
        <b className="brand"><Logo size={30} /><span>NouriX</span></b>
        <div className="links2">
          <a className="btn line hide-sm" href="#recipes">Recipes</a>
          <button className="btn line" onClick={toggleTheme} aria-label="Switch between light and dark mode"><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} /></button>
          <a className="btn line" href="#login">Log in</a>
          <a className="btn" href="#register">Get started</a>
        </div>
      </header>

      <div className="lwrap">
        <section className="lhero">
          <div>
            <span className="chip">Meal planning built on real food data</span>
            <h1>Know what is <span className="grad">really</span> in your meals.</h1>
            <p className="lsub">NouriX grades every dish from A to D, shows how processed it is, and turns your week of meals into a grocery list you can track.</p>
            <div className="lcta">
              <a className="btn big" href="#register">Create a free account</a>
              <a className="btn line big" href="#recipes">Browse recipes</a>
            </div>
            <p style={{ margin: '14px 0 0' }}><small>Free to start. Upgrade to Pro any time.</small></p>
          </div>

          <div className="card mock" aria-hidden="true">
            <small>EXAMPLE DISH</small>
            <div className="mtop">
              <div className="ring" style={{ background: 'conic-gradient(#10b981 331deg, rgba(255,255,255,.15) 0)' }}><div>A</div></div>
              <div><small>DISH GRADE</small><h3>Vegetable stir-fry</h3></div>
            </div>
            {[['Protein', 62, '#10b981'], ['Sodium', 28, '#f59e0b'], ['Sugar', 15, '#14b8a6']].map(([n, w, c]) => (
              <div key={n}><div className="mrow"><span>{n}</span><span>{w < 30 ? 'Low' : 'Good'}</span></div><div className="bar"><i style={{ width: w + '%', background: c }} /></div></div>
            ))}
          </div>
        </section>

        <section className="lsec">
          <h2>How it works</h2>
          <p>From a recipe to a shopping trip in three steps.</p>
          <div className="how">
            {STEPS.map(([t, d], i) => <div className="card fcard" key={t}><div className="num">{i + 1}</div><h3>{t}</h3><p>{d}</p></div>)}
          </div>
        </section>

        <section className="lsec">
          <h2>What you get</h2>
          <p>Recipes come from TheMealDB and nutrition comes from Open Food Facts. Grades are estimates, and every dish shows how confident we are in the numbers.</p>
          <div className="feats">
            {FEATS.map(([ic, t, d]) => <div className="card fcard" key={t}><div className="fi"><Icon name={ic} size={22} /></div><h3>{t}</h3><p>{d}</p></div>)}
          </div>
        </section>

        <section className="lsec">
          <h2>Free or Pro</h2>
          <p>Start free. Go Pro when you want more meals a day and the extra tools.</p>
          <div className="grid2">
            <div className="card"><small>FREE</small><h2 style={{ margin: '4px 0' }}>PHP 0</h2>
              <ul className="perks"><li>1 meal per day</li><li>Health grade and nutrition for every dish</li><li>Recipes, favorites and pantry</li><li>Grocery list and spending tracker</li></ul></div>
            <div className="card proplan"><small>PRO</small><h2 style={{ margin: '4px 0' }}>PHP 149 / month</h2>
              <ul className="perks"><li>3 meals per day</li><li>Smart Swap suggestions</li><li>Automatic grocery prices</li><li>Dashboard charts and weekly alerts</li></ul></div>
          </div>
        </section>

        <section className="band">
          <h2>Ready to plan a healthier week?</h2>
          <p>Create your account in under a minute.</p>
          <a className="btn big" href="#register">Get started</a>
        </section>
        <footer className="lfoot">NouriX. Recipes by TheMealDB, nutrition data by Open Food Facts.</footer>
      </div>
    </div>
  )
}
