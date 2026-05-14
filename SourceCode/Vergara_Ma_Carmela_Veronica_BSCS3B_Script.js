// ============================================================
// This file contains all the logic for the simulator:
// - Reading user input from the form
// - Running each scheduling algorithm
// - Building the Gantt Chart and Results Table
// - Controlling which sections are visible on screen
// ============================================================


// ===== GLOBAL VARIABLES =====
// These store shared data used across multiple functions.
let processes    = [];      // Array of process objects entered by the user
let pendingAlgo  = null;    // Stores which quantum-based algorithm is waiting to run
let prioRule     = 'lower'; // Priority rule: 'lower' means lower number = higher priority
let pendingPrioAlgo = null; // Stores the selected priority algorithm type


// ============================================================
// STEP PILLS — setActivePill(n)
// Updates the progress bar at the top of the page.
// Steps before n are marked "done" (green), step n is "active" (teal).
// ============================================================
function setActivePill(n) {
  for (let i = 1; i <= 4; i++) {
    const p = document.getElementById('pill' + i);
    p.classList.remove('active', 'done');
    if (i < n)  p.classList.add('done');
    if (i === n) p.classList.add('active');
  }
}


// ============================================================
// GENERATE INPUTS — generateInputs()
// Called when the user clicks "Generate Inputs" in Step 1.
// Reads the number of processes and creates one table row per process
// in Step 2, then shows Steps 2 and 3.
// ============================================================
function generateInputs() {
  const n = parseInt(document.getElementById('numProcesses').value);
  if (isNaN(n) || n < 3) { alert(' Please enter at least 3 processes.'); return; }

  const tbody = document.getElementById('processBody');
  tbody.innerHTML = ''; // Clear any existing rows before generating new ones

  // Create one input row for each process
  for (let i = 1; i <= n; i++) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="text"   id="pid_${i}" value="P${i}" /></td>
      <td><input type="number" id="at_${i}"  value="0"    min="0" /></td>
      <td><input type="number" id="bt_${i}"  value="${i}" min="1" /></td>
      <td><input type="number" id="pr_${i}"  value="${i}" min="0" /></td>
    `;
    tbody.appendChild(row);
  }

  show('step2'); show('step3');
  setActivePill(2);

  // Smoothly scroll the page down so the user sees the new input table
  document.getElementById('step2').scrollIntoView({ behavior: 'smooth' });
}


// ============================================================
// READ PROCESSES — readProcesses()
// Reads and validates all process inputs from the Step 2 table.
// Stores valid process data into the global "processes" array.
// Returns false if any input is invalid (shows an alert).
// ============================================================
function readProcesses() {
  const n = parseInt(document.getElementById('numProcesses').value);
  processes = [];

  for (let i = 1; i <= n; i++) {
    const pid = document.getElementById(`pid_${i}`).value.trim();
    const at  = parseInt(document.getElementById(`at_${i}`).value);
    const bt  = parseInt(document.getElementById(`bt_${i}`).value);
    const pr  = parseInt(document.getElementById(`pr_${i}`).value);

    // Validate each field before accepting it
    if (!pid || !/^[a-zA-Z]/.test(pid))  { alert(` P${i}: ID must start with a letter.`); return false; }
    if (!/\d/.test(pid))                  { alert(` P${i}: ID must contain a number.`);    return false; }
    if (isNaN(at) || at < 0)             { alert(` P${i}: Arrival Time must be >= 0.`);    return false; }
    if (isNaN(bt) || bt < 1)             { alert(` P${i}: Burst Time must be >= 1.`);      return false; }
    if (isNaN(pr) || pr < 0)             { alert(` P${i}: Priority must be >= 0.`);        return false; }

    processes.push({ id: pid, arrival: at, burst: bt, priority: pr });
  }

  return true; // All inputs are valid
}


// ============================================================
// CLEAR ALGO BUTTONS — clearAlgoBtns()
// Resets the algorithm button highlights and hides all panels
// (priority dropdown, priority rule box, quantum input).
// Called every time the user picks a new algorithm.
// ============================================================
function clearAlgoBtns() {
  document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active-algo'));
  hide('prioDropdown');
  hide('prioRuleBox');
  hide('quantumRow');
  pendingAlgo = null;
  pendingPrioAlgo = null;
}


// ============================================================
// RUN ALGO — runAlgo(algo, btn)
// Handles algorithms that run immediately without needing a quantum:
// FCFS, SJF, and SRT.
// Looks up the correct function, name, description, and formulas,
// then calls that function and passes results to displayResults().
// ============================================================
function runAlgo(algo, btn) {
  if (!readProcesses()) return; // Stop if any input is invalid

  clearAlgoBtns();
  if (btn) btn.classList.add('active-algo'); // Highlight the clicked button

  // Map each algorithm key to: [function, display name, description, ...formulas]
  const map = {
    fcfs: [fcfs, 'First-Come, First-Served (FCFS)',           'Processes are executed in the order they arrive. Simple and fair — no process jumps the queue.',                         'WT = TAT − Burst Time', 'TAT = Completion − Arrival Time'],
    sjf:  [sjf,  'Shortest Job First — Non-Preemptive (SJF)', 'Once the CPU is free, the available process with the shortest burst time runs to completion.',                           'WT = TAT − Burst Time', 'TAT = Completion − Arrival Time'],
    srt:  [srt,  'Shortest Remaining Time — Preemptive (SRT)','At every moment, the process with the least remaining burst time runs. A new arrival can preempt the current process.', 'WT = TAT − Burst Time', 'TAT = Completion − Arrival Time'],
  };

  const [fn, name, desc, ...formulas] = map[algo];
  const [result, gantt] = fn(processes);
  displayResults(result, gantt, name, desc, formulas);
}


// ============================================================
// SHOW PRIORITY CHOICE — showPriorityChoice(btn)
// Called when the user clicks "5. Priority Scheduling".
// Shows the sub-panel asking Non-Preemptive or Preemptive,
// and the priority rule panel, then scrolls to them.
// ============================================================
function showPriorityChoice(btn) {
  if (!readProcesses()) return;

  clearAlgoBtns();
  if (btn) btn.classList.add('active-algo');

  show('prioDropdown'); // Show the Non-Preemptive / Preemptive choice
  show('prioRuleBox');  // Show the priority rule choice (lower/higher)

  // Scroll so the panels are visible after they appear
  setTimeout(() => {
    document.getElementById('prioDropdown').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}


// ============================================================
// RUN PRIORITY TYPE — runPrioType(algo)
// Called when the user picks "Non-Preemptive" or "Preemptive"
// from the Priority Scheduling sub-panel.
// Runs the correct priority algorithm and shows the results.
// ============================================================
function runPrioType(algo) {
  pendingPrioAlgo = algo;

  // Map priority algorithm keys to their function, name, description, and formulas
  const map = {
    priority_np: [priorityNP, 'Priority Scheduling — Non-Preemptive', 'The highest-priority ready process runs to completion. A running process cannot be preempted.', 'WT = TAT − Burst Time', 'TAT = Completion − Arrival Time'],
    priority_p:  [priorityP,  'Priority Scheduling — Preemptive',     'At every tick, the highest-priority ready process runs. A higher-priority arrival preempts the current process.', 'WT = TAT − Burst Time', 'TAT = Completion − Arrival Time'],
  };

  const [fn, name, desc, ...formulas] = map[algo];
  const [result, gantt] = fn(processes);
  displayResults(result, gantt, name, desc, formulas);
}


// ============================================================
// SET PRIORITY RULE — setPrioRule(rule)
// Called when the user clicks "Lower number" or "Higher number"
// in the priority rule panel.
// Updates the global prioRule variable and highlights the selected button.
// ============================================================
function setPrioRule(rule) {
  prioRule = rule;
  document.getElementById('ruleLow').classList.toggle('selected',  rule === 'lower');
  document.getElementById('ruleHigh').classList.toggle('selected', rule === 'higher');
}

// Set "lower" as the default priority rule when the page first loads
setPrioRule('lower');


// ============================================================
// ASK QUANTUM — askQuantum(algo, btn)
// Called when the user clicks "Round Robin" or "Priority + Round Robin".
// Shows the Time Quantum input panel (and the priority rule panel if needed).
// The algorithm waits until the user clicks "Run Algorithm".
// ============================================================
function askQuantum(algo, btn) {
  if (!readProcesses()) return;

  clearAlgoBtns();
  if (btn) btn.classList.add('active-algo');

  pendingAlgo = algo; // Remember which algorithm to run after the user enters the quantum

  // Priority+RR also needs the priority rule, so show that panel too
  if (algo === 'priority_rr') show('prioRuleBox');

  show('quantumRow'); // Show the time quantum input
}


// ============================================================
// RUN WITH QUANTUM — runWithQuantum()
// Called when the user clicks "Run Algorithm" in the quantum panel.
// Reads the time quantum value, runs the appropriate algorithm,
// and passes the results to displayResults().
// ============================================================
function runWithQuantum() {
  const q = parseInt(document.getElementById('quantum').value);
  if (isNaN(q) || q < 1) { alert(' Time Quantum must be at least 1.'); return; }

  let result, gantt, name, desc, formulas;

  if (pendingAlgo === 'rr') {
    // Round Robin: each process runs for at most q time units per turn
    [result, gantt] = roundRobin(processes, q);
    name     = `Round Robin (RR) — Time Quantum = ${q}`;
    desc     = `Each process gets a fixed time slice (quantum = ${q}). If not finished, it goes to the back of the queue and waits its turn again.`;
    formulas = ['WT = TAT − Burst Time', 'TAT = Completion − Arrival Time'];
  } else {
    // Priority + Round Robin: processes are grouped by priority, RR applied within each group
    [result, gantt] = priorityRR(processes, q);
    name     = `Priority + Round Robin — Time Quantum = ${q}`;
    desc     = `Processes are grouped by priority. Within each priority group, Round Robin (quantum = ${q}) is used. Higher-priority groups always run first and can preempt lower ones.`;
    formulas = ['WT = TAT − Burst Time', 'TAT = Completion − Arrival Time'];
  }

  displayResults(result, gantt, name, desc, formulas);
}


// ============================================================
// HELPER A: Non-Preemptive Scheduler — nonPreemptive(procs_in, selector)
// A reusable template used by SJF and Priority-NP.
// At each step, waits for the CPU to be free, then picks the best
// available process using the "selector" function.
// Once a process starts, it runs fully to completion (no interruption).
// ============================================================
function nonPreemptive(procs_in, selector) {
  const procs = procs_in.map(p => ({ ...p })); // Copy to avoid modifying the original data
  const done = [], gantt = [];
  let time = 0;

  while (done.length < procs.length) {
    // Get all processes that have arrived and are not yet finished
    const available = procs.filter(p => p.arrival <= time && !done.includes(p));

    if (!available.length) {
      // No process is ready — CPU is idle. Jump to the next arrival time.
      const next = Math.min(...procs.filter(p => !done.includes(p)).map(p => p.arrival));
      gantt.push({ id: 'IDLE', start: time, end: next });
      time = next;
      continue;
    }

    // Use the selector to pick the best process (e.g. shortest burst, highest priority)
    const cur    = selector(available);
    const finish = time + cur.burst;

    // Calculate Waiting Time and Turnaround Time for this process
    cur.wt  = time - cur.arrival;    // WT = time process waited before starting
    cur.tat = finish - cur.arrival;  // TAT = total time from arrival to completion

    done.push(cur);
    gantt.push({ id: cur.id, start: time, end: finish });
    time = finish;
  }

  return [done, gantt];
}


// ============================================================
// HELPER B: Preemptive Tick-by-Tick Scheduler — tickSchedule(procs_in, selector)
// A reusable template used by SRT and Priority-P.
// At every single time unit (tick), it re-evaluates which process should run.
// A currently running process can be interrupted (preempted) at any tick.
// ============================================================
function tickSchedule(procs_in, selector) {
  const procs = procs_in.map(p => ({ ...p, remaining: p.burst })); // Add remaining time tracker
  let time = 0, completed = 0;
  let currentPid = null, startTime = 0; // Track current block for Gantt chart
  const gantt = [];

  while (completed < procs.length) {
    // Get all processes that have arrived and still have remaining burst time
    const available = procs.filter(p => p.arrival <= time && p.remaining > 0);

    if (!available.length) {
      // CPU is idle — record IDLE block and move forward one tick
      if (currentPid !== 'IDLE') {
        if (currentPid) gantt.push({ id: currentPid, start: startTime, end: time });
        currentPid = 'IDLE'; startTime = time;
      }
      time++;
      continue;
    }

    // Select the best process for this tick using the selector function
    const cur = selector(available);

    // If the running process changed, close the current Gantt block and start a new one
    if (currentPid !== cur.id) {
      if (currentPid) gantt.push({ id: currentPid, start: startTime, end: time });
      currentPid = cur.id;
      startTime  = time;
    }

    cur.remaining--; // Process runs for one tick
    time++;

    // If the process just finished, record its completion time
    if (cur.remaining === 0) {
      cur.completion = time;
      completed++;
    }
  }

  // Close the final Gantt block
  if (currentPid) gantt.push({ id: currentPid, start: startTime, end: time });

  // Calculate WT and TAT from each process's completion time
  const result = procs.map(p => ({
    ...p,
    tat: p.completion - p.arrival,
    wt:  p.completion - p.arrival - p.burst
  }));

  return [result, gantt];
}


// ============================================================
// ALGORITHM 1: FCFS — First-Come, First-Served
// Processes are sorted by arrival time and run in that order.
// No preemption — each process runs fully before the next one starts.
// ============================================================
function fcfs(procs_in) {
  const procs = procs_in.map(p => ({ ...p })).sort((a, b) => a.arrival - b.arrival);
  let time = 0;
  const gantt = [], result = [];

  for (const p of procs) {
    // If the CPU is free but no process has arrived yet, add an IDLE block
    if (time < p.arrival) {
      gantt.push({ id: 'IDLE', start: time, end: p.arrival });
      time = p.arrival;
    }

    const finish = time + p.burst;

    result.push({ ...p, wt: time - p.arrival, tat: finish - p.arrival });
    gantt.push({ id: p.id, start: time, end: finish });

    time = finish;
  }

  return [result, gantt];
}


// ============================================================
// ALGORITHM 2: SJF — Shortest Job First (Non-Preemptive)
// When the CPU is free, the available process with the shortest
// burst time is selected. Ties are broken by arrival time (FCFS).
// Once selected, it runs to completion without interruption.
// ============================================================
function sjf(procs_in) {
  return nonPreemptive(procs_in, avail => avail.reduce((a, b) => {
    if (a.burst !== b.burst) return a.burst < b.burst ? a : b;
    return a.arrival <= b.arrival ? a : b; // Tie-breaker: earlier arrival wins
  }));
}


// ============================================================
// ALGORITHM 3: SRT — Shortest Remaining Time (Preemptive)
// At every tick, the process with the least remaining burst time runs.
// If a new process arrives with less remaining time, it preempts
// the currently running process.
// ============================================================
function srt(procs_in) {
  return tickSchedule(procs_in, avail => avail.reduce((a, b) => {
    if (a.remaining !== b.remaining) return a.remaining < b.remaining ? a : b;
    return a.arrival <= b.arrival ? a : b; // Tie-breaker: earlier arrival wins
  }));
}


// ============================================================
// ALGORITHM 4: Round Robin (RR)
// Each process gets a fixed time slice called the Time Quantum.
// If it doesn't finish within the quantum, it goes to the back
// of the queue and waits for its next turn.
// ============================================================
function roundRobin(procs_in, quantum) {
  const procs = procs_in.map(p => ({ ...p, remaining: p.burst })).sort((a, b) => a.arrival - b.arrival);
  let time = 0, completed = 0, i = 0;
  const queue = [], gantt = [];

  while (completed < procs.length) {
    // Add all processes that have now arrived into the ready queue
    while (i < procs.length && procs[i].arrival <= time) queue.push(procs[i++]);

    if (!queue.length) {
      // No process ready — CPU is idle, jump to next arrival
      gantt.push({ id: 'IDLE', start: time, end: procs[i].arrival });
      time = procs[i].arrival;
      continue;
    }

    const cur  = queue.shift(); // Take the first process from the front of the queue
    const start = time;
    const exec  = Math.min(quantum, cur.remaining); // Run for quantum or remaining time, whichever is less

    time += exec;
    cur.remaining -= exec;
    gantt.push({ id: cur.id, start, end: time });

    // Enqueue any processes that arrived while this process was running
    while (i < procs.length && procs[i].arrival <= time) queue.push(procs[i++]);

    if (cur.remaining > 0) {
      queue.push(cur); // Not finished — go back to the end of the queue
    } else {
      cur.completion = time; // Finished — record completion time
      completed++;
    }
  }

  const result = procs.map(p => ({
    ...p,
    tat: p.completion - p.arrival,
    wt:  p.completion - p.arrival - p.burst
  }));

  return [result, gantt];
}


// ============================================================
// ALGORITHM 5: Priority Scheduling (Non-Preemptive)
// When the CPU is free, the available process with the highest priority
// is selected (based on prioRule: lower or higher number wins).
// Ties are broken by arrival time, then by Process ID.
// Once selected, it runs to completion.
// ============================================================
function priorityNP(procs_in) {
  return nonPreemptive(procs_in, avail =>
    avail.sort((a, b) => {
      // Sort by priority first (direction depends on prioRule)
      if (a.priority !== b.priority)
        return prioRule === 'lower' ? a.priority - b.priority : b.priority - a.priority;
      // Tie-break by arrival time, then alphabetically by ID
      if (a.arrival !== b.arrival) return a.arrival - b.arrival;
      return a.id.localeCompare(b.id);
    })[0] // Pick the first (best) process after sorting
  );
}


// ============================================================
// ALGORITHM 6: Priority Scheduling (Preemptive)
// At every tick, the highest-priority available process runs.
// If a higher-priority process arrives, it immediately preempts
// the current one.
// ============================================================
function priorityP(procs_in) {
  return tickSchedule(procs_in, avail =>
    avail.sort((a, b) => {
      // Sort by priority first (direction depends on prioRule)
      if (a.priority !== b.priority)
        return prioRule === 'lower' ? a.priority - b.priority : b.priority - a.priority;
      // Tie-break by arrival time, then alphabetically by ID
      if (a.arrival !== b.arrival) return a.arrival - b.arrival;
      return a.id.localeCompare(b.id);
    })[0] // Pick the first (best) process after sorting
  );
}


// ============================================================
// ALGORITHM 7: Priority + Round Robin (Hybrid)
// Processes are placed into separate queues based on their priority level.
// The highest-priority queue always runs first.
// Within each priority queue, Round Robin (time quantum) is used.
// If a higher-priority process arrives mid-execution, it preempts.
// ============================================================
function priorityRR(procs_in, quantum) {
  const procs = procs_in.map(p => ({ ...p, remaining: p.burst })).sort((a, b) => a.arrival - b.arrival);
  let time = 0, completed = 0, i = 0;
  const gantt  = [];
  const queues = {}; // Separate ready queue per priority level: { 0: [...], 1: [...], ... }

  while (completed < procs.length) {
    // Enqueue newly arrived processes into their priority group
    while (i < procs.length && procs[i].arrival <= time) {
      const pr = procs[i].priority;
      if (!queues[pr]) queues[pr] = [];
      queues[pr].push(procs[i++]);
    }

    // Check which priority levels have waiting processes
    const active = Object.keys(queues).filter(pr => queues[pr].length > 0).map(Number);

    if (!active.length) {
      // No process ready — CPU is idle
      gantt.push({ id: 'IDLE', start: time, end: procs[i].arrival });
      time = procs[i].arrival;
      continue;
    }

    // Select the best priority level based on the chosen rule
    const curPr = prioRule === 'lower' ? Math.min(...active) : Math.max(...active);
    const cur   = queues[curPr].shift(); // Take first process from that priority group
    const start = time;
    let done    = false;

    // Run tick-by-tick for up to quantum ticks, checking for preemption each tick
    for (let t = 0; t < quantum; t++) {
      time++;
      cur.remaining--;

      // Add any processes that arrived during this tick
      while (i < procs.length && procs[i].arrival <= time) {
        const pr = procs[i].priority;
        if (!queues[pr]) queues[pr] = [];
        queues[pr].push(procs[i++]);
      }

      // Check if the process just finished
      if (cur.remaining === 0) {
        cur.completion = time;
        completed++;
        gantt.push({ id: cur.id, start, end: time });
        done = true;
        break;
      }

      // Check if a higher-priority process has arrived — if so, preempt
      const allActive = Object.keys(queues).filter(pr => queues[pr].length > 0).map(Number);
      const higherArrived = prioRule === 'lower'
        ? allActive.some(pr => pr < curPr)
        : allActive.some(pr => pr > curPr);

      if (higherArrived) {
        queues[curPr].unshift(cur); // Return current process to the front of its queue
        gantt.push({ id: cur.id, start, end: time });
        done = true;
        break;
      }
    }

    // If the quantum expired with no interruption, put the process back at the end of its queue
    if (!done) {
      gantt.push({ id: cur.id, start, end: time });
      queues[curPr].push(cur);
    }
  }

  const result = procs.map(p => ({
    ...p,
    tat: p.completion - p.arrival,
    wt:  p.completion - p.arrival - p.burst
  }));

  return [result, gantt];
}


// ============================================================
// SORT BY PID — sortByPID(result)
// Sorts the result array by the number inside the Process ID.
// Example: P1 comes before P2, P3, etc. regardless of arrival order.
// Extracts the numeric part from the ID string (e.g. "P2" → 2).
// ============================================================
function sortByPID(result) {
  return result.slice().sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, '')); // Remove letters, keep digits
    const numB = parseInt(b.id.replace(/\D/g, ''));
    return numA - numB;
  });
}


// ============================================================
// DISPLAY RESULTS — displayResults(result, gantt, name, desc, formulas)
// Fills in Step 4 with all output:
// 1. Algorithm name, description, and formula pills
// 2. Gantt Chart (flex-based proportional blocks)
// 3. Process Summary Table (sorted by PID)
// 4. Average WT and Average TAT boxes
// Then shows Step 4 and scrolls the page to it.
// ============================================================
function displayResults(result, gantt, name, desc, formulas) {

  // Assign a unique color index to each process ID for the Gantt chart
  const colorMap = {};
  let colorIdx = 0;
  for (const g of gantt) {
    if (g.id !== 'IDLE' && !(g.id in colorMap)) colorMap[g.id] = colorIdx++ % 10;
  }

  // ---- Algorithm Header ----
  document.getElementById('algoLabel').textContent = name;
  document.getElementById('algoDesc').textContent  = desc;

  // Build formula pills (e.g. "WT = TAT − Burst Time")
  const formulaDiv = document.getElementById('algoFormula');
  formulaDiv.innerHTML = '';
  for (const f of formulas) {
    const pill = document.createElement('span');
    pill.className   = 'formula-pill';
    pill.textContent = f;
    formulaDiv.appendChild(pill);
  }

  // ---- Result Table ----
  // Sorted by PID so output always shows P1, P2, P3... in order
  const sorted = sortByPID(result);
  const tbody  = document.getElementById('resultBody');
  tbody.innerHTML = '';
  let totalWT = 0, totalTAT = 0;

  for (const p of sorted) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${p.id}</strong></td>
      <td>${p.arrival}</td>
      <td>${p.burst}</td>
      <td>${p.priority}</td>
      <td>${p.wt}</td>
      <td>${p.tat}</td>
    `;
    tbody.appendChild(row);
    totalWT  += p.wt;
    totalTAT += p.tat;
  }

  // Compute and display average WT and TAT in the two boxes below the table
  const avgWT  = (totalWT  / sorted.length).toFixed(2);
  const avgTAT = (totalTAT / sorted.length).toFixed(2);
  document.getElementById('avgBoxes').innerHTML = `
    <div class="avg-card">
      <div class="avg-title">Average Waiting Time</div>
      <div class="avg-value">${avgWT}</div>
    </div>
    <div class="avg-card">
      <div class="avg-title">Average Turnaround Time</div>
      <div class="avg-value">${avgTAT}</div>
    </div>
  `;

  // ---- Gantt Chart ----
  // Uses CSS flex proportions so blocks always fit the card width perfectly.
  // Each block gets style.flex = its duration (number of time units it ran).
  // The browser divides the total width proportionally — no pixel math needed.
  const ganttDiv = document.getElementById('ganttChart');
  ganttDiv.innerHTML = '';

  const chart     = document.createElement('div'); chart.className = 'gantt-chart';
  const blocksRow = document.createElement('div'); blocksRow.className = 'gantt-blocks';
  const timesRow  = document.createElement('div'); timesRow.className  = 'gantt-times';

  for (const g of gantt) {
    const duration = g.end - g.start; // How many time units this block ran

    // Colored block — width is set by flex = duration
    const block = document.createElement('div');
    block.className   = g.id === 'IDLE' ? 'gantt-block idle' : `gantt-block color-${colorMap[g.id]}`;
    block.style.flex  = String(duration); // Proportional width
    block.textContent = g.id;
    blocksRow.appendChild(block);

    // Time label below the block — same flex so it aligns with the block's left edge
    const tl = document.createElement('div');
    tl.className   = 'gantt-time';
    tl.style.flex  = String(duration);
    tl.textContent = g.start;
    timesRow.appendChild(tl);
  }

  // Final end-time label — no flex, sits at the far right after the last block
  const endLabel = document.createElement('div');
  endLabel.className   = 'gantt-time gantt-time-end';
  endLabel.textContent = gantt[gantt.length - 1].end;
  timesRow.appendChild(endLabel);

  chart.appendChild(blocksRow);
  chart.appendChild(timesRow);
  ganttDiv.appendChild(chart);

  // Show Step 4 and update the progress pills
  setActivePill(4);
  show('step4');
  document.getElementById('step4').scrollIntoView({ behavior: 'smooth' });
}


