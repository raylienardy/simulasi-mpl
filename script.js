/**********************************************
 * GLOBAL STATE
 **********************************************/
let teamNames = [];
let schedule = [];
let teams = [];
let playoffMatches = [];

/**********************************************
 * INIT
 **********************************************/
document.addEventListener("DOMContentLoaded", () => {
  const saved = loadState();
  if (saved && saved.teamNames && saved.schedule) {
    teamNames = saved.teamNames;
    schedule = saved.schedule;
    schedule.forEach((week) => {
      if (!week.days) week.days = [];
    });
    initTeams();
    showSimulationView();
    if (saved.playoff) playoffMatches = saved.playoff;
    renderPlayoffBracket();
  } else {
    showSetupView();
  }
  document.getElementById("teamCount").dispatchEvent(new Event("input"));
});

document.getElementById("teamCount").addEventListener("input", function () {
  const count = parseInt(this.value);
  if (isNaN(count) || count < 2) return;
  renderTeamInputs(count);
});

function renderTeamInputs(count) {
  const container = document.getElementById("teamNamesContainer");
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const div = document.createElement("div");
    div.className = "team-input";
    div.innerHTML = `
            <label class="form-label">Nama Tim ${i + 1}</label>
            <input type="text" class="form-control team-name" placeholder="Nama tim" required>
        `;
    container.appendChild(div);
  }
}

function showSetupView() {
  document.getElementById("setup-section").classList.remove("hidden");
  document.getElementById("simulation-section").classList.add("hidden");
}

function showSimulationView() {
  document.getElementById("setup-section").classList.add("hidden");
  document.getElementById("simulation-section").classList.remove("hidden");
  renderSchedule();
  updateCurrentStats();
  renderStandings();
  renderCrossTable();
  renderPlayoffBracket();
}

/**********************************************
 * MULAI SIMULASI BARU
 **********************************************/
function startSimulation() {
  const count = parseInt(document.getElementById("teamCount").value);
  if (isNaN(count) || count < 2) return alert("Minimal 2 tim");
  const nameInputs = document.querySelectorAll(".team-name");
  const names = [];
  for (let input of nameInputs) {
    const name = input.value.trim();
    if (!name) return alert("Semua nama tim harus diisi");
    names.push(name);
  }
  if (new Set(names).size !== names.length)
    return alert("Nama tim tidak boleh sama");
  teamNames = names;
  schedule = [];
  playoffMatches = [];
  initTeams();
  clearState();
  saveState();
  showSimulationView();
}

function initTeams() {
  teams = teamNames.map((name) => ({
    name,
    matchWins: 0,
    matchLosses: 0,
    gamesWon: 0,
    gamesLost: 0,
    diff: 0,
  }));
}

/**********************************************
 * TAMBAH / HAPUS WEEK, DAY, MATCH
 **********************************************/
function addWeek() {
  schedule.push({ id: Date.now(), days: [] });
  saveState();
  renderSchedule();
  updateCurrentStats();
  renderStandings();
  renderCrossTable();
}

function addDay(weekIndex) {
  const week = schedule[weekIndex];
  if (!week.days) week.days = [];
  week.days.push({ id: Date.now(), matches: [] });
  saveState();
  renderSchedule();
}

function addMatch(weekIndex, dayIndex) {
  const week = schedule[weekIndex];
  if (!week.days) week.days = [];
  const day = week.days[dayIndex];
  if (!day.matches) day.matches = [];
  day.matches.push({ teamA: null, teamB: null, result: "" });
  saveState();
  renderSchedule();
}

function deleteWeek(weekIndex) {
  if (!confirm("Hapus week ini beserta semua isinya?")) return;
  schedule.splice(weekIndex, 1);
  saveState();
  renderSchedule();
  updateCurrentStats();
  renderStandings();
  renderCrossTable();
}

function deleteDay(weekIndex, dayIndex) {
  if (!confirm("Hapus hari ini dan pertandingannya?")) return;
  schedule[weekIndex].days.splice(dayIndex, 1);
  saveState();
  renderSchedule();
  updateCurrentStats();
  renderStandings();
  renderCrossTable();
}

