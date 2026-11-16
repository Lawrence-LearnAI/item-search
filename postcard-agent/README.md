# Postcard discovery agent

Cloud worker for the existing item-search project, running as a Google Apps Script bound to the review spreadsheet. No Vercel configuration, paid server or Google service-account key is needed. OpenAI API use is separately billed; a ChatGPT subscription is not an API balance.

## Install

1. Open the review spreadsheet. Choose Extensions > Apps Script.
2. Replace Code.gs with PostcardAgent.gs and save. Use the spreadsheet-bound project, not a standalone project.
3. Reload the spreadsheet. A Postcard agent menu appears.
4. Choose Connect search API key. Enter the API key directly in the Google dialog, never in chat or a worksheet cell. The key goes to user properties. Sheet editors can edit script code, so only trusted people should have edit access.
5. Run one search. Google will request permission for this spreadsheet, external requests, and trigger management. Review and authorize it yourself. The script sends catalogue topics and up to 300 prior design identities/decisions to OpenAI. It does not send your free-text review notes or account credentials to the model.
6. Check pending search after a few minutes, or let the temporary 5-minute poller collect it. The Search log and Rules tab show actual completion or failure.
7. After a successful manual test, choose Enable searches every 4 hours. Pause searches removes both triggers. A pending API job is retained and can be collected manually.

## How it works

Six topic/market priority groups rotate. Every run searches the worldwide open web, including independent dealers and auction houses beyond those groups. There is no domain allowlist. The groups guide attention rather than limit coverage. At six starts per day, each topic and priority group is visited about daily; all 36 pairings take about six days. Three topics search for unfamiliar designs, and three target specific subjects or publishers. Each request allows at most eight tool calls and 6,000 output tokens. These limits are not a monetary spending cap. Configure API billing limits/alerts in the provider dashboard before enabling recurring use.

Google's background triggers run approximately, not at guaranteed exact times. Search access, marketplace login walls and indexing affect coverage. The agent uses the OpenAI Responses API with live web search, background jobs and a strict result schema. The default model is gpt-5-mini; set user property PC_MODEL to another compatible model if needed. Live compatibility and costs must be tested with an authorized API account before activation. If processing fails repeatedly, use Discard a failed/pending search before starting a replacement.

An empty sheet does not establish no matches. Search log distinguishes pending, failed, timed-out, blocked and completed checks, and reports sources the model actually checked. Detailed API errors are redacted before logging. The last job ID is retained for the Show last search diagnostic menu action. Retrieved individual listing URLs are required before a candidate is accepted; availability and historical interpretation still involve model judgment. Never automatically purchase.

## Review and duplicates

- Unsuitable suppresses a design, including later offers with the same design identity.
- Bad condition rejects a physical copy and allows another copy of the design to be considered.
- One physical listing is recognized across tracking links. eBay item IDs are recognized across regional domains.
- New offers of a previously shown design are suppressed unless every prior copy was marked Bad condition. Do not delete old rows.
- Design ID is an editable caption/publisher/number/composition signature. The agent proposes it, so identity is not infallible. A spelling or composition difference can evade matching. Correct the Design ID to the same value for duplicates; the next run respects it. Image recognition across relisted and cross-listed copies is not implemented. Matching factual copyEvidence helps, but cannot guarantee no duplicates.
- Your review fields and notes on existing rows are never rewritten. Sort whole rows, not individual columns. Keep the original header order.
- First found/Last checked represent the initial accepted finding. Existing rows are not revalidated automatically in this first version, so Last checked is not a promise of continuing availability.

## Limits of this first version

This is a research worker, not a complete marketplace crawler. Search evidence is available only for pages the provider can access. It cannot guarantee a new card on every run, independent visual authenticity, or full access to every seller. There is no email delivery in this version; Google Sheets is the review destination. No recurring job has been installed or enabled merely by saving the source.

## Validation

Run `node --test postcard-agent.test.mjs` in this directory. Tests cover repeated eBay links, condition-specific rejection, variant retention, missing sources, formula-injection handling, error redaction and preservation of review fields. Google runtime and live API integration still require the manual test above.

References:
- https://developers.google.com/apps-script/guides/services/authorization
- https://developers.google.com/apps-script/reference/script/clock-trigger-builder
- https://developers.google.com/apps-script/reference/properties/properties-service
- https://developers.openai.com/api/docs/guides/tools-web-search
- https://developers.openai.com/api/docs/guides/structured-outputs
