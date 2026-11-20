// Applies the saved/OS colour theme before first paint so there is no flash of
// the wrong theme. Lives in its own file (not inline in index.html) so the
// site's Content-Security-Policy can forbid inline scripts entirely.
;(function () {
  try {
    var stored = localStorage.getItem('nm-theme')
    var theme =
      stored === 'light' || stored === 'dark'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
    var root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    root.style.colorScheme = theme
  } catch (e) {}
})()
