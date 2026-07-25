const STORAGE_KEY = "bandmanager-local-prototype-v1";
const MODE_KEY = "bandmanager-mode-v1";
const AUTH_KEY = "bandmanager-auth-v1";

const cloudConfig = {
  region: "eu-west-1",
  userPoolClientId: "35rb9p01ephnltfudsa3o04u18",
  controlPlaneApiUrl: "https://6xlmt0zsbf.execute-api.eu-west-1.amazonaws.com/dev",
  bandmanagerApiUrl: "https://q108svdio9.execute-api.eu-west-1.amazonaws.com/dev"
};

const testUsers = [
  { id: "u-alan", name: "Alan Heraty", email: "alan@example.test" },
  { id: "u-conor", name: "Conor", email: "conor@example.test" },
  { id: "u-maeve", name: "Maeve", email: "maeve@example.test" }
];

const eventTypes = {
  gig: "Gig",
  rehearsal: "Rehearsal",
  recording: "Recording",
  meeting: "Meeting",
  other: "Other"
};

let state = loadState();
let runtimeMode = localStorage.getItem(MODE_KEY) || (location.hostname.includes("amplifyapp.com") ? "cloud" : "local");
let authState = loadAuthState();
let pendingSignup = null;
let currentMonth = new Date("2026-07-01T12:00:00");
let activeView = "month";
let activeSection = "calendar";
let selectedEventId = state.events[0]?.id || null;
let selectedSetlistId = null;
let selectedSongId = null;
let selectedPosterId = null;

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  bindElements();
  bindActions();
  await startApp();
});

function bindElements() {
  [
    "authShell", "appShell", "cloudModeButton", "localModeButton", "authModeLabel", "signinForm", "signinEmail",
    "signinPassword", "signinMessage", "signupForm", "signupName", "signupEmail", "signupMessage",
    "verifyForm", "verifyCode", "verifyPassword", "verifyMessage",
    "workspaceModeLabel", "localUserPanel", "cloudUserPanel", "cloudUserLabel", "signOutButton",
    "appCloudModeButton", "appLocalModeButton",
    "userSelect", "bandList", "newBandButton", "joinLink", "copyJoinLinkButton", "joinBandButton", "joinLinkHint",
    "bandRoleLabel", "activeBandName", "calendarSectionButton", "setlistsSectionButton", "postersSectionButton", "previousMonthButton", "todayButton", "nextMonthButton",
    "newEventButton", "newSetlistButton", "newPosterButton", "monthLabel", "monthSummary", "monthViewButton", "agendaViewButton", "monthView",
    "agendaView", "eventDetail", "editSelectedEventButton", "notificationLog", "clearNotificationsButton",
    "calendarSection", "setlistsSection", "setlistSummary", "newSongButton", "setlistList", "selectedSetlistName",
    "addSongToSetlistButton", "setlistSongs", "editSongButton", "songDetail",
    "postersSection", "posterSummary", "posterBoard", "editPosterButton", "posterDetail",
    "eventDialog", "eventForm", "eventDialogTitle", "eventId", "eventTitle", "eventType", "eventStart",
    "eventEnd", "eventStatus", "eventLocation", "newVenueName", "paymentAmount", "paymentCurrency",
    "paymentStatus", "paymentNotes", "eventNotes", "eventAttachments", "existingAttachments",
    "cancelEventButton", "closeEventDialogButton", "dismissEventDialogButton", "bandDialog", "bandForm",
    "bandNameInput", "closeBandDialogButton", "dismissBandDialogButton", "setlistDialog", "setlistForm",
    "setlistNameInput", "closeSetlistDialogButton", "dismissSetlistDialogButton", "songDialog", "songForm",
    "songDialogTitle", "songId", "songTitle", "songKey", "songTempo", "songAttachmentName", "songLyrics",
    "closeSongDialogButton", "dismissSongDialogButton", "posterDialog", "posterForm", "posterDialogTitle",
    "posterId", "posterTitle", "posterStatus", "posterEvent", "posterOwner", "posterFile", "posterFileName",
    "posterNotes", "closePosterDialogButton", "dismissPosterDialogButton"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindActions() {
  els.cloudModeButton.addEventListener("click", async () => {
    await setRuntimeMode("cloud");
  });

  els.localModeButton.addEventListener("click", async () => {
    await setRuntimeMode("local");
  });

  els.appCloudModeButton.addEventListener("click", async () => {
    await setRuntimeMode("cloud");
  });

  els.appLocalModeButton.addEventListener("click", async () => {
    await setRuntimeMode("local");
  });

  els.signinForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await signInWithPassword(els.signinEmail.value.trim(), els.signinPassword.value);
  });

  els.signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await startSignup(els.signupName.value.trim(), els.signupEmail.value.trim());
  });

  els.verifyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await completeSignup(els.verifyCode.value.trim(), els.verifyPassword.value);
  });

  els.signOutButton.addEventListener("click", async () => {
    signOut();
    await startApp();
  });

  els.userSelect.addEventListener("change", () => {
    state.activeUserId = els.userSelect.value;
    const availableBands = bandsForActiveUser();
    if (!availableBands.find((band) => band.id === state.activeBandId)) {
      state.activeBandId = availableBands[0]?.id || state.bands[0]?.id;
    }
    saveAndRender();
  });

  els.newBandButton.addEventListener("click", () => {
    els.bandNameInput.value = "";
    openModal(els.bandDialog);
  });

  els.closeBandDialogButton.addEventListener("click", () => closeModal(els.bandDialog));
  els.dismissBandDialogButton.addEventListener("click", () => closeModal(els.bandDialog));

  els.bandForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createBand(els.bandNameInput.value.trim());
    closeModal(els.bandDialog);
  });

  els.copyJoinLinkButton.addEventListener("click", async () => {
    const text = await joinLinkForActiveBand();
    await copyText(text);
    addNotification("Join link copied", `${isCloudMode() ? "Cloud" : "Local"} invite ready for ${activeBand().name}.`, "system");
    saveAndRender();
  });

  els.joinBandButton.addEventListener("click", () => {
    joinActiveBandAsSelectedUser();
  });

  els.calendarSectionButton.addEventListener("click", () => {
    activeSection = "calendar";
    render();
  });

  els.setlistsSectionButton.addEventListener("click", () => {
    activeSection = "setlists";
    ensureSetlistSelection();
    render();
  });

  els.postersSectionButton.addEventListener("click", () => {
    activeSection = "posters";
    ensurePosterSelection();
    render();
  });

  els.previousMonthButton.addEventListener("click", () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1, 12);
    render();
  });

  els.nextMonthButton.addEventListener("click", () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1, 12);
    render();
  });

  els.todayButton.addEventListener("click", () => {
    currentMonth = new Date();
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1, 12);
    render();
  });

  els.monthViewButton.addEventListener("click", () => {
    activeView = "month";
    render();
  });

  els.agendaViewButton.addEventListener("click", () => {
    activeView = "agenda";
    render();
  });

  els.newEventButton.addEventListener("click", () => openEventDialog());
  els.newSetlistButton.addEventListener("click", () => openSetlistDialog());
  els.newPosterButton.addEventListener("click", () => openPosterDialog());
  els.newSongButton.addEventListener("click", () => openSongDialog());
  els.addSongToSetlistButton.addEventListener("click", () => openAddSongToSetlistDialog());
  els.editSongButton.addEventListener("click", () => {
    if (selectedSongId) openSongDialog(selectedSongId);
  });
  els.editPosterButton.addEventListener("click", () => {
    if (selectedPosterId) openPosterDialog(selectedPosterId);
  });
  els.editSelectedEventButton.addEventListener("click", () => {
    if (selectedEventId) openEventDialog(selectedEventId);
  });

  els.closeEventDialogButton.addEventListener("click", () => closeModal(els.eventDialog));
  els.dismissEventDialogButton.addEventListener("click", () => closeModal(els.eventDialog));
  els.cancelEventButton.addEventListener("click", () => cancelCurrentEvent());

  els.eventForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveEventFromForm();
  });

  els.clearNotificationsButton.addEventListener("click", () => {
    state.notifications = [];
    saveAndRender();
  });

  els.closeSetlistDialogButton.addEventListener("click", () => closeModal(els.setlistDialog));
  els.dismissSetlistDialogButton.addEventListener("click", () => closeModal(els.setlistDialog));
  els.setlistForm.addEventListener("submit", (event) => {
    event.preventDefault();
    createSetlist(els.setlistNameInput.value.trim());
    closeModal(els.setlistDialog);
  });

  els.closeSongDialogButton.addEventListener("click", () => closeModal(els.songDialog));
  els.dismissSongDialogButton.addEventListener("click", () => closeModal(els.songDialog));
  els.songForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveSongFromForm();
  });

  els.closePosterDialogButton.addEventListener("click", () => closeModal(els.posterDialog));
  els.dismissPosterDialogButton.addEventListener("click", () => closeModal(els.posterDialog));
  els.posterFile.addEventListener("change", () => {
    const file = els.posterFile.files?.[0];
    if (file) els.posterFileName.value = file.name;
  });
  els.posterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    savePosterFromForm();
  });
}