// ============================================================
// UTILITY: show(id) and hide(id)
// Show or hide any HTML section by its element ID.
// Works by adding/removing the "hidden" CSS class.
// ============================================================
function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }


// ============================================================
// GO TO STEP 1 — goToStep1()
// Called by the "Generate New Processes" button.
// Hides everything except Step 1, clears all input values,
// and scrolls back to the top to start fresh.
// ============================================================
function goToStep1() {
  hide('step4');
  hide('step2');
  hide('step3');

  // Clear the number of processes input and the process table
  document.getElementById('numProcesses').value = '';
  document.getElementById('processBody').innerHTML = '';

  setActivePill(1);
  document.getElementById('step1').scrollIntoView({ behavior: 'smooth' });
}


// ============================================================
// RESET ALL — resetAll()
// Called by the "Run Another Algorithm" button.
// Hides Step 4 and resets the algorithm selection area,
// then scrolls back to Step 3 so the user can pick a new algorithm
// with the same process data already entered.
// ============================================================
function resetAll() {
  hide('step4');
  hide('quantumRow');
  hide('prioDropdown');
  hide('prioRuleBox');

  pendingAlgo     = null;
  pendingPrioAlgo = null;

  // Remove the active highlight from all algorithm buttons
  document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active-algo'));

  setActivePill(3);
  document.getElementById('step3').scrollIntoView({ behavior: 'smooth' });
}