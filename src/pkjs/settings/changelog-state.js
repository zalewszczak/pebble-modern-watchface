// changelog-state.js -- remembers which version's release notes the user has opened (the "NEW!" button).
// Plain localStorage key on purpose: it is not a watch setting, so it is not platform-scoped.
var KEY = 'CHANGELOG_SEEN_VERSION';

function getSeen() {
  try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; }
}

function markSeen(version) {
  if (!version) return;
  try { localStorage.setItem(KEY, String(version)); } catch (e) { }
}

// Value handed to the settings page. A brand-new install has nothing "new" to announce, so it starts out
// up to date; an existing install without a record ('') gets only the newest version highlighted.
function seenForPage(latestVersion, freshInstall) {
  var seen = getSeen();
  if (!seen && freshInstall) {
    markSeen(latestVersion);
    return latestVersion;
  }
  return seen;
}

module.exports = { getSeen: getSeen, markSeen: markSeen, seenForPage: seenForPage };