async function startApp() {
  updateModeControls();
  if (isCloudMode()) {
    if (!authState?.idToken) {
      showAuth();
      return;
    }
    showApp();
    await loadCloudWorkspace();
    if (!authState?.idToken) {
      showAuth();
      return;
    }
    render();
    return;
  }
  showApp();
  render();
}

async function setRuntimeMode(mode) {
  runtimeMode = mode;
  localStorage.setItem(MODE_KEY, runtimeMode);
  updateModeControls();
  await startApp();
}

function isCloudMode() {
  return runtimeMode === "cloud";
}

function updateModeControls() {
  els.cloudModeButton?.classList.toggle("active", isCloudMode());
  els.localModeButton?.classList.toggle("active", !isCloudMode());
  els.appCloudModeButton?.classList.toggle("active", isCloudMode());
  els.appLocalModeButton?.classList.toggle("active", !isCloudMode());
  els.authModeLabel.textContent = isCloudMode() ? "Cloud workspace" : "Local prototype";
  els.workspaceModeLabel.textContent = isCloudMode() ? "Cloud band workspace" : "Local band workspace";
}

function showAuth() {
  document.body.classList.add("auth-active");
  els.authShell.classList.remove("hidden");
  els.appShell.classList.add("hidden");
}

function showApp() {
  document.body.classList.remove("auth-active");
  els.authShell.classList.add("hidden");
  els.appShell.classList.remove("hidden");
}

function loadAuthState() {
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

function saveAuthState(nextAuth) {
  authState = nextAuth;
  localStorage.setItem(AUTH_KEY, JSON.stringify(nextAuth));
}

function signOut() {
  authState = null;
  localStorage.removeItem(AUTH_KEY);
}

async function startSignup(name, email) {
  setMessage(els.signupMessage, "Sending verification code...");
  try {
    const response = await fetch(`${cloudConfig.controlPlaneApiUrl}/public/onboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email })
    });
    const data = await readJson(response);
    if (!response.ok) throw new Error(data.detail || "Could not start signup");
    pendingSignup = { name, email, sessionToken: data.session_token };
    els.verifyForm.classList.remove("hidden");
    els.verifyCode.focus();
    setMessage(els.signupMessage, `Code sent to ${email}.`);
    setMessage(els.verifyMessage, "Enter the code and choose a password.");
  } catch (error) {
    setMessage(els.signupMessage, error.message, true);
  }
}

async function completeSignup(code, password) {
  if (!pendingSignup) {
    setMessage(els.verifyMessage, "Start signup first.", true);
    return;
  }
  setMessage(els.verifyMessage, "Verifying...");
  try {
    let response = await fetch(`${cloudConfig.controlPlaneApiUrl}/public/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: pendingSignup.email,
        code,
        session_token: pendingSignup.sessionToken
      })
    });
    let data = await readJson(response);
    if (!response.ok) throw new Error(data.detail || "Verification failed");

    response = await fetch(`${cloudConfig.controlPlaneApiUrl}/public/complete-signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: pendingSignup.email,
        password,
        session_token: pendingSignup.sessionToken
      })
    });
    data = await readJson(response);
    if (!response.ok) throw new Error(data.detail || "Could not create account");

    await signInWithPassword(pendingSignup.email, password);
    pendingSignup = null;
  } catch (error) {
    setMessage(els.verifyMessage, error.message, true);
  }
}

async function signInWithPassword(email, password) {
  setMessage(els.signinMessage, "Signing in...");
  try {
    const data = await cognitoRequest("InitiateAuth", {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: cloudConfig.userPoolClientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    });
    saveAuthState({
      email,
      idToken: data.AuthenticationResult.IdToken,
      refreshToken: data.AuthenticationResult.RefreshToken,
      expiresAt: Date.now() + (data.AuthenticationResult.ExpiresIn * 1000)
    });
    els.signinPassword.value = "";
    await startApp();
  } catch (error) {
    setMessage(els.signinMessage, error.message, true);
  }
}

async function cognitoRequest(target, body) {
  const response = await fetch(`https://cognito-idp.${cloudConfig.region}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`
    },
    body: JSON.stringify(body)
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.message || data.__type || "Cognito request failed");
  }
  return data;
}

async function getIdToken() {
  if (!authState?.idToken) throw new Error("Not signed in");
  if (authState.expiresAt && authState.expiresAt - Date.now() > 60_000) {
    return authState.idToken;
  }
  const data = await cognitoRequest("InitiateAuth", {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: cloudConfig.userPoolClientId,
    AuthParameters: {
      REFRESH_TOKEN: authState.refreshToken
    }
  });
  saveAuthState({
    ...authState,
    idToken: data.AuthenticationResult.IdToken,
    expiresAt: Date.now() + (data.AuthenticationResult.ExpiresIn * 1000)
  });
  return authState.idToken;
}

