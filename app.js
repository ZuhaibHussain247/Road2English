const app = document.getElementById("app");
const questionBank = window.questionBank;
const topics = [...new Set(questionBank.map((question) => question.topic))];

const state = {
  screen: "home",
  mode: "practice",
  selectedTopics: new Set(topics),
  practiceCount: 20,
  questions: [],
  answers: [],
  checked: new Set(),
  current: 0,
  secondsLeft: 0,
  timerId: null,
  reviewQuestion: 0,
  notice: ""
};

function shuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function selectedQuestionPool() {
  return questionBank.filter((question) => state.selectedTopics.has(question.topic));
}

function correctAnswerIndices(question) {
  return Array.isArray(question.answer) ? question.answer : [question.answer];
}

function selectedAnswerIndices(answer) {
  if (answer === null) return [];
  return Array.isArray(answer) ? answer : [answer];
}

function isAnswerComplete(question, answer) {
  return selectedAnswerIndices(answer).length === correctAnswerIndices(question).length;
}

function isAnswerCorrect(question, answer) {
  const selected = selectedAnswerIndices(answer).slice().sort((a, b) => a - b);
  const correct = correctAnswerIndices(question).slice().sort((a, b) => a - b);
  return selected.length === correct.length && selected.every((index, i) => index === correct[i]);
}

function renderHome() {
  const selectedCount = selectedQuestionPool().length;
  const examQuestionCount = Math.min(24, selectedCount);
  const examMinutes = Math.ceil(45 * examQuestionCount / 24);
  app.innerHTML = `
    <section class="welcome">
      <div class="welcome-copy">
        <div class="eyebrow"><span class="eyebrow-line"></span> A LITTLE PRACTICE GOES A LONG WAY</div>
        <h1>Feel at home<br>with the <span>UK.</span></h1>
        <p class="intro">Explore the main subject areas in the official guide with independently written questions, useful explanations and a pace that feels right for you.</p>
        <div class="trust-row"><span class="mini-check">✓</span> ${questionBank.length} original practice questions <span class="trust-separator">·</span> Free, always</div>
      </div>
      <aside class="fact-card" aria-label="Test format">
        <span class="fact-icon" aria-hidden="true">✳</span>
        <p class="fact-label">THE REAL TEST</p>
        <div class="fact-main">24 <span>questions</span></div>
        <div class="fact-rule"></div>
        <div class="fact-detail"><span>Time allowed</span><strong>45 minutes</strong></div>
        <div class="fact-detail"><span>Pass mark</span><strong>18 / 24</strong></div>
      </aside>
    </section>

    <section class="setup-section" aria-labelledby="setup-title">
      <div class="section-heading">
        <div>
          <div class="eyebrow"><span class="eyebrow-line"></span> YOUR STUDY SESSION</div>
          <h2 id="setup-title">How would you like to practise?</h2>
        </div>
        <div class="question-pool-count"><span>${selectedCount}</span> questions in your pool</div>
      </div>

      <div class="mode-grid" role="group" aria-label="Choose a test mode">
        <button type="button" class="mode-card ${state.mode === "practice" ? "is-selected" : ""}" data-mode="practice" aria-pressed="${state.mode === "practice"}">
          <span class="mode-icon practice-icon" aria-hidden="true">↗</span>
          <span class="mode-card-copy"><strong>Practice</strong><span>Take your time. Check answers and learn as you go.</span></span>
          <span class="mode-time">NO TIMER</span>
        </button>
        <button type="button" class="mode-card ${state.mode === "exam" ? "is-selected" : ""}" data-mode="exam" aria-pressed="${state.mode === "exam"}">
          <span class="mode-icon exam-icon" aria-hidden="true">◷</span>
          <span class="mode-card-copy"><strong>Mock exam</strong><span>A timed run-through with a results review at the end.</span></span>
          <span class="mode-time">45 MIN</span>
        </button>
      </div>

      <div class="topic-section">
        <div class="topic-heading">
          <div>
            <h3>Choose your topics</h3>
            <p>Mix them up or focus on a subject.</p>
          </div>
          <button type="button" class="text-button" id="toggle-all-topics">${state.selectedTopics.size === topics.length ? "Clear selection" : "Select all"}</button>
        </div>
        <div class="topic-list" role="group" aria-label="Question topics">
          ${topics.map((topic) => {
            const count = questionBank.filter((question) => question.topic === topic).length;
            const isSelected = state.selectedTopics.has(topic);
            return `<button type="button" class="topic-chip ${isSelected ? "is-selected" : ""}" data-topic="${escapeHtml(topic)}" aria-pressed="${isSelected}">
              <span class="topic-check">${isSelected ? "✓" : "+"}</span><span>${escapeHtml(topic)}</span><span class="topic-count">${count}</span>
            </button>`;
          }).join("")}
        </div>
      </div>

      ${state.mode === "practice" ? `
        <div class="count-row">
          <label for="practice-count">Number of questions</label>
          <select id="practice-count">
            <option value="10" ${state.practiceCount === 10 ? "selected" : ""}>10 questions</option>
            <option value="20" ${state.practiceCount === 20 ? "selected" : ""}>20 questions</option>
            <option value="${questionBank.length}" ${state.practiceCount === questionBank.length ? "selected" : ""}>All available questions</option>
          </select>
        </div>` : `
          <div class="exam-note"><span aria-hidden="true">◷</span><span><strong>Exam conditions</strong> · ${examQuestionCount} questions in ${examMinutes} minutes. With all topics selected, you’ll get the full 24-question mock.</span></div>`}

      <div class="start-row">
        <button type="button" class="primary-button start-button" id="start-test" ${selectedCount === 0 ? "disabled" : ""}>
          ${state.mode === "exam" ? "Start mock exam" : "Start practising"} <span aria-hidden="true">→</span>
        </button>
        <span class="start-caption">${selectedCount === 0 ? "Choose at least one topic to begin" : `A fresh set from ${selectedCount} available questions`}</span>
      </div>
      <p class="disclaimer">These original questions follow the official guide’s broad subject areas, but are not official test questions and cannot replace studying the guide. <a href="https://www.gov.uk/life-in-the-uk-test" target="_blank" rel="noopener noreferrer">See official preparation guidance</a> or <a href="https://www.officiallifeintheuk.co.uk/shop" target="_blank" rel="noopener noreferrer">get the official guide</a>.</p>
    </section>`;
}

