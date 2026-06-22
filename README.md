# BC VenWolf Adapter

Bondage Club -> VenWolf -> DG-Lab/Coyote feedback bridge.

This repository is the install entry for BC players. It includes:

- the Bondage Club userscript adapter
- a VenWolf Windows portable download link
- setup and test commands

```text
Bondage Club event -> userscript rule -> local VenWolf -> DG-Lab/Coyote output
```

## Quick Install

### 1. Install VenWolf

Download the Windows portable package:

[VenWolf-windows-portable.zip](https://github.com/QAQMOON/-BC-VenWolf-Adapter/releases/download/venwolf-bundle-2026-06-22/VenWolf-windows-portable.zip)

Then:

1. Extract the zip.
2. Double-click `start.bat`.
3. Open `http://127.0.0.1:8920`.
4. Connect your Coyote/DG-Lab device in VenWolf.

If Windows Firewall asks for permission, allow local/private network access.

### 2. Install The BC Userscript

Install Tampermonkey or Violentmonkey first, then click:

[Install bc-venwolf-adapter.user.js](https://github.com/QAQMOON/-BC-VenWolf-Adapter/raw/main/bc-venwolf-adapter.user.js)

GitHub Pages install page:

```text
https://qaqmoon.github.io/-BC-VenWolf-Adapter/
```

### 3. Test In Bondage Club

Open Bondage Club, enter a room, then type in the BC chat box:

```text
/vw status
/vw test 20 3000
```

If `/vw test` works, VenWolf and the adapter can talk to each other.

If `/vw test` works but BC actions do not trigger output, enable diagnostics:

```text
/vw debug on
/vw status
```

## What Each Part Does

This repository has two user-facing parts:

- **BC VenWolf Adapter**: the userscript installed in the browser. It listens to Bondage Club room events.
- **VenWolf**: the local control console. It receives adapter events and sends output to DG-Lab/Coyote.

Your friend should start VenWolf before using the BC adapter.

## VenWolf Setup

For the default `clientId=all` broadcast mode, VenWolf needs broadcast enabled.

In VenWolf config:

```yaml
host: "0.0.0.0"
port: 8920
allowBroadcastToClients: true
```

The bundled Windows package already includes the current VenWolf UI and local server files. If you want to maintain VenWolf source code, use:

[QAQMOON/VenWolf](https://github.com/QAQMOON/VenWolf)

Friends who only want to play do not need to read that source repository.

## Commands

```text
/vw status
/vw help
/vw on
/vw off
/vw url http://127.0.0.1:8920
/vw client all
/vw client <clientId>
/vw max <1-200>
/vw duration <ms>
/vw maxduration <ms>
/vw cooldown <ms>
/vw pulse <pulseId>
/vw pulse clear
/vw override on|off
/vw onother on|off
/vw dry on|off
/vw debug on|off
/vw test [strength] [ms]
```

## Status Meaning

`/vw status` shows:

- `seen`: BC events captured by the adapter
- `sent`: events that matched rules and were sent to VenWolf
- `ok`: successful VenWolf API calls
- `failed`: failed VenWolf API calls
- `last`: last captured event summary

If `seen` increases but `sent` does not, the adapter captured the BC event but no rule matched.

If `seen` does not increase, the adapter did not capture that event yet and needs a new hook/detector.

## Event Coverage

Current event coverage is maintained in [`events/bc-event-catalog.json`](events/bc-event-catalog.json).

Imported from `QAQMOON/XToys-Config` so far:

- BC activity events, including `OnSelf` and `OnOther`
- Item equip/remove events
- Toy state events for vibration, inflation, and shock-like properties
- Portal Panties function activity events
- Custom text item events:
  - `LactationPump`
  - `NippleSuctionCups`
  - `PlateClamps`
  - `ButtPump`
- Local BC hooks:
  - `VibratorModePublish`
  - `ExtendedItemSetOption`
  - `InventoryWear`
  - `InventoryRemove`
  - `PropertyShockPublishAction`
- Auto-response inspired presets:
  - orgasm
  - hard spanking
  - deep kissing

## Maintaining Events

Use `events/` as the BC event maintenance area:

- [`events/README.md`](events/README.md) explains the workflow.
- [`events/bc-event-catalog.json`](events/bc-event-catalog.json) records known inputs, hooks, custom items, and rule presets.

The userscript is still a single installable file, so release changes must be mirrored in `bc-venwolf-adapter.user.js`.

Release checklist:

```text
node --check bc-venwolf-adapter.user.js
```

Then update both version fields:

- userscript metadata `@version`
- internal `const VERSION`

## Defaults

- VenWolf URL: `http://127.0.0.1:8920`
- Client ID: `all`
- Max fire strength: `60`
- Max duration: `30000ms`
- Cooldown: `900ms`
- Override repeated fire action: `true`

## Notes

This is a one-way bridge. It does not control BC characters from VenWolf.

The script uses `GM_xmlhttpRequest` so BC pages can call the local VenWolf server without browser CORS blocking.
