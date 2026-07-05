# Branch Protection

The `E2E / Net Worth E2E` GitHub Actions check should be required before merging into `main`.

Configure this in GitHub:

1. Open `Settings` -> `Branches`.
2. Add or edit the branch protection rule for `main`.
3. Enable `Require status checks to pass before merging`.
4. Select `E2E / Net Worth E2E`.
5. Keep `Require branches to be up to date before merging` enabled if you want the E2E run to reflect the latest `main`.