function renderQuiz() {
  const question = state.questions[state.current];
  const selectedAnswer = state.answers[state.current];
  const selectedIndices = selectedAnswerIndices(selectedAnswer);
  const selectedSet = new Set(selectedIndices);
  const correctIndices = correctAnswerIndices(question);
  const correctSet = new Set(correctIndices);
  const isMultiAnswer = correctIndices.length > 1;
  const isComplete = isAnswerComplete(question, selectedAnswer);
  const isChecked = state.checked.has(state.current);
  const answeredCount = state.answers.filter((answer, index) => isAnswerComplete(state.questions[index], answer)).length;
  const questionNumber = state.current + 1;
  const progress = (questionNumber / state.questions.length) * 100;
  const optionLetters = ["A", "B", "C", "D"];
  const answeredClass = (index) => isAnswerComplete(state.questions[index], state.answers[index]) ? "is-answered" : "";
  const currentClass = (index) => index === state.current ? "is-current" : "";
  const timer = state.mode === "exam" ? `
    <div class="timer ${state.secondsLeft < 300 ? "timer-warning" : ""}" id="timer" aria-live="polite">
      <span class="timer-icon" aria-hidden="true">◷</span> <span>${formatTime(state.secondsLeft)}</span>
    </div>` : `<span class="practice-label"><span class="status-dot"></span> PRACTICE MODE</span>`;

  app.innerHTML = `
    <section class="quiz-page">
      <div class="quiz-topline">
        <button type="button" class="back-link" id="exit-test"><span aria-hidden="true">←</span> Exit session</button>
        ${timer}
        <button type="button" class="submit-button" id="submit-test">Review &amp; submit <span aria-hidden="true">→</span></button>
      </div>
      <div class="progress-track" role="progressbar" aria-label="Question progress" aria-valuenow="${questionNumber}" aria-valuemin="1" aria-valuemax="${state.questions.length}">
        <span style="width:${progress}%"></span>
      </div>
      <div class="quiz-layout">
        <section class="question-column" aria-label="Question ${questionNumber}">
          <div class="question-meta"><span>QUESTION ${String(questionNumber).padStart(2, "0")} <span class="meta-slash">/</span> ${String(state.questions.length).padStart(2, "0")}</span><span class="topic-tag">${escapeHtml(question.topic)}</span></div>
          <h1 class="question-title">${escapeHtml(question.question)}</h1>
          <p class="question-hint">${isMultiAnswer ? `Choose ${correctIndices.length} answers below.` : "Choose one answer below."}</p>
          <div class="answer-list" role="${isMultiAnswer ? "group" : "radiogroup"}" aria-label="Answer choices">
            ${question.options.map((option, index) => {
              const isSelected = selectedSet.has(index);
              const isCorrect = correctSet.has(index);
              let resultClass = "";
              if (isChecked && isCorrect) resultClass = "is-correct";
              else if (isChecked && isSelected) resultClass = "is-incorrect";
              const selectionLimitReached = isMultiAnswer && selectedIndices.length >= correctIndices.length && !isSelected;
              return `<button type="button" class="answer-option ${isSelected ? "is-selected" : ""} ${resultClass}" data-answer="${index}" role="${isMultiAnswer ? "checkbox" : "radio"}" aria-checked="${isSelected}" ${isChecked || selectionLimitReached ? "disabled" : ""}>
                <span class="option-letter">${optionLetters[index]}</span><span class="option-text">${escapeHtml(option)}</span>
                ${isChecked && isCorrect ? '<span class="option-result" aria-label="Correct answer">✓</span>' : ""}
                ${isChecked && isSelected && !isCorrect ? '<span class="option-result" aria-label="Your answer">×</span>' : ""}
              </button>`;
            }).join("")}
          </div>
          ${isChecked ? `<div class="answer-feedback ${isAnswerCorrect(question, selectedAnswer) ? "feedback-correct" : "feedback-incorrect"}" role="status">
            <strong>${isAnswerCorrect(question, selectedAnswer) ? "That's right!" : "Not quite this time."}</strong>
            <p>${escapeHtml(question.explanation)}</p>
          </div>` : ""}
          <div class="question-actions">
            <button type="button" class="check-button" id="check-answer" ${!isComplete || isChecked ? "disabled" : ""}>Check answer <span aria-hidden="true">✓</span></button>
            <div class="step-actions">
              <button type="button" class="nav-button" id="previous-question" ${state.current === 0 ? "disabled" : ""} aria-label="Previous question">←</button>
              <button type="button" class="next-button" id="next-question">${state.current === state.questions.length - 1 ? "Finish review" : !isComplete ? "Skip question" : "Next question"} <span aria-hidden="true">→</span></button>
            </div>
          </div>
        </section>
        <aside class="question-sidebar">
          <div class="sidebar-heading"><h2>Your questions</h2><span>${answeredCount} of ${state.questions.length}</span></div>
          <p class="sidebar-copy">Select a number to move around. You can come back to any question.</p>
          <div class="question-grid" aria-label="Jump to question">
            ${state.questions.map((_, index) => `<button type="button" class="question-number ${answeredClass(index)} ${currentClass(index)}" data-question="${index}" aria-label="Question ${index + 1}${isAnswerComplete(state.questions[index], state.answers[index]) ? ", answered" : ", unanswered"}" aria-current="${index === state.current ? "step" : "false"}">${String(index + 1).padStart(2, "0")}</button>`).join("")}
          </div>
          <div class="sidebar-legend"><span><i class="legend-dot done-dot"></i> Answered</span><span><i class="legend-dot"></i> Unanswered</span></div>
          <div class="submit-reminder"><span aria-hidden="true">↗</span><p>You’ll need to answer <strong>every question</strong> before you can submit.</p></div>
        </aside>
      </div>
      ${state.notice ? `<p class="notice-banner" role="alert">${escapeHtml(state.notice)}</p>` : ""}
      ${state.mode === "exam" && state.secondsLeft === 0 ? `<p class="time-up-banner" role="status">Time is up. Answer any remaining questions to submit your test.</p>` : ""}
    </section>`;
}

