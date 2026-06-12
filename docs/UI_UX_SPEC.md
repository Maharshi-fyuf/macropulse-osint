```markdown
# UI/UX Design Specification
**Design Language:** High-density financial terminal aesthetic. Ultra-clean layouts, strong visual hierarchy, zero heavy decorations, maximize screen real estate for information.

## 1. Color System (Dark-Mode Centric)
* **Background Canvas:** Deep charcoal/matte black for low eye strain.
* **Cards/Surfaces:** Slightly lighter slate/gray variants to separate content layers visually.
* **Typography:** Clear white for headers, muted gray for secondary descriptions/metadata.
* **Status Indicators:**
    * *High Risk (Severity 8-10):* Vibrant crimson red.
    * *Moderate Risk (Severity 5-7):* Warning amber yellow.
    * *Low Risk (Severity 1-4):* Calm information blue.

## 2. Component Design Specifications

### Mobile Feed Card
* **Header Row:** Source badge (left), Time elapsed (right), Numeric severity badge (right, colored by risk level).
* **Main Body:** Bold headline text (16px), followed by a light border separating the 2-sentence AI rationale summary.
* **Footer Matrix:** Two distinct columns labeled `▲ Bullish` and `▼ Bearish` listing impacted assets inside rounded capsule badges for instant scannability.
Force True Dark Mode: Traders often look at screens early in the morning. Tell the IDE: "Hardcode the background to #0D0D0D and cards to #1A1A1A. Do not rely on the user's system preferences."

Horizontal Overflow for Filters: The category filters at the top (Energy, Metals, Forex) should use overflow-x-auto whitespace-nowrap in Tailwind.

No Pagination, Just Infinite Scroll or Pull-to-Refresh: Clicking "Next Page" is terrible UX on a phone. Tell the IDE to load the 20 most recent events, and implement a standard mobile "Pull down to refresh" to fetch new database entries.