# UX/UI Specs: Groups, Channels, Members, Moderation

## Information Architecture

Primary hierarchy:

`group > channels > messages > members > settings`

Desktop:

- Column 1: group list and admin entry.
- Column 2: channel list for selected group.
- Column 3: channel view with message list and composer.
- Members drawer opens from channel header.

Tablet:

- Split pane: groups/channels combined on the left, channel view on the right.
- Members/settings open as modal drawer.

Mobile:

- Single pane.
- Group list, channel list, channel view, members, and settings are separate navigation states.

## Screen Specs

Group List:

- Empty: show create-group action for active users.
- Loading: skeleton rows with stable row height.
- Error: retry action.
- Deactivated/banned: replace list with account status state.

Channel List:

- Empty: show create-channel action for group owner/admin.
- Readonly channels show readonly badge.
- Channels hidden when membership is missing or state is `LEFT`.

Channel View:

- Empty: message list empty state.
- Loading: skeleton message rows.
- Error: retry load messages.
- Readonly: composer disabled for member/guest/readonly roles.
- Deactivated/banned: composer disabled and channel access removed after event.

Members Drawer:

- Shows username, role badge, deactivated badge, banned badge, readonly badge.
- Add/remove/change-role controls are hidden or disabled based on server-derived permissions.

Admin Users Screen:

- Shows status, deactivated time, global/channel ban actions.
- Deactivate and ban dialogs require confirmation and reason.

## Design Tokens

Typography:

- Base font: system UI.
- Body: 14-16 px.
- Compact table text: 13-14 px.
- Headings inside panels: 16-20 px.

Spacing:

- Base unit: 4 px.
- Dense controls: 8 px gap.
- Panel padding: 16 px.
- Page gutter: 24 px desktop, 16 px tablet, 12 px mobile.

Focus:

- Focus ring: 2 px solid high-contrast accent.
- Ring offset: 2 px.
- Never rely on color alone.

Status colors:

- Active: green with contrast ratio at least 4.5:1.
- Readonly: neutral blue-gray with text label.
- Deactivated: amber.
- Banned/destructive: red.
- Guest: neutral gray.

Motion:

- Respect `prefers-reduced-motion`.
- New-message highlight should be disabled or shortened in reduced-motion mode.

Accessibility:

- Keyboard navigation through lists and drawers.
- Focus trap in modals.
- `aria-label` for icon-only buttons.
- Live region for new messages.
- Dialogs must restore focus to the invoking control.