async function apiRequest(path, options = {}) {
  const token = await getIdToken();
  const response = await fetch(`${cloudConfig.bandmanagerApiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  const data = await readJson(response);
  if (!response.ok) {
    if (response.status === 401) signOut();
    throw new Error(data.detail || data.message || "API request failed");
  }
  return data;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

function setMessage(element, message, isError = false) {
  element.textContent = message || "";
  element.classList.toggle("error", Boolean(isError));
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return migrateState(JSON.parse(stored));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  return migrateState(seedState());
}

function migrateState(nextState) {
  const seeded = seedState();
  nextState.songs ||= seeded.songs;
  nextState.setlists ||= seeded.setlists;
  nextState.setlistSongs ||= seeded.setlistSongs;
  nextState.posters ||= seeded.posters;
  return nextState;
}

function seedState() {
  return {
    activeUserId: "u-alan",
    activeBandId: "b-firbolg",
    bands: [
      { id: "b-firbolg", name: "Fir Bolg", createdByUserId: "u-alan", defaultCurrency: "EUR" },
      { id: "b-session", name: "Session Players", createdByUserId: "u-alan", defaultCurrency: "EUR" }
    ],
    memberships: [
      { bandId: "b-firbolg", userId: "u-alan", role: "owner" },
      { bandId: "b-firbolg", userId: "u-conor", role: "member" },
      { bandId: "b-session", userId: "u-alan", role: "owner" }
    ],
    venues: [
      { id: "v-dock", bandId: "b-firbolg", name: "The Dock", address: "Carrick-on-Shannon", mapLink: "https://maps.example.test/the-dock" },
      { id: "v-studio", bandId: "b-firbolg", name: "Studio Room", address: "Longford", mapLink: "" },
      { id: "v-hall", bandId: "b-session", name: "Town Hall", address: "Dublin", mapLink: "" }
    ],
    events: [
      {
        id: "e-1",
        bandId: "b-firbolg",
        title: "Rehearsal",
        type: "rehearsal",
        status: "scheduled",
        startsAt: "2026-07-10T19:30",
        endsAt: "2026-07-10T21:30",
        venueId: "v-studio",
        paymentAmount: "",
        paymentCurrency: "EUR",
        paymentStatus: "unknown",
        paymentNotes: "",
        notes: "Run the new endings and agree keys.",
        attachments: [],
        createdByUserId: "u-alan",
        updatedByUserId: "u-alan",
        updatedAt: new Date().toISOString()
      },
      {
        id: "e-2",
        bandId: "b-firbolg",
        title: "Saturday night gig",
        type: "gig",
        status: "scheduled",
        startsAt: "2026-07-18T20:00",
        endsAt: "2026-07-18T23:00",
        venueId: "v-dock",
        paymentAmount: "650",
        paymentCurrency: "EUR",
        paymentStatus: "confirmed",
        paymentNotes: "Band fee paid on the night.",
        notes: "Bring small PA and two vocal mics.",
        attachments: [{ id: "a-1", name: "booking-confirmation.pdf", type: "application/pdf", size: 126000, uploadedByUserId: "u-alan" }],
        createdByUserId: "u-alan",
        updatedByUserId: "u-alan",
        updatedAt: new Date().toISOString()
      }
    ],
    notifications: [
      { id: "n-1", title: "Event created", body: "Saturday night gig added for Fir Bolg.", kind: "email + push", createdAt: new Date().toISOString() }
    ],
    songs: [
      {
        id: "s-rogues",
        bandId: "b-firbolg",
        title: "House of Rogues",
        key: "D",
        tempo: "116 bpm",
        lyrics: "We came down through the weather\nWith the night still in our coats\nThere were songs around the doorway\nAnd old stories in our throats\n\nRaise it up for the house of rogues\nRaise it up where the wild wind goes",
        attachmentName: "house-of-rogues-lyrics.pdf"
      },
      {
        id: "s-struggle",
        bandId: "b-firbolg",
        title: "The Struggle is Reel",
        key: "Em",
        tempo: "124 bpm",
        lyrics: "Instrumental set notes:\n\nStart tight and dry.\nSecond time through, lift the guitar pulse.\nHold back before the last reel and finish together.",
        attachmentName: "struggle-is-reel-notes.pdf"
      },
      {
        id: "s-black",
        bandId: "b-firbolg",
        title: "Black is the Colour",
        key: "Am",
        tempo: "Free",
        lyrics: "Black is the colour of my true love's hair\nHer lips are like some roses fair\nThe sweetest smile and the gentlest hands\nI love the ground whereon she stands",
        attachmentName: "black-is-the-colour-lyrics.txt"
      },
      {
        id: "s-session-waltz",
        bandId: "b-session",
        title: "Late Waltz",
        key: "G",
        tempo: "92 bpm",
        lyrics: "Simple instrumental placeholder.\nKeep the first pass sparse, then add harmony on repeat.",
        attachmentName: ""
      }
    ],
    setlists: [
      { id: "sl-summer", bandId: "b-firbolg", name: "Summer pub set", createdByUserId: "u-alan" },
      { id: "sl-short", bandId: "b-firbolg", name: "Short support set", createdByUserId: "u-alan" },
      { id: "sl-session", bandId: "b-session", name: "Sunday session", createdByUserId: "u-alan" }
    ],
    setlistSongs: [
      { setlistId: "sl-summer", songId: "s-rogues", order: 1 },
      { setlistId: "sl-summer", songId: "s-struggle", order: 2 },
      { setlistId: "sl-summer", songId: "s-black", order: 3 },
      { setlistId: "sl-short", songId: "s-rogues", order: 1 },
      { setlistId: "sl-short", songId: "s-black", order: 2 },
      { setlistId: "sl-session", songId: "s-session-waltz", order: 1 }
    ],
    posters: [
      {
        id: "p-dock",
        bandId: "b-firbolg",
        title: "Saturday night gig poster",
        eventId: "e-2",
        status: "approved",
        owner: "Alan",
        fileName: "saturday-night-gig-poster.jpg",
        notes: "Square crop for socials, A3 version for the venue window.",
        createdByUserId: "u-alan",
        updatedAt: new Date().toISOString()
      },
      {
        id: "p-rehearsal",
        bandId: "b-firbolg",
        title: "Album fundraiser draft",
        eventId: "",
        status: "draft",
        owner: "Maeve",
        fileName: "album-fundraiser-draft.pdf",
        notes: "Waiting on final date before publishing.",
        createdByUserId: "u-maeve",
        updatedAt: new Date().toISOString()
      },
      {
        id: "p-session",
        bandId: "b-session",
        title: "Sunday session poster",
        eventId: "",
        status: "published",
        owner: "Alan",
        fileName: "sunday-session-poster.png",
        notes: "Used for the weekly social post.",
        createdByUserId: "u-alan",
        updatedAt: new Date().toISOString()
      }
    ]
  };
}

function saveState() {
  if (isCloudMode()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveAndRender() {
  if (!isCloudMode()) saveState();
  render();
}

async function loadCloudWorkspace() {
  try {
    const me = await apiRequest("/me");
    const bandsResponse = await apiRequest("/bands");
    const bands = bandsResponse.bands || [];
    const cloudUser = {
      id: me.user_id,
      name: me.name || me.email,
      email: me.email
    };
    const memberships = bands.map((band) => ({
      bandId: band.band_id,
      userId: cloudUser.id,
      role: band.role || "member"
    }));

    let activeBandId = state.activeBandId;
    if (!bands.find((band) => band.band_id === activeBandId)) {
      activeBandId = bands[0]?.band_id || "";
    }

    const cloudEvents = [];
    if (activeBandId) {
      const eventsResponse = await apiRequest(`/bands/${activeBandId}/events`);
      cloudEvents.push(...(eventsResponse.events || []).map(toLocalEvent));
    }

    state = {
      activeUserId: cloudUser.id,
      activeBandId,
      cloudUser,
      bands: bands.map(toLocalBand),
      memberships,
      venues: cloudEvents
        .filter((event) => event.venueId)
        .map((event) => ({ id: event.venueId, bandId: event.bandId, name: event.venueName, address: event.venueAddress || "", mapLink: "" })),
      events: cloudEvents,
      notifications: state.notifications || [],
      setlists: [],
      songs: [],
      setlistSongs: [],
      posters: []
    };
    selectedEventId = cloudEvents[0]?.id || null;
    await redeemPendingJoinLink();
    selectedEventId = state.events[0]?.id || null;
  } catch (error) {
    addNotification("Cloud load failed", error.message, "system");
    signOut();
  }
}

async function redeemPendingJoinLink() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("join");
  if (!token) return;
  const result = await apiRequest(`/join-links/${encodeURIComponent(token)}/redeem`, { method: "POST", body: "{}" });
  window.history.replaceState({}, "", window.location.pathname);
  const joinedBandId = result.band?.band_id;
  if (joinedBandId) {
    const bandsResponse = await apiRequest("/bands");
    state.bands = (bandsResponse.bands || []).map(toLocalBand);
    state.memberships = (bandsResponse.bands || []).map((band) => ({
      bandId: band.band_id,
      userId: state.activeUserId,
      role: band.role || "member"
    }));
    state.activeBandId = joinedBandId;
    await loadCloudEventsForActiveBand();
    addNotification("Band joined", `You joined ${result.band.name}.`, "system");
  }
}

async function loadCloudEventsForActiveBand() {
  if (!isCloudMode() || !state.activeBandId) return;
  const eventsResponse = await apiRequest(`/bands/${state.activeBandId}/events`);
  state.events = (eventsResponse.events || []).map(toLocalEvent);
  state.venues = state.events
    .filter((event) => event.venueId)
    .map((event) => ({ id: event.venueId, bandId: event.bandId, name: event.venueName, address: event.venueAddress || "", mapLink: "" }));
  selectedEventId = state.events.find((event) => event.id === selectedEventId)?.id || state.events[0]?.id || null;
}

function toLocalBand(band) {
  return {
    id: band.band_id,
    name: band.name,
    createdByUserId: band.created_by_user_id,
    defaultCurrency: band.default_currency || "EUR",
    timezone: band.timezone || "Europe/Dublin"
  };
}

function toLocalEvent(event) {
  const venueId = event.venue_name ? `venue-${event.event_id}` : "";
  return {
    id: event.event_id,
    bandId: event.band_id,
    title: event.title,
    type: event.event_type || "gig",
    status: event.status || "scheduled",
    startsAt: toDatetimeInputValue(event.starts_at),
    endsAt: toDatetimeInputValue(event.ends_at),
    venueId,
    venueName: event.venue_name || "",
    venueAddress: event.venue_address || "",
    paymentAmount: event.payment_amount === null || event.payment_amount === undefined ? "" : String(event.payment_amount),
    paymentCurrency: event.payment_currency || "EUR",
    paymentStatus: event.payment_status || "unknown",
    paymentNotes: event.payment_notes || "",
    notes: event.notes || "",
    attachments: [],
    createdByUserId: event.created_by_user_id,
    updatedByUserId: event.updated_by_user_id,
    updatedAt: event.updated_at
  };
}

function toDatetimeInputValue(value) {
  if (!value) return "";
  return String(value).replace("Z", "").slice(0, 16);
}

function render() {
  ensureSetlistSelection();
  renderUsers();
  renderBands();
  renderHeader();
  renderSection();
  renderCalendar();
  renderEventDetail();
  renderNotifications();
  renderSetlists();
  renderPosters();
}

function renderUsers() {
  updateModeControls();
  els.localUserPanel.classList.toggle("hidden", isCloudMode());
  els.cloudUserPanel.classList.toggle("hidden", !isCloudMode());
  els.joinBandButton.classList.toggle("hidden", isCloudMode());
  els.joinLinkHint.textContent = isCloudMode()
    ? "Create a real join link for the selected band."
    : "Share this locally to simulate joining the selected band.";
  if (isCloudMode()) {
    els.cloudUserLabel.textContent = state.cloudUser?.email || authState?.email || "Cloud user";
    return;
  }
  els.userSelect.innerHTML = testUsers.map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`).join("");
  els.userSelect.value = state.activeUserId;
}