function deleteMatch(weekIndex, dayIndex, matchIndex) {
  schedule[weekIndex].days[dayIndex].matches.splice(matchIndex, 1);
  saveState();
  renderSchedule();
  updateCurrentStats();
  renderStandings();
  renderCrossTable();
}

/**********************************************
 * RENDER SCHEDULE
 **********************************************/
function renderSchedule() {
  const container = document.getElementById("scheduleContainer");
  if (!container) return;
  container.innerHTML = "";

  schedule.forEach((week, weekIdx) => {
    if (!week.days) week.days = [];
    const weekCard = document.createElement("div");
    weekCard.className = "card week-card shadow-sm";
    weekCard.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <span class="fw-bold">Week ${weekIdx + 1}</span>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteWeek(${weekIdx})">🗑️</button>
            </div>
            <div class="card-body">
                <div class="days-container" id="week-${weekIdx}-days"></div>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="addDay(${weekIdx})">➕ Tambah Hari</button>
            </div>
        `;
    container.appendChild(weekCard);

    const daysContainer = weekCard.querySelector(`#week-${weekIdx}-days`);
    week.days.forEach((day, dayIdx) => {
      const dayDiv = document.createElement("div");
      dayDiv.className = "day-card border";
      dayDiv.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="fw-semibold">Day ${dayIdx + 1}</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteDay(${weekIdx}, ${dayIdx})">🗑️</button>
                </div>
                <div class="matches-container" id="week-${weekIdx}-day-${dayIdx}-matches"></div>
                <button class="btn btn-sm btn-outline-secondary mt-1" onclick="addMatch(${weekIdx}, ${dayIdx})">➕ Tambah Match</button>
            `;
      daysContainer.appendChild(dayDiv);

      const matchesContainer = dayDiv.querySelector(
        `#week-${weekIdx}-day-${dayIdx}-matches`,
      );
      if (!day.matches) day.matches = [];
      day.matches.forEach((match, matchIdx) => {
        const row = document.createElement("div");
        row.className = "match-row";
        row.innerHTML = `
                    <select class="form-select form-select-sm team-select" data-week="${weekIdx}" data-day="${dayIdx}" data-match="${matchIdx}" data-role="teamA">
                        <option value="">-- Tim A --</option>
                        ${teamNames.map((name, idx) => `<option value="${idx}" ${match.teamA === idx ? "selected" : ""}>${name}</option>`).join("")}
                    </select>
                    <span class="fw-bold">VS</span>
                    <select class="form-select form-select-sm team-select" data-week="${weekIdx}" data-day="${dayIdx}" data-match="${matchIdx}" data-role="teamB">
                        <option value="">-- Tim B --</option>
                        ${teamNames.map((name, idx) => `<option value="${idx}" ${match.teamB === idx ? "selected" : ""}>${name}</option>`).join("")}
                    </select>
                    <select class="form-select form-select-sm result-select" data-week="${weekIdx}" data-day="${dayIdx}" data-match="${matchIdx}">
                        <option value="">-- TBD --</option>
                        ${generateResultOptions(match)}
                    </select>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteMatch(${weekIdx}, ${dayIdx}, ${matchIdx})">✕</button>
                `;
        matchesContainer.appendChild(row);
      });
    });
  });

  attachSelectListeners();
}

function generateResultOptions(match) {
  const teamA = teamNames[match.teamA] || "???";
  const teamB = teamNames[match.teamB] || "???";
  return [
    { val: "A-2-0", text: `${teamA} 2-0` },
    { val: "A-2-1", text: `${teamA} 2-1` },
    { val: "B-2-0", text: `${teamB} 2-0` },
    { val: "B-2-1", text: `${teamB} 2-1` },
  ]
    .map(
      (opt) =>
        `<option value="${opt.val}" ${match.result === opt.val ? "selected" : ""}>${opt.text}</option>`,
    )
    .join("");
}

function attachSelectListeners() {
  document.querySelectorAll(".team-select").forEach((select) => {
    select.removeEventListener("change", handleTeamChange);
    select.addEventListener("change", handleTeamChange);
  });
  document.querySelectorAll(".result-select").forEach((select) => {
    select.removeEventListener("change", handleResultChange);
    select.addEventListener("change", handleResultChange);
  });
}

/**********************************************
 * HANDLER PERUBAHAN DROPDOWN
 **********************************************/
