Tested by `tests/browser/local-review-check.js` (headless Chrome on Linux, 390px wide), opening each page as `file://…/index.html`. No piece uses ES modules; all scripts are classic `defer` scripts with relative paths.

| Page | Opens over file:// in Chrome? |
|---|---|
| Hub (mill/index.html) | Yes: the hub renders and lists the pieces. |
| Before You Go | Yes: the app starts, no console errors, fonts load. |
| One Less Trip | Yes: the app starts, no console errors, fonts load. |
| One Small Ask | Yes: the app starts, no console errors, fonts load. |
| Split the Sack | Yes: the app starts, no console errors, fonts load. |

Not tested over file://: Safari, Firefox and phones. A link made on a file:// page starts with `file://`, so it only opens on the same computer, and moving between pieces from the hub may open a folder listing instead of the page. The local server is the reliable way to review.
