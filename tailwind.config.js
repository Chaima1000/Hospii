module.exports = {
  content: [
    "./*.php",         // Scans all PHP files in root
    "./*.html",        // Scans HTML files in root
    "./js/*.js",       // Scans JS files
    "./dashboard.php", // Specific important files
    "./reports"        // If reports is a directory
  ],
  theme: {
    extend: {
      colors: {
        hospital: {
          blue: '#1e88e5',
          green: '#43a047',
          red: '#e53935'
        }
      }
    },
  },
  plugins: [],
}
