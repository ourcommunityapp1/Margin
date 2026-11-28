# ADR-0010: What the stores require

- **Status:** Accepted

| Requirement | What we build or do |
|---|---|
| **Account deletion inside the app** (Apple 5.1.1(v), also Google) | A "Delete my account" screen in You. It calls a new website route that, with the service key, deletes the sign-in account and everything linked to it (family, progress, answers, events, profile). It asks for confirmation and states what goes. The same option is added to the website. |
| **Reviewer sign-in** | One reviewer account. The app also offers password sign-in for that one email address only (hidden behind the email field). The password goes in the review notes. Nothing else changes for anyone else. |
| **User-generated content** (Apple 1.2) | Already there: report, block, reserved usernames, a contact address. Add a short written process: who reads reports, and within how long. |
| **Privacy labels** | Must match the privacy page. Collected and linked to the user: email, name, user ID, product interaction, other user content (answers). Used for app functionality and analytics. Not used for tracking. |
| **Age rating** | Answer the questionnaire honestly: social features, usernames. Not in the Kids Category (children appear only inside a family, never searchable). |
| **Content rights** | The NASB is used by permission through the YouVersion Platform and fetched from our server. Keep the agreement handy; confirm the terms cover a phone app. Credit lines stay on the About screen. |
| **Export compliance** | HTTPS only: set the standard "no non-exempt encryption" flag. |
| **Store listings** | Name, subtitle, description, keywords, screenshots (current iPhone and Android sizes), support and privacy URLs. The AI drafts all of them; the owner approves. |