function handleTeamChange(e) {
  const select = e.target;
  const weekIdx = parseInt(select.dataset.week);
  const dayIdx = parseInt(select.dataset.day);
  const matchIdx = parseInt(select.dataset.match);
  const role = select.dataset.role;
  const newVal = select.value === "" ? null : parseInt(select.value);

  const match = schedule[weekIdx].days[dayIdx].matches[matchIdx];
  if (role === "teamA") match.teamA = newVal;
  else match.teamB = newVal;

  if (
    match.teamA !== null &&
    match.teamB !== null &&
    match.teamA === match.teamB
  ) {
    alert("Tim tidak boleh sama!");
    select.value = "";
    if (role === "teamA") match.teamA = null;
    else match.teamB = null;
  }

  if (match.teamA !== null && match.teamB !== null) {
    if (!isPairingValid(match.teamA, match.teamB, weekIdx, dayIdx, matchIdx)) {
      alert("Pasangan ini sudah bertanding 2 kali! (batas double round-robin)");
      select.value = "";
      if (role === "teamA") match.teamA = null;
      else match.teamB = null;
    }
  }

  match.result = "";
  saveState();
  renderSchedule();
  updateCurrentStats();
  renderStandings();
  renderCrossTable();
}

function handleResultChange(e) {
  const select = e.target;
  const weekIdx = parseInt(select.dataset.week);
  const dayIdx = parseInt(select.dataset.day);
  const matchIdx = parseInt(select.dataset.match);
  const match = schedule[weekIdx].days[dayIdx].matches[matchIdx];
  match.result = select.value;
  saveState();
  updateCurrentStats();
  renderStandings();
  renderCrossTable();
}

function isPairingValid(
  teamAIdx,
  teamBIdx,
  currentWeek,
  currentDay,
  currentMatch,
) {
  let count = 0;
  schedule.forEach((week, wIdx) => {
    if (!week.days) return;
    week.days.forEach((day, dIdx) => {
      if (!day.matches) return;
      day.matches.forEach((match, mIdx) => {
        if (
          wIdx === currentWeek &&
          dIdx === currentDay &&
          mIdx === currentMatch
        )
          return;
        if (
          (match.teamA === teamAIdx && match.teamB === teamBIdx) ||
          (match.teamA === teamBIdx && match.teamB === teamAIdx)
        ) {
          count++;
        }
      });
    });
  });
  return count < 2;
}

/**********************************************
 * STATISTIK DASAR
 **********************************************/
function updateCurrentStats() {
  teams = teamNames.map((name) => ({
    name,
    matchWins: 0,
    matchLosses: 0,
    gamesWon: 0,
    gamesLost: 0,
    diff: 0,
  }));

  schedule.forEach((week) => {
    if (!week.days) return;
    week.days.forEach((day) => {
      if (!day.matches) return;
      day.matches.forEach((match) => {
        if (!match.result || match.teamA === null || match.teamB === null)
          return;
        const idxA = match.teamA;
        const idxB = match.teamB;
        let scoreA, scoreB;
        if (match.result.startsWith("A-")) {
          scoreA = parseInt(match.result.split("-")[1]);
          scoreB = parseInt(match.result.split("-")[2]);
          teams[idxA].matchWins++;
          teams[idxB].matchLosses++;
        } else {
          scoreB = parseInt(match.result.split("-")[1]);
          scoreA = parseInt(match.result.split("-")[2]);
          teams[idxB].matchWins++;
          teams[idxA].matchLosses++;
        }
        teams[idxA].gamesWon += scoreA;
        teams[idxA].gamesLost += scoreB;
        teams[idxB].gamesWon += scoreB;
        teams[idxB].gamesLost += scoreA;
      });
    });
  });
  teams.forEach((t) => (t.diff = t.gamesWon - t.gamesLost));
}

/**********************************************
 * BRUTE FORCE & RENDER KLASEMEN
 **********************************************/