function renderBands() {
  const bands = bandsForActiveUser();
  els.bandList.innerHTML = bands.map((band) => {
    const membership = membershipFor(band.id, state.activeUserId);
    return `<button class="band-item ${band.id === state.activeBandId ? "active" : ""}" type="button" data-band-id="${band.id}">
      ${escapeHtml(band.name)}
      <span>${escapeHtml(roleLabel(membership?.role || "member"))}</span>
    </button>`;
  }).join("");

  els.bandList.querySelectorAll("[data-band-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.activeBandId = button.dataset.bandId;
      if (isCloudMode()) {
        await loadCloudEventsForActiveBand();
      }
      selectedEventId = eventsForActiveBand()[0]?.id || null;
      selectedSetlistId = setlistsForActiveBand()[0]?.id || null;
      selectedSongId = songsForSelectedSetlist()[0]?.id || null;
      selectedPosterId = postersForActiveBand()[0]?.id || null;
      saveAndRender();
    });
  });

  els.joinLink.textContent = joinLinkDisplayForActiveBand();
}

function renderHeader() {
  const band = activeBand();
  const membership = activeMembership();
  els.activeBandName.textContent = band?.name || "No band selected";
  els.bandRoleLabel.textContent = `${roleLabel(membership?.role || "member")} workspace`;
}

function renderSection() {
  const isCalendar = activeSection === "calendar";
  const isSetlists = activeSection === "setlists";
  const isPosters = activeSection === "posters";
  els.calendarSection.classList.toggle("hidden", !isCalendar);
  els.setlistsSection.classList.toggle("hidden", !isSetlists);
  els.postersSection.classList.toggle("hidden", !isPosters);
  els.calendarSectionButton.classList.toggle("active", isCalendar);
  els.setlistsSectionButton.classList.toggle("active", isSetlists);
  els.postersSectionButton.classList.toggle("active", isPosters);
  document.querySelectorAll(".calendar-action").forEach((item) => item.classList.toggle("hidden", !isCalendar));
  document.querySelectorAll(".setlist-action").forEach((item) => item.classList.toggle("hidden", !isSetlists));
  document.querySelectorAll(".poster-action").forEach((item) => item.classList.toggle("hidden", !isPosters));
}

