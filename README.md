# Playwright UI Automation

This project uses [Playwright](https://playwright.dev/) to automate UI testing for a list of websites.

## Features

- Reads URLs from `urls.txt`
- Checks homepage title for each URL
- Tests the first 20 links on each page for reachability
- Handles common cookie consent popups
- Categorizes and logs results in `test-log.txt`

## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Add URLs to `urls.txt`:**
   ```
   https://example.com
   https://another-site.com
   ```

3. **Run the tests:**
   ```sh
   npx playwright test
   ```

4. **View results:**
   - Check `test-log.txt` for categorized results.

## Project Structure

- `playwright-ui-script.spec.js` – Main Playwright test script
- `urls.txt` – List of URLs to test (one per line)
- `test-log.txt` – Test results output
- `.gitignore` – Standard ignores for Node, Playwright, and logs

## Notes

- Tests run in serial mode for reliable logging.
- Only the first 20 links per page are checked for speed.
- All results are grouped by URL in the log file.

---

Feel free to fork or contribute!

*Created by [Ian Evolution](https://github.com/IanEvolution)*