function renderStandings() {
  const n = teamNames.length;
  if (n === 0) return;

  const pending = [];
  schedule.forEach((week, wIdx) => {
    if (!week.days) return;
    week.days.forEach((day, dIdx) => {
      if (!day.matches) return;
      day.matches.forEach((match, mIdx) => {
        if (
          (!match.result || match.result === "") &&
          match.teamA !== null &&
          match.teamB !== null
        ) {
          pending.push({ wIdx, dIdx, mIdx });
        }
      });
    });
  });

  const allPossibilities = [];
  const numPending = pending.length;
  if (numPending === 0) {
    const matches = getAllMatchesWithResults(new Map());
    allPossibilities.push(calculateFinalStandings(matches));
  } else {
    const resultsOptions = ["A-2-0", "A-2-1", "B-2-0", "B-2-1"];
    const totalComb = Math.pow(4, numPending);
    for (let i = 0; i < totalComb; i++) {
      const map = new Map();
      let temp = i;
      for (let j = 0; j < numPending; j++) {
        const res = resultsOptions[temp % 4];
        temp = Math.floor(temp / 4);
        const { wIdx, dIdx, mIdx } = pending[j];
        map.set(`${wIdx},${dIdx},${mIdx}`, res);
      }
      const matches = getAllMatchesWithResults(map);
      allPossibilities.push(calculateFinalStandings(matches));
    }
  }

  const certainty = teamNames.map((name) => {
    let alwaysUpper = true,
      alwaysPlayoff = true,
      alwaysOut = true;
    allPossibilities.forEach((standings) => {
      const pos = standings.findIndex((t) => t.name === name) + 1;
      if (pos > 2) alwaysUpper = false;
      if (pos > 6) alwaysPlayoff = false;
      if (pos <= 6) alwaysOut = false;
    });
    return { alwaysUpper, alwaysPlayoff, alwaysOut };
  });

  const currentSorted = [...teams].sort((a, b) => {
    if (a.matchWins !== b.matchWins) return b.matchWins - a.matchWins;
    if (a.diff !== b.diff) return b.diff - a.diff;
    const h2h = compareH2H(a, b);
    if (h2h !== 0) return h2h;
    return b.gamesWon - a.gamesWon;
  });

  const tbody = document.querySelector("#standingsTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  currentSorted.forEach((team, idx) => {
    const status = certainty[teamNames.indexOf(team.name)];
    let rowClass = "",
      statusText = "";
    if (status.alwaysUpper) {
      rowClass = "bg-upper";
      statusText = "🔒 Upper Bracket";
    } else if (status.alwaysPlayoff) {
      rowClass = "bg-playoff";
      statusText = "🔒 Playoff";
    } else if (status.alwaysOut) {
      rowClass = "bg-eliminated";
      statusText = "🔒 Tersingkir";
    } else {
      const rank = idx + 1;
      if (n > 6) {
        statusText =
          rank <= 6
            ? "⏳ Playoff (belum pasti)"
            : "⏳ Tidak lolos (belum pasti)";
      } else {
        statusText = rank <= 2 ? "⏳ Upper (belum pasti)" : "⏳ Playoff";
      }
    }

    const row = document.createElement("tr");
    row.className = rowClass;
    row.innerHTML = `
            <td>${idx + 1}</td>
            <td class="text-start">${team.name}</td>
            <td>${team.matchWins} - ${team.matchLosses}</td>
            <td>${team.gamesWon} - ${team.gamesLost}</td>
            <td>${team.diff > 0 ? "+" + team.diff : team.diff}</td>
            <td>${statusText}</td>
        `;
    tbody.appendChild(row);
  });
}

function getAllMatchesWithResults(resultsMap) {
  const matches = [];
  schedule.forEach((week, wIdx) => {
    if (!week.days) return;
    week.days.forEach((day, dIdx) => {
      if (!day.matches) return;
      day.matches.forEach((match, mIdx) => {
        if (match.teamA === null || match.teamB === null) return;
        const key = `${wIdx},${dIdx},${mIdx}`;
        let result = match.result;
        if (result === "" || !result) result = resultsMap.get(key) || "";
        if (!result) return;
        let scoreA, scoreB;
        if (result.startsWith("A-")) {
          scoreA = parseInt(result.split("-")[1]);
          scoreB = parseInt(result.split("-")[2]);
        } else {
          scoreB = parseInt(result.split("-")[1]);
          scoreA = parseInt(result.split("-")[2]);
        }
        matches.push({
          teamA: match.teamA,
          teamB: match.teamB,
          scoreA,
          scoreB,
        });
      });
    });
  });
  return matches;
}