function renderCalendar() {
  const events = eventsForActiveBand();
  const visibleEvents = events.filter((event) => {
    const date = parseLocalDate(event.startsAt);
    return date.getFullYear() === currentMonth.getFullYear() && date.getMonth() === currentMonth.getMonth();
  });
  els.monthLabel.textContent = currentMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  els.monthSummary.textContent = `${visibleEvents.length} event${visibleEvents.length === 1 ? "" : "s"} this month`;
  els.monthViewButton.classList.toggle("active", activeView === "month");
  els.agendaViewButton.classList.toggle("active", activeView === "agenda");
  els.monthView.classList.toggle("hidden", activeView !== "month");
  els.agendaView.classList.toggle("hidden", activeView !== "agenda");
  renderMonth(events);
  renderAgenda(events);
}

function renderMonth(events) {
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1 - startOffset);
  const todayKey = dateKey(new Date());
  let html = weekdays.map((day) => `<div class="weekday">${day}</div>`).join("");

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const key = dateKey(day);
    const dayEvents = events.filter((event) => dateKey(parseLocalDate(event.startsAt)) === key);
    html += `<div class="day-cell ${day.getMonth() !== currentMonth.getMonth() ? "outside" : ""} ${key === todayKey ? "today" : ""}">
      <div class="day-head"><span>${day.getDate()}</span><span>${dayEvents.length ? dayEvents.length : ""}</span></div>
      <div class="day-events">
        ${dayEvents.map((event) => eventChip(event)).join("")}
      </div>
    </div>`;
  }

  els.monthView.innerHTML = html;
  bindEventButtons(els.monthView);
}

function renderAgenda(events) {
  const sorted = [...events].sort((a, b) => parseLocalDate(a.startsAt) - parseLocalDate(b.startsAt));
  if (!sorted.length) {
    els.agendaView.innerHTML = `<div class="detail-empty" style="padding: 18px;">No events in this band yet.</div>`;
    return;
  }
  els.agendaView.innerHTML = sorted.map((event) => {
    const venue = venueFor(event.venueId);
    return `<button class="agenda-item" type="button" data-event-id="${event.id}">
      <div class="agenda-date">${formatDate(event.startsAt)}<br>${formatTime(event.startsAt)}</div>
      <div>
        <h4>${escapeHtml(event.title)}</h4>
        <p class="muted">${escapeHtml(venue?.name || "No venue")} · ${escapeHtml(eventTypes[event.type] || event.type)}</p>
        <div class="tag-row">
          ${event.paymentAmount ? `<span class="tag money">${escapeHtml(event.paymentCurrency)} ${escapeHtml(event.paymentAmount)}</span>` : ""}
          <span class="tag status">${escapeHtml(event.status)}</span>
          ${event.attachments?.length ? `<span class="tag">${event.attachments.length} attachment${event.attachments.length === 1 ? "" : "s"}</span>` : ""}
        </div>
      </div>
    </button>`;
  }).join("");
  bindEventButtons(els.agendaView);
}

function eventChip(event) {
  return `<button class="event-chip ${event.status === "cancelled" ? "cancelled" : ""}" type="button" data-event-id="${event.id}">
    ${escapeHtml(formatTime(event.startsAt))} ${escapeHtml(event.title)}
    <small>${escapeHtml(eventTypes[event.type] || event.type)}</small>
  </button>`;
}

function bindEventButtons(root) {
  root.querySelectorAll("[data-event-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedEventId = button.dataset.eventId;
      renderEventDetail();
    });
  });
}

function renderEventDetail() {
  const event = state.events.find((item) => item.id === selectedEventId && item.bandId === state.activeBandId);
  if (!event) {
    els.eventDetail.innerHTML = `<p class="detail-empty">Select an event or create a new one.</p>`;
    els.editSelectedEventButton.disabled = true;
    return;
  }
  els.editSelectedEventButton.disabled = false;
  const venue = venueFor(event.venueId);
  const attachments = event.attachments || [];
  els.eventDetail.innerHTML = `
    <div>
      <h3 class="detail-title">${escapeHtml(event.title)}</h3>
      <div class="tag-row">
        <span class="tag">${escapeHtml(eventTypes[event.type] || event.type)}</span>
        <span class="tag status">${escapeHtml(event.status)}</span>
      </div>
    </div>
    <div class="detail-list">
      <div class="detail-line"><span>When</span><strong>${escapeHtml(formatDateTimeRange(event))}</strong></div>
      <div class="detail-line"><span>Venue</span><strong>${escapeHtml(venue?.name || "No venue")}</strong></div>
      <div class="detail-line"><span>Map</span><strong>${venue?.mapLink ? `<a href="${escapeAttr(venue.mapLink)}" target="_blank" rel="noreferrer">Open link</a>` : "No map link"}</strong></div>
      <div class="detail-line"><span>Payment</span><strong>${event.paymentAmount ? `${escapeHtml(event.paymentCurrency)} ${escapeHtml(event.paymentAmount)} · ${escapeHtml(event.paymentStatus)}` : "No amount"}</strong></div>
      <div class="detail-line"><span>Notes</span><strong>${escapeHtml(event.notes || "No notes")}</strong></div>
    </div>
    <div>
      <p class="muted">Attachments</p>
      <div class="attachment-list">
        ${attachments.length ? attachments.map((file) => `<div class="attachment-pill">${escapeHtml(file.name)} <span class="muted">(${formatBytes(file.size)})</span></div>`).join("") : `<div class="detail-empty">No attachments.</div>`}
      </div>
    </div>`;
}

function renderNotifications() {
  if (!state.notifications.length) {
    els.notificationLog.innerHTML = `<p class="detail-empty">No notifications yet.</p>`;
    return;
  }
  els.notificationLog.innerHTML = state.notifications.slice(0, 8).map((item) => `
    <div class="notification-item">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.body)}</p>
      <p class="muted">${escapeHtml(item.kind)} · ${escapeHtml(new Date(item.createdAt).toLocaleString())}</p>
    </div>`).join("");
}

function renderSetlists() {
  const setlists = setlistsForActiveBand();
  const songs = songsForActiveBand();
  els.setlistSummary.textContent = `${setlists.length} setlist${setlists.length === 1 ? "" : "s"} · ${songs.length} song${songs.length === 1 ? "" : "s"}`;

  if (!setlists.length) {
    els.setlistList.innerHTML = `<p class="detail-empty">No setlists yet.</p>`;
  } else {
    els.setlistList.innerHTML = setlists.map((setlist) => {
      const count = setlistSongLinks(setlist.id).length;
      return `<button class="setlist-item ${setlist.id === selectedSetlistId ? "active" : ""}" type="button" data-setlist-id="${setlist.id}">
        <strong>${escapeHtml(setlist.name)}</strong>
        <span>${count} song${count === 1 ? "" : "s"}</span>
      </button>`;
    }).join("");
  }

  els.setlistList.querySelectorAll("[data-setlist-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedSetlistId = button.dataset.setlistId;
      selectedSongId = songsForSelectedSetlist()[0]?.id || null;
      renderSetlists();
    });
  });

  const selectedSetlist = state.setlists.find((setlist) => setlist.id === selectedSetlistId);
  els.selectedSetlistName.textContent = selectedSetlist ? selectedSetlist.name : "Songs";
  renderSetlistSongs();
  renderSongDetail();
}

