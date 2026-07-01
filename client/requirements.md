## Packages
framer-motion | For smooth animations of the financial flow visualization
lucide-react | Already in base, but emphasizing need for financial icons
clsx | For conditional class merging
tailwind-merge | For handling Tailwind class conflicts

## Notes
The application visualizes financial flows for Canadian CCPCs.
Visualizer needs to be responsive: stacked on mobile, 3-column on desktop.
Flow logic: Revenue -> Expenses -> Net Income -> Corp Tax (approx 12.2% ON small business) -> Retained Earnings -> Distribution.
Distribution -> Personal Tax (approx rates based on ON 2024 brackets) -> Net Cash.
