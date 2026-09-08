from pathlib import Path
from playwright.sync_api import sync_playwright, expect


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "docs" / "screenshots"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)


def run():
    errors = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        desktop = browser.new_page(viewport={"width": 1440, "height": 1000})
        desktop.on("console", lambda message: errors.append(f"console: {message.text}") if message.type == "error" else None)
        desktop.on("pageerror", lambda error: errors.append(f"page: {error}"))
        document_response = desktop.goto("http://localhost:4173")
        desktop.wait_for_load_state("networkidle")

        assert document_response is not None
        assert "frame-ancestors 'none'" in document_response.headers["content-security-policy"]
        expect(desktop.locator("h1")).to_contain_text("Claims deserve")
        expect(desktop.locator(".prototype-notice")).to_contain_text("Public research prototype")
        expect(desktop.get_by_role("link", name="Privacy").first).to_be_visible()
        expect(desktop.get_by_role("link", name="Terms").first).to_be_visible()
        expect(desktop.locator(".finding-card")).to_have_count(3)
        expect(desktop.locator(".risk-value")).to_contain_text("100")
        desktop.screenshot(path=str(SCREENSHOTS / "desktop-case-review.png"), full_page=True)

        rate_headers = desktop.evaluate("""async () => {
          const response = await fetch('/api/india/dataset');
          return {
            limit: response.headers.get('RateLimit-Limit'),
            remaining: response.headers.get('RateLimit-Remaining')
          };
        }""")
        assert rate_headers["limit"] == "30", rate_headers

        desktop.get_by_role("button", name="Responsible sample").click()
        desktop.get_by_role("button", name="Analyze claims").click()
        expect(desktop.locator(".finding-card")).to_have_count(2)
        expect(desktop.locator(".results-header h3")).to_contain_text("Aarohan Cashflow Labs")
        first_finding = desktop.locator(".finding-summary").first
        first_finding.click()
        expect(first_finding).to_have_attribute("aria-expanded", "true")
        expect(desktop.locator(".finding-details").first).to_be_visible()

        legal = browser.new_page(viewport={"width": 1100, "height": 850})
        legal.on("console", lambda message: errors.append(f"legal console: {message.text}") if message.type == "error" else None)
        legal.goto("http://localhost:4173/privacy.html")
        legal.wait_for_load_state("networkidle")
        expect(legal.locator("h1")).to_contain_text("Privacy")
        expect(legal.get_by_text("No sensitive information", exact=True)).to_be_visible()
        legal.goto("http://localhost:4173/terms.html")
        legal.wait_for_load_state("networkidle")
        expect(legal.locator("h1")).to_contain_text("Use with")
        expect(legal.get_by_text("Human review is mandatory", exact=True)).to_be_visible()
        legal.close()

        mobile = browser.new_page(viewport={"width": 390, "height": 844})
        mobile.on("console", lambda message: errors.append(f"mobile console: {message.text}") if message.type == "error" else None)
        mobile.on("pageerror", lambda error: errors.append(f"mobile page: {error}"))
        mobile.goto("http://localhost:4173")
        mobile.wait_for_load_state("networkidle")
        expect(mobile.locator(".finding-card")).to_have_count(3)
        dimensions = mobile.evaluate("({ width: document.documentElement.scrollWidth, viewport: window.innerWidth })")
        assert dimensions["width"] <= dimensions["viewport"], f"Horizontal overflow: {dimensions}"
        mobile.screenshot(path=str(SCREENSHOTS / "mobile-case-review.png"), full_page=True)

        browser.close()

    assert not errors, "Browser errors:\n" + "\n".join(errors)
    print("E2E passed: desktop, interaction, mobile layout, console and page errors")


if __name__ == "__main__":
    run()