function renderSetlistSongs() {
  const songs = songsForSelectedSetlist();
  if (!selectedSetlistId) {
    els.setlistSongs.innerHTML = `<p class="detail-empty">Create or select a setlist.</p>`;
    return;
  }
  if (!songs.length) {
    els.setlistSongs.innerHTML = `<p class="detail-empty">No songs in this setlist yet.</p>`;
    return;
  }
  els.setlistSongs.innerHTML = songs.map((song, index) => `
    <button class="song-row ${song.id === selectedSongId ? "active" : ""}" type="button" data-song-id="${song.id}">
      <span class="song-number">${index + 1}</span>
      <span>
        <strong>${escapeHtml(song.title)}</strong>
        <small>${escapeHtml([song.key, song.tempo].filter(Boolean).join(" · ") || "No key/tempo")}</small>
      </span>
    </button>
  `).join("");
  els.setlistSongs.querySelectorAll("[data-song-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedSongId = button.dataset.songId;
      renderSetlists();
    });
  });
}

function renderSongDetail() {
  const song = state.songs.find((item) => item.id === selectedSongId && item.bandId === state.activeBandId);
  if (!song) {
    els.songDetail.innerHTML = `<p class="detail-empty">Click a song to view lyrics.</p>`;
    els.editSongButton.disabled = true;
    return;
  }
  els.editSongButton.disabled = false;
  els.songDetail.innerHTML = `
    <div>
      <h3 class="detail-title">${escapeHtml(song.title)}</h3>
      <div class="tag-row">
        ${song.key ? `<span class="tag">${escapeHtml(song.key)}</span>` : ""}
        ${song.tempo ? `<span class="tag status">${escapeHtml(song.tempo)}</span>` : ""}
      </div>
    </div>
    ${song.attachmentName ? `<div class="attachment-pill">${escapeHtml(song.attachmentName)}</div>` : ""}
    <pre class="lyrics-text">${escapeHtml(song.lyrics || "No lyrics attached yet.")}</pre>
  `;
}

function renderPosters() {
  ensurePosterSelection();
  const posters = postersForActiveBand();
  els.posterSummary.textContent = `${posters.length} poster${posters.length === 1 ? "" : "s"} stored for ${activeBand()?.name || "this band"}`;

  if (!posters.length) {
    els.posterBoard.innerHTML = `<div class="panel"><p class="detail-empty">No posters yet. Add artwork for a gig or promo post.</p></div>`;
  } else {
    els.posterBoard.innerHTML = posters.map((poster) => {
      const linkedEvent = state.events.find((event) => event.id === poster.eventId);
      return `<button class="poster-card ${poster.id === selectedPosterId ? "active" : ""}" type="button" data-poster-id="${poster.id}">
        <div class="poster-art ${poster.status}">
          <span>${escapeHtml(poster.title.split(" ").slice(0, 3).join(" "))}</span>
        </div>
        <div class="poster-card-body">
          <strong>${escapeHtml(poster.title)}</strong>
          <span>${escapeHtml(linkedEvent?.title || "No linked event")}</span>
          <div class="tag-row">
            <span class="tag status">${escapeHtml(poster.status)}</span>
            ${poster.fileName ? `<span class="tag">${escapeHtml(fileExtension(poster.fileName))}</span>` : ""}
          </div>
        </div>
      </button>`;
    }).join("");
  }

  els.posterBoard.querySelectorAll("[data-poster-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedPosterId = button.dataset.posterId;
      renderPosters();
    });
  });

  renderPosterDetail();
}

function renderPosterDetail() {
  const poster = state.posters.find((item) => item.id === selectedPosterId && item.bandId === state.activeBandId);
  if (!poster) {
    els.posterDetail.innerHTML = `<p class="detail-empty">Select a poster or create a new one.</p>`;
    els.editPosterButton.disabled = true;
    return;
  }
  els.editPosterButton.disabled = false;
  const linkedEvent = state.events.find((event) => event.id === poster.eventId);
  els.posterDetail.innerHTML = `
    <div class="poster-preview ${poster.status}">
      <span>${escapeHtml(poster.title)}</span>
    </div>
    <div>
      <h3 class="detail-title">${escapeHtml(poster.title)}</h3>
      <div class="tag-row">
        <span class="tag status">${escapeHtml(poster.status)}</span>
        ${poster.fileName ? `<span class="tag">${escapeHtml(poster.fileName)}</span>` : ""}
      </div>
    </div>
    <div class="detail-list">
      <div class="detail-line"><span>Event</span><strong>${escapeHtml(linkedEvent?.title || "No linked event")}</strong></div>
      <div class="detail-line"><span>Owner</span><strong>${escapeHtml(poster.owner || "Unassigned")}</strong></div>
      <div class="detail-line"><span>Notes</span><strong>${escapeHtml(poster.notes || "No notes")}</strong></div>
    </div>
  `;
}

function openModal(element) {
  element.classList.remove("hidden");
}

function closeModal(element) {
  element.classList.add("hidden");
}

function openSetlistDialog() {
  els.setlistNameInput.value = "";
  openModal(els.setlistDialog);
}

function openSongDialog(songId = null) {
  const song = songId ? state.songs.find((item) => item.id === songId) : null;
  els.songDialogTitle.textContent = song ? "Edit song" : "Add song";
  els.songId.value = song?.id || "";
  els.songTitle.value = song?.title || "";
  els.songKey.value = song?.key || "";
  els.songTempo.value = song?.tempo || "";
  els.songAttachmentName.value = song?.attachmentName || "";
  els.songLyrics.value = song?.lyrics || "";
  openModal(els.songDialog);
}

function openAddSongToSetlistDialog() {
  if (!selectedSetlistId) {
    openSetlistDialog();
    return;
  }
  openSongDialog();
}

function openPosterDialog(posterId = null) {
  const poster = posterId ? state.posters.find((item) => item.id === posterId) : null;
  renderPosterEventOptions();
  els.posterDialogTitle.textContent = poster ? "Edit poster" : "New poster";
  els.posterId.value = poster?.id || "";
  els.posterTitle.value = poster?.title || "";
  els.posterStatus.value = poster?.status || "draft";
  els.posterEvent.value = poster?.eventId || "";
  els.posterOwner.value = poster?.owner || activeUser().name;
  els.posterFile.value = "";
  els.posterFileName.value = poster?.fileName || "";
  els.posterNotes.value = poster?.notes || "";
  openModal(els.posterDialog);
}

