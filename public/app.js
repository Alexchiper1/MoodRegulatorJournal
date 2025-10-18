// app.js - frontend logic
const entryForm = document.getElementById('entryForm');
const entryText = document.getElementById('entryText');
const feedback = document.getElementById('feedback');
const clearBtn  = document.getElementById('clearBtn');
const entriesList = document.getElementById('entriesList');

let chart; // Chart.js instance

function moodToEmoji(mood) {
  if (mood === 'Positive') return '😊';
  if (mood === 'Negative') return '😔';
  return '😐';
}

function moodToClass(mood) {
  if (mood === 'Positive') return 'positive';
  if (mood === 'Negative') return 'negative';
  return 'neutral';
}

async function fetchEntries() {
  const res = await fetch('/api/entries?limit=30');
  if (!res.ok) throw new Error('Failed to fetch entries');
  return res.json();
}

function renderEntries(items) {
  entriesList.innerHTML = '';
  items.forEach(e => {
    const li = document.createElement('li');
    li.className = 'entry';

    const badge = document.createElement('div');
    badge.className = `badge ${moodToClass(e.mood)}`;
    badge.textContent = moodToEmoji(e.mood);

    const content = document.createElement('div');
    const meta = document.createElement('div');
    meta.className = 'meta';
    const date = new Date(e.created_at).toLocaleString();
    meta.textContent = `${e.mood} (${e.score >= 0 ? '+' : ''}${e.score}) • ${date}`;

    const text = document.createElement('div');
    text.className = 'text';
    text.textContent = e.text;

    content.appendChild(meta);
    content.appendChild(text);

    li.appendChild(badge);
    li.appendChild(content);
    entriesList.appendChild(li);
  });
}

// Build a 7-day mood series; if multiple in a day, average the score
function buildTrendData(items) {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0,10);
    days.push(key);
  }

  const buckets = {};
  items.forEach(e => {
    const key = e.created_at.slice(0,10);
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(e.score);
  });

  const avgScore = days.map(key => {
    const arr = buckets[key] || [];
    if (arr.length === 0) return null;
    return arr.reduce((a,b)=>a+b,0) / arr.length;
  });

  return { labels: days.map(d => new Date(d).toLocaleDateString()), data: avgScore };
}

function renderChart(items) {
  const ctx = document.getElementById('moodChart');

  const { labels, data } = buildTrendData(items);

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Average sentiment (−=low, +=high)',
        data,
        spanGaps: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { suggestedMin: -5, suggestedMax: 5 }
      },
      plugins: {
        legend: { display: true }
      }
    }
  });

  const legend = document.getElementById('legend');
  legend.textContent = 'Tip: Write an entry each day — the line shows your average mood score per day.';
}

async function refresh() {
  try {
    const items = await fetchEntries();
    renderEntries(items);
    renderChart(items);
  } catch (e) {
    console.error(e);
    feedback.textContent = 'Could not load entries.';
  }
}

entryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  feedback.textContent = '';

  const text = entryText.value.trim();
  if (!text) {
    feedback.textContent = 'Please write something first.';
    return;
  }

  try {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({error:'Error'}));
      throw new Error(err.error || 'Failed to save');
    }
    entryText.value = '';
    feedback.textContent = 'Saved ✅';
    await refresh();
    setTimeout(()=> feedback.textContent = '', 1200);
  } catch (err) {
    console.error(err);
    feedback.textContent = 'Something went wrong. Try again.';
  }
});

clearBtn.addEventListener('click', () => {
  entryText.value = '';
  feedback.textContent = '';
});

// Initial load
refresh();