function renderResults() {
  const answeredCount = state.answers.filter((answer, index) => isAnswerComplete(state.questions[index], answer)).length;
  const score = state.answers.reduce((total, answer, index) =>
    total + (isAnswerCorrect(state.questions[index], answer) ? 1 : 0), 0);
  const percentage = Math.round((score / state.questions.length) * 100);
  const passed = state.mode === "exam" && percentage >= 75;
  const scoreStatus = state.mode === "exam" ? (passed ? "PASS" : "KEEP PRACTISING") : "PRACTICE";
  const review = state.questions[state.reviewQuestion];
  const reviewAnswer = state.answers[state.reviewQuestion];
  const reviewSelected = new Set(selectedAnswerIndices(reviewAnswer));
  const reviewCorrectAnswers = new Set(correctAnswerIndices(review));
  const reviewCorrect = isAnswerCorrect(review, reviewAnswer);
  const optionLetters = ["A", "B", "C", "D"];

  app.innerHTML = `
    <section class="results-page">
      <div class="results-topline"><span class="eyebrow"><span class="eyebrow-line"></span> SESSION COMPLETE</span><button type="button" class="back-link" id="new-test">← New session</button></div>
      <div class="results-hero">
        <div>
          <p class="result-overline">${state.mode === "exam" ? "MOCK EXAM RESULTS" : "PRACTICE RESULTS"}</p>
          <h1>${state.mode === "exam" ? (passed ? "A lovely result." : "Good work getting here.") : "Good work getting here."}</h1>
          <p class="results-subtitle">${state.mode === "exam" ? (passed ? "You reached the 75% pass mark. Keep that momentum going." : "Every question is a chance to learn. Review the answers and give it another go.") : "Review the answers and explanations below, then practise again whenever you’re ready."}</p>
        </div>
        <div class="score-card ${passed ? "score-pass" : "score-review"}">
          <span class="score-caption">YOUR SCORE</span>
          <strong>${score}<span> / ${state.questions.length}</span></strong>
          <span class="score-percent">${percentage}% · ${scoreStatus}</span>
        </div>
      </div>
      <div class="results-summary"><span><i class="summary-dot correct-dot"></i><strong>${score}</strong> correct</span><span><i class="summary-dot incorrect-dot"></i><strong>${state.questions.length - score}</strong> to review</span><span><i class="summary-dot"></i><strong>${answeredCount}</strong> answered</span></div>
      <div class="results-content">
        <section class="results-nav">
          <div class="results-section-heading"><h2>Question overview</h2><span>Choose a question to review</span></div>
          <div class="result-number-grid">
            ${state.questions.map((question, index) => {
              const correct = isAnswerCorrect(question, state.answers[index]);
              return `<button type="button" class="result-number ${correct ? "result-is-correct" : "result-is-incorrect"} ${index === state.reviewQuestion ? "result-current" : ""}" data-review="${index}" aria-label="Review question ${index + 1}, ${correct ? "correct" : "incorrect"}">
                <span>${String(index + 1).padStart(2, "0")}</span><span aria-hidden="true">${correct ? "✓" : "×"}</span>
              </button>`;
            }).join("")}
          </div>
          <div class="results-legend"><span><i class="legend-dot done-dot"></i> Correct</span><span><i class="legend-dot wrong-dot"></i> Incorrect</span></div>
        </section>
        <section class="review-card" id="review-card" aria-live="polite">
          <div class="review-topline"><span>QUESTION ${String(state.reviewQuestion + 1).padStart(2, "0")}</span><span class="review-status ${reviewCorrect ? "review-correct" : "review-incorrect"}">${reviewCorrect ? "✓ Correct" : "× Incorrect"}</span></div>
          <h2>${escapeHtml(review.question)}</h2>
          <div class="review-answers">
            ${review.options.map((option, index) => {
              let className = "review-option";
              let status = "";
              const isCorrectAnswer = reviewCorrectAnswers.has(index);
              const wasSelected = reviewSelected.has(index);
              if (isCorrectAnswer) {
                className += " review-answer-correct";
                status = wasSelected ? "Correct answer · Your answer" : "Correct answer";
              } else if (wasSelected) {
                className += " review-answer-wrong";
                status = "Your answer";
              }
              return `<div class="${className}"><span class="option-letter">${optionLetters[index]}</span><span>${escapeHtml(option)}</span>${status ? `<span class="review-answer-label">${status}</span>` : ""}</div>`;
            }).join("")}
          </div>
          <div class="review-explanation"><span class="explanation-icon" aria-hidden="true">i</span><p>${escapeHtml(review.explanation)}</p></div>
          <div class="review-footer"><span>${escapeHtml(review.topic)}</span><div>
            <button type="button" class="nav-button" id="review-previous" ${state.reviewQuestion === 0 ? "disabled" : ""} aria-label="Previous result">←</button>
            <button type="button" class="next-button" id="review-next" ${state.reviewQuestion === state.questions.length - 1 ? "disabled" : ""}>Next question <span aria-hidden="true">→</span></button>
          </div></div>
        </section>
      </div>
      <div class="results-bottom"><p>Practice makes progress. Ready for another round?</p><button type="button" class="primary-button" id="new-test-bottom">Start a new session <span aria-hidden="true">→</span></button></div>
      <p class="disclaimer">Practice questions are original and for study purposes only. This score is not an official test result.</p>
    </section>`;
}

