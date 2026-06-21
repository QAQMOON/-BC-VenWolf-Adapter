# BC Event Catalog

This folder is the maintenance map for Bondage Club events used by the VenWolf adapter.

The userscript is still a single installable file, so changes here must be copied into
`bc-venwolf-adapter.user.js` before release. Treat `bc-event-catalog.json` as the
human-readable source of truth when adding or tuning rules.

## Event Inputs

The adapter currently consumes these BC event paths:

- `ServerSocket.on("ChatRoomMessage")`
- `ChatRoomMessage` through BC Mod SDK when available
- `VibratorModePublish`
- `ExtendedItemSetOption`
- `InventoryWear`
- `InventoryRemove`
- `PropertyShockPublishAction`

## Ported From XToys-Config

The first import from `QAQMOON/XToys-Config` covers:

- Room activity messages, including self/other direction detection
- Item add/remove actions
- Toy state changes for vibration/inflation/shock-like properties
- Portal Panties function activity actions
- Custom text events for LactationPump, NippleSuctionCups, PlateClamps, ButtPump
- Local BC hooks for inventory, vibrator mode, extended item options, and shock publishing
- Auto-response inspired presets: orgasm, hard spanking, deep kissing

## Adding A Rule

1. Add or update the rule in `bc-event-catalog.json`.
2. Mirror the change in `ACTION_RULES`, `BODY_ZONE_SENS`, or custom event handlers in
   `bc-venwolf-adapter.user.js`.
3. Bump both userscript version fields.
4. Run:

```text
node --check bc-venwolf-adapter.user.js
```

5. Test in BC with:

```text
/vw debug on
/vw status
```

If `seen` increases but `sent` does not, the event was captured but no rule matched.
If `seen` does not increase, add or adjust an input hook/detector first.
