// Utilities
const $ = id => document.getElementById(id);

// State keys
const LS = {
  workouts: 'pf_workouts_v1',
  meals: 'pf_meals_v1',
  weights: 'pf_weights_v1',
  profile: 'pf_profile_v1',
  goals: 'pf_goals_v1'
}

// Default load
const load = key => JSON.parse(localStorage.getItem(key) || 'null')
const save = (key, val) => localStorage.setItem(key, JSON.stringify(val))

// Initial data
let workouts = load(LS.workouts) || []
let meals = load(LS.meals) || []
let weights = load(LS.weights) || []
let profile = load(LS.profile) || { name: '', age: '', height: '' }
let goals = load(LS.goals) || { cal: 2000, wk: 3, weight: '' }

// DOM refs
const workoutList = $('workoutList')
const mealList = $('mealList')

// default date to today
const todayISO = new Date().toISOString().slice(0, 10)
if (!$('w-date').value) $('w-date').value = todayISO
if (!$('weightDate').value) $('weightDate').value = todayISO

// Render functions
function renderWorkouts() {
  workoutList.innerHTML = ''
  if (workouts.length === 0) { workoutList.innerHTML = '<div class="muted">No workouts yet</div>'; return }
  workouts.slice().reverse().forEach((w, i) => {
    const id = w.id
    const el = document.createElement('div')
    el.className = 'list-item'
    el.innerHTML = `
          <div>
            <div style="font-weight:700">${w.title}</div>
            <div class="muted">${w.date} • ${w.duration} min • ${w.cals} kcal</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="icon-btn" data-id="${id}" data-action="edit">✏️</button>
            <button class="icon-btn" data-id="${id}" data-action="del">🗑</button>
          </div>`
    workoutList.appendChild(el)
  })
  updateDashboard()
}

function renderMeals() {
  mealList.innerHTML = ''
  if (meals.length === 0) { mealList.innerHTML = '<div class="muted">No meals logged</div>'; return }
  meals.slice().reverse().forEach(m => {
    const el = document.createElement('div')
    el.className = 'list-item'
    el.innerHTML = `<div><div style="font-weight:700">${m.title}</div><div class="muted">${m.date}</div></div>
        <div style="display:flex;align-items:center;gap:10px"><div>${m.cals} kcal</div><button class="icon-btn" data-id="${m.id}" data-action="del">🗑</button></div>`
    mealList.appendChild(el)
  })
  updateDashboard()
}

function renderProfile() {
  $('userName').value = profile.name || ''
  $('userAge').value = profile.age || ''
  $('userHeight').value = profile.height || ''
}
function renderGoals() {
  $('calGoal').value = goals.cal
  $('wkGoal').value = goals.wk
  $('weightGoal').value = goals.weight || ''
  $('calGoalText').innerText = goals.cal
  $('wkGoalText').innerText = goals.wk
  $('weightGoalText').innerText = goals.weight || '—'
}

function updateDashboard() {
  // calories today
  const today = new Date().toISOString().slice(0, 10)
  const calsToday = meals.filter(m => m.date === today).reduce((s, m) => s + (+m.cals || 0), 0)
  $('calToday').innerText = calsToday + ' kcal'
  $('calNum').innerText = calsToday + ' kcal'
  const calPct = Math.min(100, Math.round((calsToday / (goals.cal || 2000)) * 100))
  $('calProgress').style.width = calPct + '%'

  // workouts this week (week starting Monday)
  const start = getStartOfWeek(new Date())
  const wkCount = workouts.filter(w => new Date(w.date) >= start).length
  $('wkCount').innerText = wkCount
  $('wkNum').innerText = wkCount
  const wkPct = Math.min(100, Math.round((wkCount / (goals.wk || 3)) * 100))
  $('wkProgress').style.width = wkPct + '%'

  // weight
  const last = weights.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0]
  if (last) { $('curWeight').innerText = last.weight + ' kg' } else { $('curWeight').innerText = '— kg' }

  // counts
  $('wCount').innerText = weights.length
}

// helpers
function getStartOfWeek(d) { const date = new Date(d); const day = date.getDay(); const diff = (day + 6) % 7; date.setDate(date.getDate() - diff); date.setHours(0, 0, 0, 0); return date }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

// forms
$('workoutForm').addEventListener('submit', e => {
  e.preventDefault()
  const title = $('w-title').value.trim() || 'Workout'
  const duration = parseInt($('w-duration').value) || 0
  const cals = parseInt($('w-cals').value) || 0
  const date = $('w-date').value || todayISO
  const item = { id: uid(), title, duration, cals, date }
  workouts.push(item)
  save(LS.workouts, workouts)
  renderWorkouts()
  $('workoutForm').reset(); $('w-date').value = todayISO
})