function render() {
  if (state.screen === "home") renderHome();
  else if (state.screen === "quiz") renderQuiz();
  else renderResults();
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function beginTest() {
  const pool = shuffle(selectedQuestionPool());
  if (pool.length === 0) return;
  const count = state.mode === "exam" ? Math.min(24, pool.length) : Math.min(state.practiceCount, pool.length);
  state.questions = pool.slice(0, count);
  state.answers = Array(count).fill(null);
  state.checked = new Set();
  state.current = 0;
  state.notice = "";
  state.screen = "quiz";
  state.secondsLeft = state.mode === "exam" ? Math.ceil((45 * count / 24) * 60) : 0;
  clearInterval(state.timerId);
  render();
  if (state.mode === "exam") {
    state.timerId = setInterval(() => {
      if (state.secondsLeft > 0) state.secondsLeft -= 1;
      if (state.secondsLeft === 0) clearInterval(state.timerId);
      const timerElement = document.getElementById("timer");
      if (timerElement) {
        timerElement.querySelector("span:last-child").textContent = formatTime(state.secondsLeft);
        timerElement.classList.toggle("timer-warning", state.secondsLeft < 300);
      }
      if (state.secondsLeft === 0) renderQuiz();
    }, 1000);
  }
}

function submitTest() {
  const unansweredIndex = state.answers.findIndex((answer, index) => !isAnswerComplete(state.questions[index], answer));
  if (unansweredIndex !== -1) {
    state.current = unansweredIndex;
    const requiredCount = correctAnswerIndices(state.questions[unansweredIndex]).length;
    state.notice = `Question ${unansweredIndex + 1} needs ${requiredCount === 1 ? "an answer" : `${requiredCount} answers`}. Complete every question before submitting.`;
    renderQuiz();
    return;
  }
  clearInterval(state.timerId);
  state.timerId = null;
  state.screen = "results";
  state.reviewQuestion = 0;
  state.notice = "";
  renderResults();
  app.focus();
}

function moveToQuestion(index) {
  if (index < 0 || index >= state.questions.length) return;
  state.current = index;
  state.notice = "";
  renderQuiz();
}

function resetToHome() {
  clearInterval(state.timerId);
  state.timerId = null;
  state.screen = "home";
  state.questions = [];
  state.answers = [];
  state.checked = new Set();
  state.current = 0;
  state.notice = "";
  renderHome();
  app.focus();
}

app.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.mode) {
    state.mode = button.dataset.mode;
    renderHome();
  } else if (button.dataset.topic) {
    const topic = button.dataset.topic;
    if (state.selectedTopics.has(topic)) state.selectedTopics.delete(topic);
    else state.selectedTopics.add(topic);
    renderHome();
  } else if (button.id === "toggle-all-topics") {
    state.selectedTopics = state.selectedTopics.size === topics.length ? new Set() : new Set(topics);
    renderHome();
  } else if (button.id === "start-test") {
    beginTest();
  } else if (button.id === "exit-test") {
    resetToHome();
  } else if (button.id === "submit-test") {
    submitTest();
  } else if (button.dataset.answer !== undefined) {
    const question = state.questions[state.current];
    const answerIndex = Number(button.dataset.answer);
    if (correctAnswerIndices(question).length > 1) {
      const selected = selectedAnswerIndices(state.answers[state.current]);
      if (selected.includes(answerIndex)) {
        state.answers[state.current] = selected.filter((index) => index !== answerIndex);
      } else if (selected.length < correctAnswerIndices(question).length) {
        state.answers[state.current] = [...selected, answerIndex];
      }
    } else {
      state.answers[state.current] = answerIndex;
    }
    state.checked.delete(state.current);
    state.notice = "";
    renderQuiz();
  } else if (button.id === "check-answer") {
    if (isAnswerComplete(state.questions[state.current], state.answers[state.current])) {
      state.checked.add(state.current);
      renderQuiz();
    }
  } else if (button.id === "previous-question") {
    moveToQuestion(state.current - 1);
  } else if (button.id === "next-question") {
    if (state.current < state.questions.length - 1) moveToQuestion(state.current + 1);
    else {
      const unansweredIndex = state.answers.findIndex((answer, index) => !isAnswerComplete(state.questions[index], answer));
      if (unansweredIndex !== -1) moveToQuestion(unansweredIndex);
      else submitTest();
    }
  } else if (button.dataset.question !== undefined) {
    moveToQuestion(Number(button.dataset.question));
  } else if (button.id === "new-test" || button.id === "new-test-bottom" || button.id === "home-link") {
    event.preventDefault();
    resetToHome();
  } else if (button.dataset.review !== undefined) {
    state.reviewQuestion = Number(button.dataset.review);
    renderResults();
    document.getElementById("review-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
  } else if (button.id === "review-previous" && state.reviewQuestion > 0) {
    state.reviewQuestion -= 1;
    renderResults();
  } else if (button.id === "review-next" && state.reviewQuestion < state.questions.length - 1) {
    state.reviewQuestion += 1;
    renderResults();
  }
});

app.addEventListener("change", (event) => {
  if (event.target.id === "practice-count") state.practiceCount = Number(event.target.value);
});

document.getElementById("home-link").addEventListener("click", (event) => {
  event.preventDefault();
  resetToHome();
});

document.addEventListener("keydown", (event) => {
  if (state.screen !== "quiz" || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === "ArrowRight" && state.current < state.questions.length - 1) moveToQuestion(state.current + 1);
  if (event.key === "ArrowLeft" && state.current > 0) moveToQuestion(state.current - 1);
});

renderHome();