function renderPosterEventOptions() {
  const events = eventsForActiveBand();
  els.posterEvent.innerHTML = `<option value="">No linked event</option>${events.map((event) => `<option value="${event.id}">${escapeHtml(event.title)} · ${escapeHtml(formatDate(event.startsAt))}</option>`).join("")}`;
}

function openEventDialog(eventId = null) {
  const event = eventId ? state.events.find((item) => item.id === eventId) : null;
  renderVenueOptions();
  els.eventDialogTitle.textContent = event ? "Edit event" : "New event";
  els.eventId.value = event?.id || "";
  els.eventTitle.value = event?.title || "";
  els.eventType.value = event?.type || "gig";
  els.eventStart.value = event?.startsAt || defaultStart();
  els.eventEnd.value = event?.endsAt || defaultEnd();
  els.eventStatus.value = event?.status || "scheduled";
  els.eventLocation.value = event?.venueId || venuesForActiveBand()[0]?.id || "";
  els.newVenueName.value = "";
  els.paymentAmount.value = event?.paymentAmount || "";
  els.paymentCurrency.value = event?.paymentCurrency || "EUR";
  els.paymentStatus.value = event?.paymentStatus || "unknown";
  els.paymentNotes.value = event?.paymentNotes || "";
  els.eventNotes.value = event?.notes || "";
  els.eventAttachments.value = "";
  els.cancelEventButton.classList.toggle("hidden", !event);
  els.existingAttachments.innerHTML = event?.attachments?.length
    ? event.attachments.map((file) => `<div class="attachment-pill">${escapeHtml(file.name)} <span class="muted">(${formatBytes(file.size)})</span></div>`).join("")
    : `<p class="detail-empty">No files attached yet.</p>`;
  openModal(els.eventDialog);
}

function renderVenueOptions() {
  const options = venuesForActiveBand().map((venue) => `<option value="${venue.id}">${escapeHtml(venue.name)}</option>`).join("");
  els.eventLocation.innerHTML = options || `<option value="">No venues yet</option>`;
}

async function saveEventFromForm() {
  const active = activeBand();
  if (!active) return;
  let venueId = els.eventLocation.value;
  const newVenueName = els.newVenueName.value.trim();
  if (newVenueName) {
    const venue = {
      id: createId("v"),
      bandId: active.id,
      name: newVenueName,
      address: "",
      mapLink: ""
    };
    state.venues.push(venue);
    venueId = venue.id;
  }

  const existing = state.events.find((event) => event.id === els.eventId.value);
  const uploaded = Array.from(els.eventAttachments.files || []).map((file) => ({
    id: createId("a"),
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    uploadedByUserId: state.activeUserId
  }));

  const payload = {
    id: existing?.id || createId("e"),
    bandId: active.id,
    title: els.eventTitle.value.trim(),
    type: els.eventType.value,
    status: els.eventStatus.value,
    startsAt: els.eventStart.value,
    endsAt: els.eventEnd.value,
    venueId,
    paymentAmount: els.paymentAmount.value,
    paymentCurrency: els.paymentCurrency.value || "EUR",
    paymentStatus: els.paymentStatus.value,
    paymentNotes: els.paymentNotes.value,
    notes: els.eventNotes.value,
    attachments: [...(existing?.attachments || []), ...uploaded],
    createdByUserId: existing?.createdByUserId || state.activeUserId,
    updatedByUserId: state.activeUserId,
    updatedAt: new Date().toISOString()
  };

  if (isCloudMode()) {
    const body = JSON.stringify(toCloudEventPayload(payload, venueId));
    const saved = existing
      ? await apiRequest(`/bands/${active.id}/events/${existing.id}`, { method: "PATCH", body })
      : await apiRequest(`/bands/${active.id}/events`, { method: "POST", body });
    await loadCloudEventsForActiveBand();
    selectedEventId = saved.event_id;
    addNotification(existing ? "Event changed" : "Event created", `${payload.title} saved in ${active.name}.`, "email + push");
    closeModal(els.eventDialog);
    render();
    return;
  }

  if (existing) {
    state.events = state.events.map((event) => event.id === existing.id ? payload : event);
    addNotification("Event changed", `${payload.title} updated in ${active.name}.`, "email + push");
  } else {
    state.events.push(payload);
    addNotification("Event created", `${payload.title} added to ${active.name}.`, "email + push");
  }
  selectedEventId = payload.id;
  closeModal(els.eventDialog);
  saveAndRender();
}

async function cancelCurrentEvent() {
  const event = state.events.find((item) => item.id === els.eventId.value);
  if (!event) return;
  if (isCloudMode()) {
    await apiRequest(`/bands/${state.activeBandId}/events/${event.id}/cancel`, { method: "POST", body: "{}" });
    await loadCloudEventsForActiveBand();
    addNotification("Event cancelled", `${event.title} cancelled in ${activeBand().name}.`, "email + push");
    closeModal(els.eventDialog);
    render();
    return;
  }
  event.status = "cancelled";
  event.updatedByUserId = state.activeUserId;
  event.updatedAt = new Date().toISOString();
  addNotification("Event cancelled", `${event.title} cancelled in ${activeBand().name}.`, "email + push");
  closeModal(els.eventDialog);
  saveAndRender();
}

async function createBand(name) {
  if (!name) return;
  if (isCloudMode()) {
    const band = await apiRequest("/bands", {
      method: "POST",
      body: JSON.stringify({ name, default_currency: "EUR", timezone: "Europe/Dublin" })
    });
    await loadCloudWorkspace();
    state.activeBandId = band.band_id;
    await loadCloudEventsForActiveBand();
    selectedSetlistId = null;
    selectedSongId = null;
    addNotification("Band created", `${name} is ready for events.`, "system");
    render();
    return;
  }
  const band = { id: createId("b"), name, createdByUserId: state.activeUserId, defaultCurrency: "EUR" };
  state.bands.push(band);
  state.memberships.push({ bandId: band.id, userId: state.activeUserId, role: "owner" });
  state.activeBandId = band.id;
  selectedSetlistId = null;
  selectedSongId = null;
  addNotification("Band created", `${name} is ready for events.`, "system");
  saveAndRender();
}

function toCloudEventPayload(payload, venueId) {
  const venue = venueFor(venueId);
  return {
    title: payload.title,
    event_type: payload.type,
    status: payload.status,
    starts_at: toIsoFromDatetimeLocal(payload.startsAt),
    ends_at: toIsoFromDatetimeLocal(payload.endsAt),
    timezone: activeBand()?.timezone || "Europe/Dublin",
    venue_name: venue?.name || payload.venueName || "",
    venue_address: venue?.address || payload.venueAddress || "",
    payment_amount: payload.paymentAmount ? Number(payload.paymentAmount) : null,
    payment_currency: payload.paymentCurrency || "EUR",
    payment_status: payload.paymentStatus || "unknown",
    payment_notes: payload.paymentNotes || "",
    notes: payload.notes || ""
  };
}

