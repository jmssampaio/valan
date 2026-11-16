# App Store approval requirements

Written from memory of the App Store Review Guidelines. Check the current guidelines before each submission; the numbers in brackets are the guideline sections to look up.

## Accounts and sign-in
- If the app uses a third-party sign-in (Google, Facebook, etc.) for the user's main account, it must also offer an equivalent login service that limits data to name and email, lets the user hide their email, and does not track for advertising without consent. Sign in with Apple meets this. [4.8]
- Sign in with Apple: support "Hide My Email" relay addresses; the name is only sent on first sign-in, so store it then.
- Account deletion must be possible inside the app, easy to find, and must delete the data, not just deactivate. Revoke Sign in with Apple tokens on deletion. [5.1.1(v)]
- Do not require sign-in for features that do not need an account.

## Privacy
- Privacy policy URL in App Store Connect and reachable inside the app. [5.1.1]
- The App Privacy questionnaire must match what the app and every SDK actually collect.
- Include a privacy manifest and declare reasons for "required reason" APIs; keep third-party SDKs up to date so theirs are included.
- Permission prompts (camera, photos, notifications) have specific purpose strings and are requested in context, when the feature is first used. The app must still work if the user declines.
- Ask for tracking permission (ATT) only if the app tracks users across apps; otherwise do not include tracking SDKs.
- Collect the minimum data needed. [5.1.1]

## Payments and subscriptions
- Digital features and subscriptions are sold only through in-app purchase; no links or wording that steer users to pay elsewhere. [3.1.1]
- The paywall shows, clearly: plan name, duration, full price per period, that it renews automatically, and how to cancel. The billed amount is the most prominent price. Free-trial terms state what is charged afterwards. [3.1.2]
- "Restore purchases" is available. Links to Terms of Use (EULA) and Privacy Policy are on the paywall and in the App Store description.
- In-app purchase products are submitted for review together with the build.

## Completeness
- No crashes, dead buttons, placeholder text, test data or "coming soon" features. [2.1]
- The backend is live during review.
- Provide a working demo account in the review notes. If features depend on third-party accounts (e.g. connected marketplaces), the demo account must have them connected or the app must offer a demo mode, so the reviewer can exercise every feature.
- Review notes explain non-obvious features and any hardware or account needed.

## Metadata
- Screenshots show the real app in use. Description and keywords are accurate. [2.3]
- No mention of other platforms (e.g. Android) in metadata. [2.3.10]
- No prices in the app name, subtitle, screenshots or previews. [2.3.7]
- Support URL works. Age rating questionnaire answered truthfully.
- EU: declare trader status and provide the required contact details.

## Design and function
- The app offers real, lasting functionality and feels native: standard navigation, safe areas, system text sizes. [4.0, 4.2]
- If iPad is supported, every screen must work on iPad and iPad screenshots are required. If not, disable tablet support in the app config.

## Third-party content and services
- Use other companies' names, logos and APIs only as their terms and brand guidelines allow; be ready to show authorisation. [5.2]
- Content pulled from third-party catalogues (e.g. cover images) must be permitted by that service's API terms.
- If users can see content created by other users inside the app, add reporting, blocking and moderation. [1.2]

## Notifications
- Push notifications are optional for the user and not used for marketing without explicit opt-in. [4.5.4]

## Technical
- Build with the Xcode and SDK versions Apple currently requires.
- Declare export compliance for encryption (standard HTTPS only is exempt; set the flag in the app config).
- Test on a real device, on the oldest supported iOS version, and with poor or no network.