function calculateFinalStandings(allMatches) {
  const stats = teamNames.map((name) => ({
    name,
    matchWins: 0,
    matchLosses: 0,
    gamesWon: 0,
    gamesLost: 0,
    diff: 0,
  }));

  allMatches.forEach((m) => {
    const idxA = m.teamA;
    const idxB = m.teamB;
    stats[idxA].gamesWon += m.scoreA;
    stats[idxA].gamesLost += m.scoreB;
    stats[idxB].gamesWon += m.scoreB;
    stats[idxB].gamesLost += m.scoreA;
    if (m.scoreA > m.scoreB) {
      stats[idxA].matchWins++;
      stats[idxB].matchLosses++;
    } else {
      stats[idxB].matchWins++;
      stats[idxA].matchLosses++;
    }
  });
  stats.forEach((s) => (s.diff = s.gamesWon - s.gamesLost));

  const sorted = [...stats].sort((a, b) => {
    if (a.matchWins !== b.matchWins) return b.matchWins - a.matchWins;
    if (a.diff !== b.diff) return b.diff - a.diff;
    const indexA = teamNames.indexOf(a.name);
    const indexB = teamNames.indexOf(b.name);
    let aWins = 0,
      bWins = 0,
      aGames = 0,
      bGames = 0;
    allMatches.forEach((m) => {
      if (
        (m.teamA === indexA && m.teamB === indexB) ||
        (m.teamA === indexB && m.teamB === indexA)
      ) {
        let scoreA, scoreB;
        if (m.teamA === indexA) {
          scoreA = m.scoreA;
          scoreB = m.scoreB;
        } else {
          scoreA = m.scoreB;
          scoreB = m.scoreA;
        }
        aGames += scoreA;
        bGames += scoreB;
        if (scoreA > scoreB) aWins++;
        else bWins++;
      }
    });
    if (aWins !== bWins) return bWins - aWins;
    if (aGames !== bGames) return aGames - bGames > 0 ? -1 : 1;
    return b.gamesWon - a.gamesWon;
  });
  return sorted;
}

function compareH2H(teamA, teamB) {
  const indexA = teams.indexOf(teamA);
  const indexB = teams.indexOf(teamB);
  let aWins = 0,
    bWins = 0,
    aGames = 0,
    bGames = 0;
  schedule.forEach((week) => {
    if (!week.days) return;
    week.days.forEach((day) => {
      if (!day.matches) return;
      day.matches.forEach((match) => {
        if (!match.result || match.teamA === null || match.teamB === null)
          return;
        const idxA = match.teamA,
          idxB = match.teamB;
        if (
          (idxA === indexA && idxB === indexB) ||
          (idxA === indexB && idxB === indexA)
        ) {
          let scoreA, scoreB;
          if (match.result.startsWith("A-")) {
            scoreA = parseInt(match.result.split("-")[1]);
            scoreB = parseInt(match.result.split("-")[2]);
          } else {
            scoreB = parseInt(match.result.split("-")[1]);
            scoreA = parseInt(match.result.split("-")[2]);
          }
          if (idxA === indexA) {
            aGames += scoreA;
            bGames += scoreB;
            if (scoreA > scoreB) aWins++;
            else bWins++;
          } else {
            aGames += scoreB;
            bGames += scoreA;
            if (scoreB > scoreA) aWins++;
            else bWins++;
          }
        }
      });
    });
  });
  if (aWins !== bWins) return bWins - aWins;
  if (aGames !== bGames) return aGames - bGames > 0 ? -1 : 1;
  return 0;
}

/**********************************************
 * CROSS TABLE (ABJAD)
 **********************************************/