workoutList.addEventListener('click', e => {
  const btn = e.target.closest('button')
  if (!btn) return
  const id = btn.dataset.id
  const action = btn.dataset.action
  if (action === 'del') {
    workouts = workouts.filter(w => w.id !== id)
    save(LS.workouts, workouts); renderWorkouts()
  }
  if (action === 'edit') {
    const w = workouts.find(x => x.id === id)
    if (!w) return
    $('w-title').value = w.title
    $('w-duration').value = w.duration
    $('w-cals').value = w.cals
    $('w-date').value = w.date
    // remove original (will re-add on submit)
    workouts = workouts.filter(x => x.id !== id)
    save(LS.workouts, workouts)
    renderWorkouts()
  }
})

// timer
let timerInterval = null
let timerSeconds = 0
$('startTimer').addEventListener('click', () => {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; $('startTimer').innerText = 'Start timer'; timerSeconds = 0; $('timerLabel').innerText = '00:00'; return }
  timerSeconds = 0; $('startTimer').innerText = 'Stop timer'
  timerInterval = setInterval(() => {
    timerSeconds++
    const mm = String(Math.floor(timerSeconds / 60)).padStart(2, '0')
    const ss = String(timerSeconds % 60).padStart(2, '0')
    $('timerLabel').innerText = mm + ':' + ss
  }, 1000)
})

// meals
$('mealForm').addEventListener('submit', e => {
  e.preventDefault()
  const title = $('m-title').value || 'Meal'
  const cals = parseInt($('m-cals').value) || 0
  const date = todayISO
  const m = { id: uid(), title, cals, date }
  meals.push(m); save(LS.meals, meals); renderMeals(); $('mealForm').reset()
})
$('quickBreakfast').addEventListener('click', () => { $('m-title').value = 'Breakfast'; $('m-cals').value = 400; $('mealForm').dispatchEvent(new Event('submit')) })

mealList.addEventListener('click', e => {
  const btn = e.target.closest('button')
  if (!btn) return
  const id = btn.dataset.id
  meals = meals.filter(m => m.id !== id)
  save(LS.meals, meals); renderMeals()
})

// weights
$('weightForm').addEventListener('submit', e => {
  e.preventDefault()
  const date = $('weightDate').value || todayISO
  const weight = parseFloat($('weightVal').value)
  if (!weight) return alert('Enter a weight')
  weights.push({ id: uid(), date, weight }); save(LS.weights, weights); renderWeights(); $('weightForm').reset(); $('weightDate').value = todayISO
})

function renderWeights() {
  // draw chart
  const sorted = weights.slice().sort((a, b) => new Date(a.date) - new Date(b.date))
  const labels = sorted.map(w => w.date)
  const data = sorted.map(w => w.weight)
  weightChart.data.labels = labels
  weightChart.data.datasets[0].data = data
  weightChart.update()
  updateDashboard()
}

// goals/profile
$('saveGoals').addEventListener('click', () => {
  goals.cal = parseInt($('calGoal').value) || 2000
  goals.wk = parseInt($('wkGoal').value) || 3
  goals.weight = $('weightGoal').value || ''
  save(LS.goals, goals); renderGoals(); updateDashboard()
})
$('saveProfile').addEventListener('click', () => {
  profile.name = $('userName').value
  profile.age = $('userAge').value
  profile.height = $('userHeight').value
  save(LS.profile, profile); renderProfile(); alert('Profile saved locally')
})

// quick load
renderWorkouts(); renderMeals(); renderProfile(); renderGoals(); updateDashboard()

// chart setup
const ctx = document.getElementById('weightChart').getContext('2d')
window.weightChart = new Chart(ctx, {
  type: 'line',
  data: { labels: [], datasets: [{ label: 'Weight (kg)', data: [], tension: 0.25, pointRadius: 6, pointHoverRadius: 8, fill: false, borderWidth: 3 }] },
  options: {
    responsive: true, plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: 'Date' } }, y: { title: { display: true, text: 'kg' } } }
  })

// menu toggle for mobile
$('menuBtn').addEventListener('click', () => {
  const nav = document.querySelector('.navlinks')
  if (nav.style.display === 'flex') { nav.style.display = 'none' } else { nav.style.display = 'flex' }
})

// theme toggle (simple)
const themeBtn = $('themeBtn')
let dark = false
themeBtn.addEventListener('click', () => {
  dark = !dark
  if (dark) { document.documentElement.style.background = '#0b1020'; document.body.style.background = '#0b1020'; document.body.style.color = '#f8fafc'; themeBtn.innerText = '☀️' } else { document.documentElement.style.background = ''; document.body.style.background = ''; document.body.style.color = ''; themeBtn.innerText = '🌙' }
})

// small helpers
document.addEventListener('click', e => {
  if (e.target.matches('.icon-btn')) e.target.blur()
})

// create initial date placeholders
if (!weights.length) { // create tiny demo entries to show chart (optional)
  // leave empty by default
}

// expose save/load for advanced edits in console
window.PF = { workouts, meals, weights, profile, goals, save, load }
