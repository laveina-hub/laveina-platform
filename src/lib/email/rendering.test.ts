import { describe, expect, it } from "vitest";

import { htmlToPlainText, wrapHtml } from "./rendering";

describe("htmlToPlainText", () => {
  it("turns <br/> into newlines", () => {
    expect(htmlToPlainText("A<br/>B<br/>C")).toBe("A\nB\nC");
  });

  it("turns <p>…</p> into paragraph breaks", () => {
    expect(htmlToPlainText("<p>First</p><p>Second</p>")).toBe("First\n\nSecond");
  });

  it("preserves anchor URLs as 'label (url)' so links survive in plaintext", () => {
    expect(htmlToPlainText('<a href="https://laveina.co/tracking/LAV-123">Track</a>')).toBe(
      "Track (https://laveina.co/tracking/LAV-123)"
    );
  });

  it("strips inline styling tags but keeps inner text", () => {
    expect(htmlToPlainText("<strong>Bold</strong> text")).toBe("Bold text");
  });

  it("renders <hr> as a horizontal divider", () => {
    expect(htmlToPlainText("Above<hr/>Below")).toContain("----------");
  });

  it("decodes the entities that escapeHtml emits", () => {
    expect(htmlToPlainText("&amp; &lt; &gt; &quot; &#39;")).toBe(`& < > " '`);
  });

  it("collapses runs of blank lines", () => {
    const html = "<p>A</p><br/><br/><br/><p>B</p>";
    expect(htmlToPlainText(html)).toBe("A\n\nB");
  });

  it("produces a readable plaintext from a full wrapped email", () => {
    const html = wrapHtml({
      greeting: "Hola Juan,",
      body: "Your shipment LAV-123 is confirmed.",
      signoff: "— Laveina",
      support: "Reply to this email if you have questions.",
    });
    const text = htmlToPlainText(html);
    expect(text).toContain("Hola Juan,");
    expect(text).toContain("Your shipment LAV-123 is confirmed.");
    expect(text).toContain("— Laveina");
    expect(text).toContain("Reply to this email");
    expect(text).not.toContain("<");
    expect(text).not.toContain(">");
  });
});