function renderCrossTable() {
  const container = document.getElementById("crossTableContainer");
  if (!container) return;
  const n = teamNames.length;
  if (n === 0) {
    container.innerHTML = "";
    return;
  }
  const sortedIdx = teamNames
    .map((_, idx) => idx)
    .sort((a, b) => teamNames[a].localeCompare(teamNames[b]));
  const h2hMatrix = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => ({
      matches: [],
      gamesFor: 0,
      gamesAgainst: 0,
    })),
  );
  schedule.forEach((week) => {
    if (!week.days) return;
    week.days.forEach((day) => {
      if (!day.matches) return;
      day.matches.forEach((match) => {
        if (!match.result || match.teamA === null || match.teamB === null)
          return;
        const i = match.teamA,
          j = match.teamB;
        let scoreI, scoreJ;
        if (match.result.startsWith("A-")) {
          scoreI = parseInt(match.result.split("-")[1]);
          scoreJ = parseInt(match.result.split("-")[2]);
        } else {
          scoreJ = parseInt(match.result.split("-")[1]);
          scoreI = parseInt(match.result.split("-")[2]);
        }
        h2hMatrix[i][j].matches.push([scoreI, scoreJ]);
        h2hMatrix[i][j].gamesFor += scoreI;
        h2hMatrix[i][j].gamesAgainst += scoreJ;
        h2hMatrix[j][i].matches.push([scoreJ, scoreI]);
        h2hMatrix[j][i].gamesFor += scoreJ;
        h2hMatrix[j][i].gamesAgainst += scoreI;
      });
    });
  });
  let html =
    '<table class="table table-bordered table-sm crosstable"><thead><tr><th></th>';
  sortedIdx.forEach((j) => (html += `<th>${teamNames[j]}</th>`));
  html += "</tr></thead><tbody>";
  sortedIdx.forEach((i) => {
    html += `<tr><th class="text-start">${teamNames[i]}</th>`;
    sortedIdx.forEach((j) => {
      if (i === j) {
        html += '<td class="text-center bg-light">-</td>';
        return;
      }
      const cell = h2hMatrix[i][j];
      const total = cell.matches.length;
      let display = "";
      if (total > 0) {
        const details = cell.matches.map((m) => m.join("-")).join(", ");
        const agg = `${cell.gamesFor}-${cell.gamesAgainst}`;
        display = `<span class="fw-bold">${agg}</span><br><small>${details}</small>`;
      } else {
        display = '<span class="text-muted">-</span>';
      }
      let bgClass = "";
      if (total > 0) {
        if (cell.gamesFor > cell.gamesAgainst)
          bgClass = "bg-success text-white";
        else if (cell.gamesFor < cell.gamesAgainst)
          bgClass = "bg-danger text-white";
        else bgClass = "bg-warning text-dark";
      }
      html += `<td class="text-center ${bgClass}" style="min-width:80px;">${display}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody></table>";
  container.innerHTML = html;
}

/**********************************************
 * PLAYOFF BRACKET – VERSI AKURAT
 **********************************************/
function generatePlayoffBracket() {
  // Cek TBD
  let hasTBD = false;
  schedule.forEach((week) => {
    if (!week.days) return;
    week.days.forEach((day) => {
      if (!day.matches) return;
      day.matches.forEach((match) => {
        if (
          (!match.result || match.result === "") &&
          match.teamA !== null &&
          match.teamB !== null
        ) {
          hasTBD = true;
        }
      });
    });
  });
  if (hasTBD) {
    alert(
      "Selesaikan semua pertandingan regular (tidak boleh ada TBD) sebelum generate bracket.",
    );
    return;
  }
  if (teamNames.length < 6) {
    alert("Minimal 6 tim untuk playoff.");
    return;
  }

  const sorted = [...teams].sort((a, b) => {
    if (a.matchWins !== b.matchWins) return b.matchWins - a.matchWins;
    if (a.diff !== b.diff) return b.diff - a.diff;
    const h2h = compareH2H(a, b);
    if (h2h !== 0) return h2h;
    return b.gamesWon - a.gamesWon;
  });
  const seeds = sorted.slice(0, 6).map((t) => t.name);

  playoffMatches = [
    {
      id: "playins1",
      round: "Play-ins (Bo5)",
      team1: seeds[2],
      team2: seeds[5],
      score: "",
      winner: "",
      bo: 5,
    },
    {
      id: "playins2",
      round: "Play-ins (Bo5)",
      team1: seeds[3],
      team2: seeds[4],
      score: "",
      winner: "",
      bo: 5,
    },
    {
      id: "ubsf1",
      round: "UB Semifinal (Bo5)",
      team1: seeds[0],
      team2: null,
      score: "",
      winner: "",
      bo: 5,
    },
    {
      id: "ubsf2",
      round: "UB Semifinal (Bo5)",
      team1: seeds[1],
      team2: null,
      score: "",
      winner: "",
      bo: 5,
    },
    {
      id: "ubfinal",
      round: "UB Final (Bo5)",
      team1: null,
      team2: null,
      score: "",
      winner: "",
      bo: 5,
    },
    {
      id: "lbsf",
      round: "LB Semifinal (Bo5)",
      team1: null,
      team2: null,
      score: "",
      winner: "",
      bo: 5,
    },
    {
      id: "lbfinal",
      round: "LB Final (Bo7)",
      team1: null,
      team2: null,
      score: "",
      winner: "",
      bo: 7,
    },
    {
      id: "grandfinal",
      round: "Grand Final (Bo7)",
      team1: null,
      team2: null,
      score: "",
      winner: "",
      bo: 7,
    },
  ];
  updatePlayoffDependencies();
  saveState();
  renderPlayoffBracket();
}

function updatePlayoffDependencies() {
  const playins1 = playoffMatches.find((m) => m.id === "playins1");
  const playins2 = playoffMatches.find((m) => m.id === "playins2");
  const ubsf1 = playoffMatches.find((m) => m.id === "ubsf1");
  const ubsf2 = playoffMatches.find((m) => m.id === "ubsf2");

  // UB SF lawan dari play-ins (pemenang playins2 lawan seed1, pemenang playins1 lawan seed2)
  ubsf1.team2 = playins2.winner || null;
  ubsf2.team2 = playins1.winner || null;

  const ubfinal = playoffMatches.find((m) => m.id === "ubfinal");
  ubfinal.team1 = ubsf1.winner || null;
  ubfinal.team2 = ubsf2.winner || null;

  // LB SF: dua tim kalah dari UB SF
  const lbsf = playoffMatches.find((m) => m.id === "lbsf");
  lbsf.team1 = ubsf1.winner
    ? ubsf1.team1 === ubsf1.winner
      ? ubsf1.team2
      : ubsf1.team1
    : null;
  lbsf.team2 = ubsf2.winner
    ? ubsf2.team1 === ubsf2.winner
      ? ubsf2.team2
      : ubsf2.team1
    : null;

  const lbfinal = playoffMatches.find((m) => m.id === "lbfinal");
  lbfinal.team1 = ubfinal.winner
    ? ubfinal.team1 === ubfinal.winner
      ? ubfinal.team2
      : ubfinal.team1
    : null;
  lbfinal.team2 = lbsf.winner || null;

  const grandfinal = playoffMatches.find((m) => m.id === "grandfinal");
  grandfinal.team1 = ubfinal.winner || null;
  grandfinal.team2 = lbfinal.winner || null;
}

function renderPlayoffBracket() {
  const container = document.getElementById("playoffContainer");
  if (!container) return;
  if (!playoffMatches.length) {
    container.innerHTML =
      '<p class="text-muted">Klik "Generate Bracket" setelah semua pertandingan regular selesai.</p>';
    return;
  }

  const getMatch = (id) => playoffMatches.find((m) => m.id === id);

  const html = `
    <div class="bracket-grid">
        <!-- Play-ins -->
        <div class="bracket-round" style="grid-row:1; grid-column:1;">
            <h6 class="text-center">Play‑ins (Bo5)</h6>
            ${matchBox(getMatch("playins1"))}
            ${matchBox(getMatch("playins2"))}
        </div>

        <!-- UB SF -->
        <div class="bracket-round" style="grid-row:1; grid-column:2;">
            <h6 class="text-center">UB Semifinal (Bo5)</h6>
            ${matchBox(getMatch("ubsf1"))}
            ${matchBox(getMatch("ubsf2"))}
        </div>

        <!-- UB Final & LB SF (stacked) -->
        <div class="bracket-round" style="grid-row:1; grid-column:3; display:flex; flex-direction:column; gap:30px;">
            <div>
                <h6 class="text-center">UB Final (Bo5)</h6>
                ${matchBox(getMatch("ubfinal"))}
            </div>
            <div>
                <h6 class="text-center">LB Semifinal (Bo5)</h6>
                ${matchBox(getMatch("lbsf"))}
            </div>
        </div>

        <!-- Grand Final & LB Final -->
        <div class="bracket-round" style="grid-row:1; grid-column:4; display:flex; flex-direction:column; gap:30px;">
            <div>
                <h6 class="text-center">Grand Final (Bo7)</h6>
                ${matchBox(getMatch("grandfinal"))}
            </div>
            <div>
                <h6 class="text-center">LB Final (Bo7)</h6>
                ${matchBox(getMatch("lbfinal"))}
            </div>
        </div>
    </div>`;

  container.innerHTML = html;

  // Event listener untuk dropdown skor
  document.querySelectorAll(".playoff-score").forEach((select) => {
    select.addEventListener("change", handlePlayoffScoreChange);
  });
}

function matchBox(match) {
  const team1 = match.team1 || "TBD";
  const team2 = match.team2 || "TBD";
  let options = "";
  if (team1 !== "TBD" && team2 !== "TBD") {
    const bo = match.bo;
    for (let i = 0; i <= bo; i++) {
      for (let j = 0; j <= bo; j++) {
        if (i === bo || j === bo) {
          if (i === bo && j < bo)
            options += `<option value="${team1} ${i}-${j}" ${match.score === `${i}-${j}` ? "selected" : ""}>${team1} ${i}-${j}</option>`;
          if (j === bo && i < bo)
            options += `<option value="${team2} ${i}-${j}" ${match.score === `${i}-${j}` ? "selected" : ""}>${team2} ${i}-${j}</option>`;
        }
      }
    }
    options = `<option value="">-- Pilih skor --</option>` + options;
  } else {
    options = '<option value="">-- TBD --</option>';
  }

  return `
    <div class="bracket-match">
        <div class="team"><span>${team1}</span> <span class="score">${match.score ? match.score.split("-")[0] : "0"}</span></div>
        <div class="team"><span>${team2}</span> <span class="score">${match.score ? match.score.split("-")[1] : "0"}</span></div>
        <select class="form-select form-select-sm playoff-score" data-id="${match.id}">${options}</select>
        ${match.winner ? `<span class="winner-badge">🏆 ${match.winner}</span>` : ""}
    </div>`;
}

function handlePlayoffScoreChange(e) {
  const select = e.target;
  const id = select.dataset.id;
  const match = playoffMatches.find((m) => m.id === id);
  const value = select.value;
  if (!value) {
    match.score = "";
    match.winner = "";
  } else {
    const [winner, score] = value.split(" ");
    match.winner = winner;
    match.score = score;
  }
  propagatePlayoff();
  saveState();
  renderPlayoffBracket();
}

function propagatePlayoff() {
  updatePlayoffDependencies();
  // Cek apakah ada perubahan pemenang yang mempengaruhi match selanjutnya
  // Re-render otomatis
}

/**********************************************
 * SAVE / LOAD
 **********************************************/
function saveState() {
  const state = { teamNames, schedule, playoff: playoffMatches };
  localStorage.setItem("mpl_simulation", JSON.stringify(state));
}
function loadState() {
  const raw = localStorage.getItem("mpl_simulation");
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data.teamNames || !Array.isArray(data.schedule)) return null;
    return data;
  } catch (e) {
    return null;
  }
}
function clearState() {
  localStorage.removeItem("mpl_simulation");
}

function resetData() {
  if (confirm("Hapus semua data dan mulai dari awal?")) {
    clearState();
    location.reload();
  }
}
function backToSetup() {
  if (confirm("Kembali ke setup? Data akan hilang.")) {
    clearState();
    location.reload();
  }
}
function exportData() {
  const state = { teamNames, schedule, playoff: playoffMatches };
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "mpl_simulation.json";
  a.click();
  URL.revokeObjectURL(a.href);
}
function importData(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.teamNames || !Array.isArray(data.schedule))
        return alert("Format tidak valid.");
      teamNames = data.teamNames;
      schedule = data.schedule;
      schedule.forEach((w) => {
        if (!w.days) w.days = [];
      });
      if (data.playoff) playoffMatches = data.playoff;
      else playoffMatches = [];
      initTeams();
      showSimulationView();
      saveState();
    } catch (ex) {
      alert("Gagal membaca file.");
    }
  };
  reader.readAsText(file);
}
