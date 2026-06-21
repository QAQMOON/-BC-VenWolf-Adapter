# BC VenWolf Adapter

Bondage Club -> VenWolf userscript bridge.

The adapter listens to Bondage Club room events, maps them to VenWolf fire actions,
and sends them to local VenWolf through the Game API.

```text
Bondage Club event -> userscript rule -> VenWolf API -> DG-Lab/Coyote output
```

## Install

1. Install Tampermonkey, Violentmonkey, or another userscript manager.
2. Install the production script:
   [bc-venwolf-adapter.user.js](https://github.com/QAQMOON/-BC-VenWolf-Adapter/raw/main/bc-venwolf-adapter.user.js)
3. Start VenWolf at `http://127.0.0.1:8920`.
4. Connect your Coyote/DG-Lab client in VenWolf.
5. Open Bondage Club and enter a room.

GitHub Pages install page:

```text
https://qaqmoon.github.io/-BC-VenWolf-Adapter/
```

## VenWolf Setup

For the default `clientId=all` broadcast mode, VenWolf needs broadcast enabled:

```yaml
host: "0.0.0.0"
port: 8920
allowBroadcastToClients: true
```

## Quick Test

In the BC chat box:

```text
/vw status
/vw test 20 3000
```

If `/vw test` works but BC actions do not trigger output, enable event diagnostics:

```text
/vw debug on
/vw status
```

`status` shows:

- `seen`: BC events captured by the adapter
- `sent`: events that matched rules and were sent to VenWolf
- `ok`: successful VenWolf API calls
- `failed`: failed VenWolf API calls
- `last`: last captured event summary

If `seen` increases but `sent` does not, add or tune rules. If `seen` does not
increase, add or tune an event hook/detector.

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
- [`events/bc-event-catalog.json`](events/bc-event-catalog.json) records known inputs,
  hooks, custom items, and rule presets.

The userscript is still a single installable file, so release changes must be mirrored
in `bc-venwolf-adapter.user.js`.

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

The script uses `GM_xmlhttpRequest` so BC pages can call the local VenWolf server
without browser CORS blocking.