function createSetlist(name) {
  if (!name) return;
  const setlist = {
    id: createId("sl"),
    bandId: state.activeBandId,
    name,
    createdByUserId: state.activeUserId
  };
  state.setlists.push(setlist);
  selectedSetlistId = setlist.id;
  selectedSongId = null;
  addNotification("Setlist created", `${name} added to ${activeBand().name}.`, "system");
  saveAndRender();
}

function saveSongFromForm() {
  const existing = state.songs.find((song) => song.id === els.songId.value);
  const payload = {
    id: existing?.id || createId("s"),
    bandId: state.activeBandId,
    title: els.songTitle.value.trim(),
    key: els.songKey.value.trim(),
    tempo: els.songTempo.value.trim(),
    attachmentName: els.songAttachmentName.value.trim(),
    lyrics: els.songLyrics.value
  };
  if (!payload.title) return;

  if (existing) {
    state.songs = state.songs.map((song) => song.id === existing.id ? payload : song);
    addNotification("Song updated", `${payload.title} lyrics updated.`, "system");
  } else {
    state.songs.push(payload);
    if (selectedSetlistId) {
      const nextOrder = setlistSongLinks(selectedSetlistId).length + 1;
      state.setlistSongs.push({ setlistId: selectedSetlistId, songId: payload.id, order: nextOrder });
    }
    addNotification("Song added", `${payload.title} added to ${activeBand().name}.`, "system");
  }

  selectedSongId = payload.id;
  closeModal(els.songDialog);
  saveAndRender();
}

function savePosterFromForm() {
  const existing = state.posters.find((poster) => poster.id === els.posterId.value);
  const payload = {
    id: existing?.id || createId("p"),
    bandId: state.activeBandId,
    title: els.posterTitle.value.trim(),
    eventId: els.posterEvent.value,
    status: els.posterStatus.value,
    owner: els.posterOwner.value.trim(),
    fileName: els.posterFileName.value.trim(),
    notes: els.posterNotes.value,
    createdByUserId: existing?.createdByUserId || state.activeUserId,
    updatedAt: new Date().toISOString()
  };
  if (!payload.title) return;

  if (existing) {
    state.posters = state.posters.map((poster) => poster.id === existing.id ? payload : poster);
    addNotification("Poster updated", `${payload.title} updated.`, "system");
  } else {
    state.posters.push(payload);
    addNotification("Poster added", `${payload.title} stored for ${activeBand().name}.`, "system");
  }

  selectedPosterId = payload.id;
  closeModal(els.posterDialog);
  saveAndRender();
}

function joinActiveBandAsSelectedUser() {
  const band = activeBand();
  if (!band) return;
  const existing = membershipFor(band.id, state.activeUserId);
  if (existing) {
    addNotification("Already joined", `${activeUser().name} is already in ${band.name}.`, "system");
  } else {
    state.memberships.push({ bandId: band.id, userId: state.activeUserId, role: "member" });
    addNotification("Member joined", `${activeUser().name} joined ${band.name} from a local link.`, "email + push");
  }
  saveAndRender();
}

function addNotification(title, body, kind) {
  state.notifications.unshift({
    id: createId("n"),
    title,
    body,
    kind,
    createdAt: new Date().toISOString()
  });
}

function activeUser() {
  if (isCloudMode()) return state.cloudUser || { id: state.activeUserId, name: authState?.email || "Cloud user", email: authState?.email || "" };
  return testUsers.find((user) => user.id === state.activeUserId) || testUsers[0];
}

function activeBand() {
  return state.bands.find((band) => band.id === state.activeBandId) || state.bands[0];
}

function activeMembership() {
  return membershipFor(state.activeBandId, state.activeUserId);
}

function membershipFor(bandId, userId) {
  return state.memberships.find((membership) => membership.bandId === bandId && membership.userId === userId);
}

function bandsForActiveUser() {
  return state.bands.filter((band) => membershipFor(band.id, state.activeUserId));
}

function eventsForActiveBand() {
  return state.events.filter((event) => event.bandId === state.activeBandId);
}

function postersForActiveBand() {
  return state.posters.filter((poster) => poster.bandId === state.activeBandId);
}

function songsForActiveBand() {
  return state.songs.filter((song) => song.bandId === state.activeBandId);
}

function setlistsForActiveBand() {
  return state.setlists.filter((setlist) => setlist.bandId === state.activeBandId);
}

function setlistSongLinks(setlistId) {
  return state.setlistSongs
    .filter((link) => link.setlistId === setlistId)
    .sort((a, b) => a.order - b.order);
}

function songsForSelectedSetlist() {
  return setlistSongLinks(selectedSetlistId)
    .map((link) => state.songs.find((song) => song.id === link.songId))
    .filter(Boolean);
}

function ensureSetlistSelection() {
  const setlists = setlistsForActiveBand();
  if (!setlists.find((setlist) => setlist.id === selectedSetlistId)) {
    selectedSetlistId = setlists[0]?.id || null;
  }
  const songs = songsForSelectedSetlist();
  if (!songs.find((song) => song.id === selectedSongId)) {
    selectedSongId = songs[0]?.id || null;
  }
}

function ensurePosterSelection() {
  const posters = postersForActiveBand();
  if (!posters.find((poster) => poster.id === selectedPosterId)) {
    selectedPosterId = posters[0]?.id || null;
  }
}

function fileExtension(fileName = "") {
  const extension = fileName.split(".").pop();
  return extension && extension !== fileName ? extension.toUpperCase() : "FILE";
}

function venuesForActiveBand() {
  return state.venues.filter((venue) => venue.bandId === state.activeBandId);
}

function venueFor(venueId) {
  return state.venues.find((venue) => venue.id === venueId);
}

function joinLinkDisplayForActiveBand() {
  const band = activeBand();
  if (!band) return "";
  return isCloudMode() ? "Click copy to create a fresh cloud join link." : `bandmanager.local/join/${band.id}`;
}

async function joinLinkForActiveBand() {
  const band = activeBand();
  if (!band) return "";
  if (!isCloudMode()) return `bandmanager.local/join/${band.id}`;
  const data = await apiRequest(`/bands/${band.id}/join-links`, {
    method: "POST",
    body: JSON.stringify({ default_role: "member" })
  });
  els.joinLink.textContent = data.join_url;
  return data.join_url;
}

function roleLabel(role) {
  return role === "owner" ? "Admin" : role.charAt(0).toUpperCase() + role.slice(1);
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(value) {
  return new Date(value);
}

function formatDate(value) {
  return parseLocalDate(value).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function formatTime(value) {
  return parseLocalDate(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDateTimeRange(event) {
  return `${formatDate(event.startsAt)} ${formatTime(event.startsAt)}-${formatTime(event.endsAt)}`;
}

function defaultStart() {
  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), new Date().getDate(), 20, 0);
  return toDatetimeLocal(date);
}

function defaultEnd() {
  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), new Date().getDate(), 23, 0);
  return toDatetimeLocal(date);
}

function toDatetimeLocal(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function toIsoFromDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function formatBytes(bytes = 0) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function copyText(text) {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Local file and HTTP contexts can block clipboard; the notification still shows intent.
    }
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
